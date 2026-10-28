import express from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { executeDraw, generateCommitment, validateDrawConfig } from '../../modules/draw/algorithms';

export const drawRouter = express.Router();

// POST /api/v1/draw/sessions
drawRouter.post('/sessions', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      tournamentId: z.string(),
      name: z.string(),
      method: z.enum(['RANDOM', 'BALANCED', 'POT_BASED', 'SNAKE']),
      groupCount: z.number().int().min(2).max(8),
      teamIds: z.array(z.string()).min(2),
    });

    const data = schema.parse(req.body);
    
    const teams = await prisma.team.findMany({
      where: { id: { in: data.teamIds } },
      include: {
        tournaments: {
          where: { tournamentId: data.tournamentId },
          select: { pot: true },
        },
      },
    });

    const config = {
      teams: teams.map(t => ({
        id: t.id,
        name: t.name,
        pot: t.tournaments[0]?.pot,
      })),
      groupCount: data.groupCount,
      method: data.method as any,
    };

    const validation = validateDrawConfig(config);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const { commitHash, secret, commitData } = generateCommitment(config);

    const session = await prisma.drawSession.create({
      data: {
        tournamentId: data.tournamentId,
        name: data.name,
        method: data.method,
        groupCount: data.groupCount,
        status: 'PENDING',
        commitHash,
        commitData: commitData as any,
        createdById: req.user!.id,
        participants: {
          create: teams.map(t => ({
            teamId: t.id,
            pot: t.tournaments[0]?.pot,
          })),
        },
      },
      include: {
        participants: true,
      },
    });

    res.json({ session, secret });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/draw/sessions/:id/execute
drawRouter.post('/sessions/:id/execute', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { secret } = req.body;

    const session = await prisma.drawSession.findUnique({
      where: { id },
      include: {
        participants: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    if (session.status !== 'PENDING') {
      return res.status(400).json({ error: 'Sessão já foi executada' });
    }

    const teams = await prisma.team.findMany({
      where: {
        id: { in: session.participants.map(p => p.teamId) },
      },
    });

    const config = {
      teams: teams.map(t => ({
        id: t.id,
        name: t.name,
        pot: session.participants.find(p => p.teamId === t.id)?.pot,
      })),
      groupCount: session.groupCount,
      method: session.method as any,
      seed: secret,
    };

    const result = executeDraw(config);

    await prisma.$transaction(async (tx) => {
      await tx.drawSession.update({
        where: { id },
        data: {
          status: 'EXECUTING',
          executedAt: new Date(),
          revealSecret: secret,
        },
      });

      const results = result.revealOrder.map(r => ({
        sessionId: id,
        teamId: r.teamId,
        groupIndex: r.groupIndex,
        groupName: result.groups[r.groupIndex]!.name,
        position: r.position,
        revealOrder: r.revealOrder,
      }));

      await tx.drawResult.createMany({ data: results });
      
      await tx.drawSession.update({
        where: { id },
        data: { status: 'REVEALING' },
      });
    });

    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/draw/sessions/:id
drawRouter.get('/sessions/:id', async (req, res, next) => {
  try {
    const session = await prisma.drawSession.findUnique({
      where: { id: req.params.id },
      include: {
        tournament: true,
        participants: {
          include: { session: false },
        },
        results: {
          include: { team: true },
          orderBy: { revealOrder: 'asc' },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    res.json({ session });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/draw/sessions/:id/publish
drawRouter.post('/sessions/:id/publish', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await prisma.drawSession.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
      include: {
        results: {
          include: { team: true },
          orderBy: { groupIndex: 'asc', position: 'asc' },
        },
      },
    });

    // Criar grupos no torneio
    const groupsMap = new Map<number, string[]>();
    session.results.forEach(r => {
      if (!groupsMap.has(r.groupIndex)) {
        groupsMap.set(r.groupIndex, []);
      }
      groupsMap.get(r.groupIndex)!.push(r.teamId);
    });

    for (const [index, teamIds] of groupsMap.entries()) {
      const group = await prisma.tournamentGroup.create({
        data: {
          tournamentId: session.tournamentId,
          name: `Grupo ${String.fromCharCode(65 + index)}`,
          order: index,
        },
      });

      await prisma.groupMembership.createMany({
        data: teamIds.map((teamId, pos) => ({
          groupId: group.id,
          teamId,
          position: pos + 1,
        })),
      });
    }

    res.json({ success: true, session });
  } catch (error) {
    next(error);
  }
});

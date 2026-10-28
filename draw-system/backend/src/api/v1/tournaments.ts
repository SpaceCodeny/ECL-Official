import express from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';

export const tournamentsRouter = express.Router();

// GET /api/v1/tournaments
tournamentsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const tournaments = await prisma.tournament.findMany({
      include: {
        _count: {
          select: { teams: true, drawSessions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ tournaments });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/tournaments
tournamentsRouter.post('/', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(3),
      slug: z.string().regex(/^[a-z0-9-]+$/),
      game: z.string(),
      edition: z.string(),
      description: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const tournament = await prisma.tournament.create({
      data: {
        ...data,
        status: 'DRAFT',
        createdById: req.user!.id,
      },
    });

    res.json({ tournament });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/tournaments/:id
tournamentsRouter.get('/:id', async (req, res, next) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      include: {
        teams: {
          include: { team: true },
        },
        drawSessions: {
          orderBy: { createdAt: 'desc' },
        },
        groups: {
          include: {
            members: {
              include: { team: true },
            },
          },
        },
      },
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Campeonato não encontrado' });
    }

    res.json({ tournament });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/tournaments/:id/teams
tournamentsRouter.post('/:id/teams', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), async (req, res, next) => {
  try {
    const schema = z.object({
      teamId: z.string(),
      pot: z.number().int().optional(),
      seed: z.number().int().optional(),
    });

    const data = schema.parse(req.body);

    const tournamentTeam = await prisma.tournamentTeam.create({
      data: {
        tournamentId: req.params.id,
        ...data,
      },
    });

    res.json({ tournamentTeam });
  } catch (error) {
    next(error);
  }
});

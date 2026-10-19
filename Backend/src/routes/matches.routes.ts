import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { UserRole, MatchStatus, SeriesFormat } from "@prisma/client";
import { prisma } from "../database/prisma";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { AppError, getParam } from "../utils/app-error";

export const matchesRouter = Router();

const CreateMatchSchema = z.object({
  tournamentId: z.string().uuid(),
  stageId: z.string().uuid(),
  groupId: z.string().uuid().optional(),
  round: z.string().max(50).optional(),
  teamAId: z.string().uuid(),
  teamBId: z.string().uuid(),
  scheduledAt: z.string().datetime().optional(),
  seriesFormat: z.nativeEnum(SeriesFormat).default(SeriesFormat.BO3),
  streamUrl: z.string().url().optional(),
  notes: z.string().max(500).optional(),
});

const UpdateMatchSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  status: z.nativeEnum(MatchStatus).optional(),
  streamUrl: z.string().url().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
}).strict();

const MatchResultSchema = z.object({
  scoreA: z.number().int().min(0),
  scoreB: z.number().int().min(0),
  winnerTeamId: z.string().uuid(),
  maps: z.array(z.object({
    mapName: z.string(),
    order: z.number().int(),
    scoreA: z.number().int().min(0).optional(),
    scoreB: z.number().int().min(0).optional(),
    winnerId: z.string().uuid().optional(),
  })).optional(),
});

/**
 * @openapi
 * /api/v1/matches:
 *   get:
 *     tags:
 *       - Matches
 *     summary: Listar partidas
 *     parameters:
 *       - in: query
 *         name: tournamentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de partidas
 */
matchesRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, Number(req.query["page"]) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query["limit"]) || 20));
      const skip = (page - 1) * limit;
      const { tournamentId, teamId, status } = req.query;

      const where = {
        ...(tournamentId && { tournamentId: tournamentId as string }),
        ...(status && { status: status as MatchStatus }),
        ...(teamId && {
          OR: [
            { teamAId: teamId as string },
            { teamBId: teamId as string },
          ],
        }),
      };

      const [matches, total] = await Promise.all([
        prisma.match.findMany({
          where,
          skip,
          take: limit,
          orderBy: { scheduledAt: "asc" },
          include: {
            teamA: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
            teamB: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
            winner: { select: { id: true, name: true, slug: true } },
            stage: { select: { id: true, name: true } },
            group: { select: { id: true, name: true } },
          },
        }),
        prisma.match.count({ where }),
      ]);

      res.json({
        data: matches,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/matches/{id}:
 *   get:
 *     tags:
 *       - Matches
 *     summary: Detalhes de uma partida
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dados da partida
 *       404:
 *         description: Partida não encontrada
 */
matchesRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const match = await prisma.match.findUnique({
        where: { id: getParam(req.params, "id") },
        include: {
          teamA: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
          teamB: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
          winner: { select: { id: true, name: true, slug: true } },
          stage: { select: { id: true, name: true, type: true } },
          group: { select: { id: true, name: true } },
          maps: true,
          disputes: true,
        },
      });

      if (!match) throw AppError.notFound("Partida não encontrada");

      res.json(match);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/matches:
 *   post:
 *     tags:
 *       - Matches
 *     summary: Criar partida (admin/organizador/árbitro)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Partida criada
 */
matchesRouter.post(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER, UserRole.REFEREE),
  validate(CreateMatchSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as z.infer<typeof CreateMatchSchema>;

      if (data.teamAId === data.teamBId) {
        throw AppError.badRequest("Os dois times devem ser diferentes");
      }

      const match = await prisma.match.create({
        data: {
          ...data,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        },
        include: {
          teamA: { select: { id: true, name: true, slug: true } },
          teamB: { select: { id: true, name: true, slug: true } },
        },
      });

      res.status(201).json(match);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/matches/{id}:
 *   patch:
 *     tags:
 *       - Matches
 *     summary: Atualizar partida
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Partida atualizada
 */
matchesRouter.patch(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER, UserRole.REFEREE),
  validate(UpdateMatchSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const match = await prisma.match.findUnique({ where: { id: getParam(req.params, "id") } });
      if (!match) throw AppError.notFound("Partida não encontrada");

      const data = { ...req.body };
      if (data.scheduledAt) data.scheduledAt = new Date(data.scheduledAt);

      const updated = await prisma.match.update({
        where: { id: getParam(req.params, "id") },
        data,
        include: {
          teamA: { select: { id: true, name: true, slug: true } },
          teamB: { select: { id: true, name: true, slug: true } },
        },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/matches/{id}/result:
 *   post:
 *     tags:
 *       - Matches
 *     summary: Registrar resultado da partida
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scoreA
 *               - scoreB
 *               - winnerTeamId
 *             properties:
 *               scoreA:
 *                 type: integer
 *               scoreB:
 *                 type: integer
 *               winnerTeamId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Resultado registrado
 */
matchesRouter.post(
  "/:id/result",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.REFEREE),
  validate(MatchResultSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const match = await prisma.match.findUnique({ where: { id: getParam(req.params, "id") } });
      if (!match) throw AppError.notFound("Partida não encontrada");
      if (match.status === MatchStatus.COMPLETED) {
        throw AppError.badRequest("Partida já foi finalizada");
      }

      const { scoreA, scoreB, winnerTeamId, maps } = req.body as z.infer<typeof MatchResultSchema>;

      if (winnerTeamId !== match.teamAId && winnerTeamId !== match.teamBId) {
        throw AppError.badRequest("Vencedor deve ser um dos times da partida");
      }

      const updated = await prisma.$transaction(async (tx) => {
        const updated = await tx.match.update({
          where: { id: getParam(req.params, "id") },
          data: { scoreA, scoreB, winnerTeamId, status: MatchStatus.COMPLETED },
        });

        if (maps && maps.length > 0) {
          await tx.matchMap.deleteMany({ where: { matchId: getParam(req.params, "id") } });
          await tx.matchMap.createMany({
            data: maps.map((m) => ({ ...m, matchId: getParam(req.params, "id")!, played: true })),
          });
        }

        return updated;
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../database/prisma";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";
import type { Request, Response, NextFunction } from "express";

export const invitedRouter = Router();

/**
 * @swagger
 * /api/v1/tournaments/{tournamentId}/invited:
 *   post:
 *     summary: Adicionar equipe convidada a um torneio
 *     tags: [Invited Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tournamentId
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
 *               - teamId
 *               - bracketSlot
 *             properties:
 *               teamId:
 *                 type: string
 *               bracketSlot:
 *                 type: integer
 *               reservedOpponent:
 *                 type: string
 *     responses:
 *       201:
 *         description: Equipe convidada adicionada
 */
invitedRouter.post(
  "/:tournamentId/invited",
  authenticate,
  authorize("ADMINISTRATOR" as any),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paramsSchema = z.object({
        tournamentId: z.string(),
      });

      const bodySchema = z.object({
        teamId: z.string(),
        bracketSlot: z.number().int().min(1).max(4),
        reservedOpponent: z.string().optional(),
      });

      const { tournamentId } = paramsSchema.parse(req.params);
      const { teamId, bracketSlot, reservedOpponent } = bodySchema.parse(req.body);

      // Validar torneio existe
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          preset: true,
        },
      });

      if (!tournament) {
        return res.status(404).json({ message: "Torneio não encontrado" });
      }

      // Validar equipe existe
      const team = await prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) {
        return res.status(404).json({ message: "Equipe não encontrada" });
      }

      // Validar se já está convidada
      const existing = await prisma.invitedTeam.findFirst({
        where: {
          tournamentId,
          teamId,
        },
      });

      if (existing) {
        return res.status(400).json({ message: "Equipe já foi convidada para este torneio" });
      }

      // Validar limite de convidados se preset existir
      if (tournament.preset) {
        const config = tournament.preset.config as any;
        const invitedLimit = config?.phases?.invited?.slots || 0;

        const currentInvited = await prisma.invitedTeam.count({
          where: { tournamentId },
        });

        if (currentInvited >= invitedLimit) {
          return res.status(400).json({
            message: `Limite de equipes convidadas atingido (${invitedLimit})`,
          });
        }
      }

      // Criar convite
      const invited = await prisma.invitedTeam.create({
        data: {
          tournamentId,
          teamId,
          bracketSlot,
          reservedOpponent: reservedOpponent || null,
        },
        include: {
          team: {
            include: {
              memberships: {
                where: { leftAt: null },
                include: {
                  player: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      res.status(201).json(invited);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/tournaments/{tournamentId}/invited:
 *   get:
 *     summary: Listar equipes convidadas de um torneio
 *     tags: [Invited Teams]
 *     parameters:
 *       - in: path
 *         name: tournamentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de equipes convidadas
 */
invitedRouter.get(
  "/:tournamentId/invited",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paramsSchema = z.object({
        tournamentId: z.string(),
      });

      const { tournamentId } = paramsSchema.parse(req.params);

      const invitedTeams = await prisma.invitedTeam.findMany({
        where: { tournamentId },
        include: {
          team: {
            include: {
              memberships: {
                where: { leftAt: null },
                include: {
                  player: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      res.json(invitedTeams);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/tournaments/{tournamentId}/invited/{invitedId}:
 *   delete:
 *     summary: Remover equipe convidada
 *     tags: [Invited Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tournamentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: invitedId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Equipe convidada removida
 */
invitedRouter.delete(
  "/:tournamentId/invited/:invitedId",
  authenticate,
  authorize("ADMINISTRATOR" as any),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paramsSchema = z.object({
        tournamentId: z.string(),
        invitedId: z.string(),
      });

      const { tournamentId, invitedId } = paramsSchema.parse(req.params);

      const invited = await prisma.invitedTeam.findUnique({
        where: { id: invitedId },
      });

      if (!invited || invited.tournamentId !== tournamentId) {
        return res.status(404).json({ message: "Convite não encontrado" });
      }

      await prisma.invitedTeam.delete({
        where: { id: invitedId },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

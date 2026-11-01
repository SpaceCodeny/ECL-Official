import { Router } from "express";
import { z } from "zod";
import { prisma } from "../database/prisma";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";
import { generateBracket } from "../services/bracket-generator.service";
import type { Request, Response, NextFunction } from "express";

export const bracketRouter = Router();

/**
 * @swagger
 * /api/v1/tournaments/{tournamentId}/bracket/generate:
 *   post:
 *     summary: Gerar bracket de playoffs a partir das fases anteriores
 *     tags: [Brackets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tournamentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Bracket gerado com sucesso
 */
bracketRouter.post(
  "/:tournamentId/bracket/generate",
  authenticate,
  authorize("ADMINISTRATOR" as any),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paramsSchema = z.object({
        tournamentId: z.string(),
      });

      const { tournamentId } = paramsSchema.parse(req.params);

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

      if (!tournament.preset) {
        return res.status(400).json({
          message: "Torneio não possui preset configurado",
        });
      }

      // Verificar se bracket já foi gerado
      const existingBracketMatches = await prisma.match.count({
        where: {
          tournamentId,
          bracketPosition: { not: null },
        },
      });

      if (existingBracketMatches > 0) {
        return res.status(400).json({
          message: "Bracket já foi gerado para este torneio",
        });
      }

      // Buscar rodadas Swiss finalizadas
      const swissRounds = await prisma.swissRound.findMany({
        where: {
          tournamentId,
          isComplete: true,
        },
        include: {
          matches: {
            include: {
              teamA: true,
              teamB: true,
              winner: true,
            },
          },
        },
        orderBy: {
          roundNumber: "asc",
        },
      });

      // Buscar campanhas dos times
      const swissCampaigns = await prisma.swissCampaign.findMany({
        where: {
          tournamentId,
        },
        include: {
          team: true,
        },
        orderBy: [
          { wins: "desc" },
          { losses: "asc" },
          { roundDiff: "desc" },
        ],
      });

      if (swissRounds.length === 0) {
        return res.status(400).json({
          message: "Fase Swiss não foi finalizada",
        });
      }

      // Buscar equipes convidadas
      const invitedTeams = await prisma.invitedTeam.findMany({
        where: { tournamentId },
        include: {
          team: true,
        },
      });

      // Gerar bracket
      const bracketMatches = await generateBracket(
        tournamentId,
        swissCampaigns,
        invitedTeams,
        tournament.preset
      );

      res.status(201).json({
        message: "Bracket gerado com sucesso",
        matchesCreated: bracketMatches.length,
        matches: bracketMatches,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/tournaments/{tournamentId}/bracket:
 *   get:
 *     summary: Obter bracket de playoffs de um torneio
 *     tags: [Brackets]
 *     parameters:
 *       - in: path
 *         name: tournamentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estrutura do bracket
 */
bracketRouter.get(
  "/:tournamentId/bracket",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paramsSchema = z.object({
        tournamentId: z.string(),
      });

      const { tournamentId } = paramsSchema.parse(req.params);

      // Buscar todas as partidas do bracket
      const matches = await prisma.match.findMany({
        where: {
          tournamentId,
          bracketPosition: { not: null },
        },
        include: {
          teamA: {
            include: {
              memberships: {
                where: { leftAt: null, role: "CAPTAIN" },
                take: 1,
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
          teamB: {
            include: {
              memberships: {
                where: { leftAt: null, role: "CAPTAIN" },
                take: 1,
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
          winner: true,
        },
        orderBy: {
          scheduledAt: "asc",
        },
      });

      if (matches.length === 0) {
        return res.status(404).json({
          message: "Bracket ainda não foi gerado para este torneio",
        });
      }

      // Organizar por rodada
      const bracket = {
        RO16: matches.filter((m) => m.bracketPosition?.startsWith("RO16-")),
        QF: matches.filter((m) => m.bracketPosition?.startsWith("QF-")),
        SF: matches.filter((m) => m.bracketPosition?.startsWith("SF-")),
        FINAL: matches.filter((m) => m.bracketPosition === "FINAL"),
      };

      res.json(bracket);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/tournaments/{tournamentId}/bracket/{matchId}/result:
 *   patch:
 *     summary: Registrar resultado de partida do bracket e avançar vencedor
 *     tags: [Brackets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tournamentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: matchId
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
 *               - winnerId
 *               - team1Score
 *               - team2Score
 *             properties:
 *               winnerId:
 *                 type: string
 *               team1Score:
 *                 type: integer
 *               team2Score:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Resultado registrado e vencedor avançado
 */
bracketRouter.patch(
  "/:tournamentId/bracket/:matchId/result",
  authenticate,
  authorize("ADMINISTRATOR" as any),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paramsSchema = z.object({
        tournamentId: z.string(),
        matchId: z.string(),
      });

      const bodySchema = z.object({
        winnerId: z.string(),
        team1Score: z.number().int().min(0),
        team2Score: z.number().int().min(0),
      });

      const { tournamentId, matchId } = paramsSchema.parse(req.params);
      const { winnerId, team1Score, team2Score } = bodySchema.parse(req.body);

      // Buscar partida
      const match = await prisma.match.findUnique({
        where: { id: matchId },
      });

      if (!match || match.tournamentId !== tournamentId) {
        return res.status(404).json({ message: "Partida não encontrada" });
      }

      if (!match.bracketPosition) {
        return res.status(400).json({
          message: "Esta partida não pertence ao bracket",
        });
      }

      if (match.status === "COMPLETED") {
        return res.status(400).json({
          message: "Partida já foi finalizada",
        });
      }

      // Validar vencedor
      if (winnerId !== match.teamAId && winnerId !== match.teamBId) {
        return res.status(400).json({
          message: "Vencedor deve ser uma das equipes da partida",
        });
      }

      // Atualizar partida
      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: {
          status: "COMPLETED",
          winnerTeamId: winnerId,
          scoreA: team1Score,
          scoreB: team2Score,
        },
      });

      // Determinar próxima fase
      const position = match.bracketPosition || "";
      let nextPosition: string | null = null;

      if (position.startsWith("RO16-")) {
        // RO16-1 → QF-1, RO16-2 → QF-1, RO16-3 → QF-2, etc.
        const parts = position.split("-");
        if (parts[1]) {
          const matchNum = parseInt(parts[1]);
          const qfNum = Math.ceil(matchNum / 2);
          nextPosition = `QF-${qfNum}`;
        }
      } else if (position.startsWith("QF-")) {
        // QF-1 → SF-1, QF-2 → SF-1, QF-3 → SF-2, etc.
        const parts = position.split("-");
        if (parts[1]) {
          const matchNum = parseInt(parts[1]);
          const sfNum = Math.ceil(matchNum / 2);
          nextPosition = `SF-${sfNum}`;
        }
      } else if (position.startsWith("SF-")) {
        // SF-1 → FINAL, SF-2 → FINAL
        nextPosition = "FINAL";
      }

      // Avançar vencedor se houver próxima fase
      if (nextPosition) {
        const nextMatch = await prisma.match.findFirst({
          where: {
            tournamentId,
            bracketPosition: nextPosition,
          },
        });

        if (nextMatch) {
          // Determinar slot (team1 ou team2)
          const slotIsTeam1 = position.endsWith("-1") || position.endsWith("-3");

          await prisma.match.update({
            where: { id: nextMatch.id },
            data: slotIsTeam1
              ? { teamAId: winnerId }
              : { teamBId: winnerId },
          });
        }
      }

      res.json({
        message: "Resultado registrado com sucesso",
        match: updatedMatch,
        advancedTo: nextPosition,
      });
    } catch (error) {
      next(error);
    }
  }
);

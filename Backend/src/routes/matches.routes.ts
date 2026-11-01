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

      // Suporte para múltiplos status separados por vírgula
      const statusArray = status 
        ? (status as string).split(',').map(s => s.trim()).filter(Boolean)
        : undefined;

      const where = {
        ...(tournamentId && { tournamentId: tournamentId as string }),
        ...(statusArray && statusArray.length > 0 && { 
          status: statusArray.length === 1 ? statusArray[0] as MatchStatus : { in: statusArray as MatchStatus[] }
        }),
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
          // Ordenação: partidas sem data agendada vêm primeiro (pendentes de agendamento),
          // depois por data crescente, e null por último
          orderBy: [
            { scheduledAt: "asc" }, // null vem primeiro no PostgreSQL com ASC NULLS FIRST
            { createdAt: "desc" }, // Empate: mais recentes primeiro
          ],
          include: {
            teamA: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
            teamB: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
            winner: { select: { id: true, name: true, slug: true } },
            stage: { select: { id: true, name: true, type: true, order: true, tournament: { select: { id: true, name: true } } } },
            group: { select: { id: true, name: true } },
            swissRound: { select: { id: true, roundNumber: true } },
            maps: { select: { id: true, mapName: true, order: true, action: true, actionTeamId: true, scoreA: true, scoreB: true, played: true }, orderBy: { order: "asc" } },
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
          stage: {
            select: {
              id: true,
              name: true,
              type: true,
              tournament: { select: { id: true, name: true, slug: true } },
            },
          },
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

// ─── PATCH /matches/:id/score ────────────────────────────────────────────────
// Atualiza placar de uma partida AO VIVO sem finalizá-la.
matchesRouter.patch(
  "/:id/score",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.REFEREE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { scoreA, scoreB } = req.body as { scoreA: number; scoreB: number };

      const match = await prisma.match.findUnique({ where: { id: getParam(req.params, "id") } });
      if (!match) throw AppError.notFound("Partida não encontrada");
      if (match.status !== MatchStatus.LIVE && match.status !== MatchStatus.AWAITING_RESULT) {
        throw AppError.badRequest("Só é possível atualizar o placar de partidas AO VIVO");
      }
      if (typeof scoreA !== "number" || typeof scoreB !== "number" || scoreA < 0 || scoreB < 0) {
        throw AppError.badRequest("Placar inválido");
      }

      const updated = await prisma.match.update({
        where: { id: getParam(req.params, "id") },
        data: { scoreA, scoreB },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// ─── PATCH /matches/:id/maps/:mapId ─────────────────────────────────────────
// Atualiza rounds de um mapa específico (scoreA/scoreB, 0–13).
matchesRouter.patch(
  "/:id/maps/:mapId",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.REFEREE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matchId = getParam(req.params, "id");
      const mapId   = getParam(req.params, "mapId");
      const { scoreA, scoreB } = req.body as { scoreA: number; scoreB: number };

      if (typeof scoreA !== "number" || typeof scoreB !== "number" || scoreA < 0 || scoreB < 0 || scoreA > 13 || scoreB > 13) {
        throw AppError.badRequest("Placar de rounds inválido (0–13)");
      }
      if (scoreA !== 13 && scoreB !== 13) {
        throw AppError.badRequest("Um dos times deve ter 13 rounds para fechar o mapa");
      }

      const mapEntry = await prisma.matchMap.findUnique({ where: { id: mapId } });
      if (!mapEntry || mapEntry.matchId !== matchId) throw AppError.notFound("Mapa não encontrado");

      const match = await prisma.match.findUnique({ where: { id: matchId } });
      if (!match) throw AppError.notFound("Partida não encontrada");

      const winnerId = scoreA > scoreB ? match.teamAId : match.teamBId;

      const updated = await prisma.matchMap.update({
        where: { id: mapId },
        data: { scoreA, scoreB, winnerId, played: true },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// ─── PUT /matches/:id/maps ───────────────────────────────────────────────────
// Admin define o pool de mapas (picks, bans, deciders) de uma partida.
// Recebe um array de mapas e substitui todos os registros existentes.
matchesRouter.put(
  "/:id/maps",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.REFEREE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matchId = getParam(req.params, "id");
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teamA: { select: { id: true, name: true } },
          teamB: { select: { id: true, name: true } },
        },
      });
      if (!match) throw AppError.notFound("Partida não encontrada");

      const mapsInput = req.body as Array<{
        mapName: string;
        order: number;
        action?: "PICKED" | "BANNED" | "DECIDER";
        actionTeamId?: string;
        scoreA?: number;
        scoreB?: number;
        winnerId?: string;
        played?: boolean;
      }>;

      if (!Array.isArray(mapsInput)) {
        throw AppError.badRequest("Body deve ser um array de mapas");
      }

      // Valida que actionTeamId pertence a um dos dois times
      for (const m of mapsInput) {
        if (m.actionTeamId && m.actionTeamId !== match.teamAId && m.actionTeamId !== match.teamBId) {
          throw AppError.badRequest(`actionTeamId inválido para o mapa ${m.mapName}`);
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.matchMap.deleteMany({ where: { matchId } });
        if (mapsInput.length > 0) {
          await tx.matchMap.createMany({
            data: mapsInput.map((m) => ({
              matchId,
              mapName: m.mapName,
              order: m.order,
              action: m.action ?? null,
              actionTeamId: m.actionTeamId ?? null,
              scoreA: m.scoreA ?? null,
              scoreB: m.scoreB ?? null,
              winnerId: m.winnerId ?? null,
              played: m.played ?? false,
            })),
          });
        }
      });

      const updated = await prisma.match.findUnique({
        where: { id: matchId },
        include: { maps: { orderBy: { order: "asc" } } },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// ─── PATCH /matches/:id/status ───────────────────────────────────────────────
matchesRouter.patch(
  "/:id/status",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.REFEREE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body as { status: string };

      const allowed: Record<string, MatchStatus[]> = {
        LIVE: [MatchStatus.SCHEDULED, MatchStatus.READY],
        AWAITING_RESULT: [MatchStatus.LIVE],
        CANCELLED: [MatchStatus.SCHEDULED, MatchStatus.READY, MatchStatus.LIVE],
      };

      const match = await prisma.match.findUnique({ where: { id: getParam(req.params, "id") } });
      if (!match) throw AppError.notFound("Partida não encontrada");

      const valid = allowed[status];
      if (!valid) throw AppError.badRequest("Status inválido");
      if (!valid.includes(match.status)) {
        throw AppError.badRequest(`Não é possível mover de ${match.status} para ${status}`);
      }

      const updated = await prisma.match.update({
        where: { id: getParam(req.params, "id") },
        data: {
          status: status as MatchStatus,
          // Ao iniciar ao vivo, zera o placar automaticamente
          ...(status === "LIVE" ? { scoreA: 0, scoreB: 0 } : {}),
        },
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
  validate(MatchResultSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const match = await prisma.match.findUnique({
        where: { id: getParam(req.params, "id") },
        include: {
          swissRound: true,
        },
      });
      
      if (!match) throw AppError.notFound("Partida não encontrada");
      if (match.status === MatchStatus.COMPLETED) {
        throw AppError.badRequest("Partida já foi finalizada");
      }

      // Proteção Swiss: verificar se algum dos times já foi classificado/eliminado
      // (não deveria acontecer, mas evita inconsistências em casos extremos)
      if (match.swissRoundId) {
        const [campA, campB] = await Promise.all([
          prisma.swissCampaign.findUnique({
            where: { tournamentId_teamId: { tournamentId: match.tournamentId, teamId: match.teamAId } },
          }),
          prisma.swissCampaign.findUnique({
            where: { tournamentId_teamId: { tournamentId: match.tournamentId, teamId: match.teamBId } },
          }),
        ]);
        if (campA && campA.wins >= 3) {
          throw AppError.badRequest(
            `Time já classificado não pode jogar partidas adicionais (${campA.wins} vitórias)`
          );
        }
        if (campA && campA.losses >= 3) {
          throw AppError.badRequest(
            `Time já eliminado não pode jogar partidas adicionais (${campA.losses} derrotas)`
          );
        }
        if (campB && campB.wins >= 3) {
          throw AppError.badRequest(
            `Time já classificado não pode jogar partidas adicionais (${campB.wins} vitórias)`
          );
        }
        if (campB && campB.losses >= 3) {
          throw AppError.badRequest(
            `Time já eliminado não pode jogar partidas adicionais (${campB.losses} derrotas)`
          );
        }
      }

      const { scoreA, scoreB, winnerTeamId, maps } = req.body as z.infer<typeof MatchResultSchema>;

      if (winnerTeamId !== match.teamAId && winnerTeamId !== match.teamBId) {
        throw AppError.badRequest("Vencedor deve ser um dos times da partida");
      }

      const updated = await prisma.$transaction(async (tx) => {
        // Atualiza a partida
        const updated = await tx.match.update({
          where: { id: getParam(req.params, "id") },
          data: { scoreA, scoreB, winnerTeamId, status: MatchStatus.COMPLETED },
        });

        // Se tem mapas, cria/atualiza
        if (maps && maps.length > 0) {
          await tx.matchMap.deleteMany({ where: { matchId: getParam(req.params, "id") } });
          await tx.matchMap.createMany({
            data: maps.map((m) => ({ ...m, matchId: getParam(req.params, "id")!, played: true })),
          });
        }

        // Se é partida da fase suíça, atualiza campanhas automaticamente
        // Partida Swiss: atualiza campanhas dentro da mesma transação (regra: 3W=classif, 3L=elim)
        if (match.swissRoundId) {
          const loserId = winnerTeamId === match.teamAId ? match.teamBId : match.teamAId;
          const diff = Math.abs((scoreA ?? 0) - (scoreB ?? 0));

          // Vencedor
          const winner = await tx.swissCampaign.findUnique({
            where: { tournamentId_teamId: { tournamentId: match.tournamentId, teamId: winnerTeamId } },
          });
          if (!winner) throw new Error(`Campanha do vencedor ${winnerTeamId} não encontrada`);

          const newWins = winner.wins + 1;
          await tx.swissCampaign.update({
            where: { tournamentId_teamId: { tournamentId: match.tournamentId, teamId: winnerTeamId } },
            data: {
              wins: newWins,
              roundsPlayed: winner.roundsPlayed + 1,
              roundDiff: winner.roundDiff + diff,
              opponentsIds: { push: loserId },
            },
          });

          if (newWins >= 3) {
            console.log(`[Swiss] ${winnerTeamId} CLASSIFICADO: ${newWins}-${winner.losses}`);
          }

          // Perdedor
          const loser = await tx.swissCampaign.findUnique({
            where: { tournamentId_teamId: { tournamentId: match.tournamentId, teamId: loserId } },
          });
          if (!loser) throw new Error(`Campanha do perdedor ${loserId} não encontrada`);

          const newLosses = loser.losses + 1;
          await tx.swissCampaign.update({
            where: { tournamentId_teamId: { tournamentId: match.tournamentId, teamId: loserId } },
            data: {
              losses: newLosses,
              roundsPlayed: loser.roundsPlayed + 1,
              roundDiff: loser.roundDiff - diff,
              opponentsIds: { push: winnerTeamId },
              isEliminated: newLosses >= 3,
            },
          });

          if (newLosses >= 3) {
            console.log(`[Swiss] ${loserId} ELIMINADO: ${loser.wins}-${newLosses}`);
          }

          console.log(
            `[Swiss] ${match.id}: ${winnerTeamId} VENCEU (${newWins}-${winner.losses}) | ` +
            `${loserId} PERDEU (${loser.wins}-${newLosses})`
          );

          // ATUALIZAÇÃO AUTOMÁTICA: Recalcular posições de todos os classificados
          // Busca todos que atingiram 3+ vitórias e atualiza suas posições finais
          const allClassified = await tx.swissCampaign.findMany({
            where: {
              tournamentId: match.tournamentId,
              wins: { gte: 3 },
            },
            include: {
              team: { select: { id: true, name: true } },
            },
          });

          // Ordenar por critérios oficiais: wins (desc), roundDiff (desc), losses (asc)
          const sortedClassified = allClassified.sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (b.roundDiff !== a.roundDiff) return b.roundDiff - a.roundDiff;
            if (a.losses !== b.losses) return a.losses - b.losses;
            return a.teamId.localeCompare(b.teamId);
          });

          // Atualizar finalPosition para cada classificado
          for (let i = 0; i < sortedClassified.length; i++) {
            const campaign = sortedClassified[i]!;
            const position = i + 1;
            await tx.swissCampaign.update({
              where: { id: campaign.id },
              data: {
                finalPosition: position,
                isEliminated: false,
              },
            });
          }

          if (sortedClassified.length > 0) {
            console.log(
              `[Swiss] Posições atualizadas: ${sortedClassified.length} classificados`,
              sortedClassified.slice(0, 3).map((c, i) => 
                `${i + 1}º ${c.team.name} (${c.wins}-${c.losses})`
              )
            );
          }
        }

        return updated;
      });

      // APÓS A TRANSAÇÃO: automações pós-resultado Swiss
      if (match.swissRoundId) {
        // 1. Verificar se podemos gerar partidas de playoff (12 classificados + 4 convidados)
        const { autoGeneratePlayoffMatches } = await import("../services/swiss-classification.service");
        const generated = await autoGeneratePlayoffMatches(match.tournamentId);
        if (generated) {
          console.log(`[Swiss] ✅ Partidas de playoffs geradas automaticamente após classificação!`);
        }

        // 2. Verificar se TODAS as partidas da rodada atual estão concluídas
        //    Se sim, gerar a próxima rodada automaticamente
        const currentRound = await prisma.swissRound.findUnique({
          where: { id: match.swissRoundId },
          include: { matches: { select: { id: true, status: true } } },
        });

        if (currentRound) {
          const allDone = currentRound.matches.every((m) => m.status === "COMPLETED");

          if (allDone && !currentRound.isComplete) {
            // Marcar rodada como completa
            await prisma.swissRound.update({
              where: { id: currentRound.id },
              data: { isComplete: true },
            });
            console.log(`[Swiss] Rodada ${currentRound.roundNumber} marcada como completa automaticamente.`);

            // Verificar se há mais rodadas a gerar
            const presetConfig = await prisma.tournament
              .findUnique({ where: { id: match.tournamentId }, select: { presetConfig: true } })
              .then((t) => (t?.presetConfig as any)?.swiss);
            const totalRounds: number = presetConfig?.roundsCount ?? 5;

            if (currentRound.roundNumber < totalRounds) {
              // Verificar se ainda existem times sem 3W nem 3D (ainda precisam jogar)
              const activeCampaigns = await prisma.swissCampaign.count({
                where: {
                  tournamentId: match.tournamentId,
                  wins: { lt: 3 },
                  isEliminated: false,
                },
              });

              if (activeCampaigns >= 2) {
                // Gerar próxima rodada via import dinâmico da lógica de pairings
                const { generateSwissPairings } = await import("../services/swiss-pairing.service");
                const nextRoundNumber = currentRound.roundNumber + 1;
                const pairings = await generateSwissPairings(match.tournamentId, nextRoundNumber);

                const swissStage = await prisma.tournamentStage.findFirst({
                  where: { tournamentId: match.tournamentId, type: "SWISS" },
                });

                if (swissStage && pairings.length > 0) {
                  await prisma.$transaction(async (tx) => {
                    const nextRound = await tx.swissRound.create({
                      data: {
                        tournamentId: match.tournamentId,
                        roundNumber: nextRoundNumber,
                        isComplete: false,
                      },
                    });

                    await Promise.all(
                      pairings.map((p) =>
                        tx.match.create({
                          data: {
                            tournamentId: match.tournamentId,
                            stageId: swissStage.id,
                            swissRoundId: nextRound.id,
                            teamAId: p.teamAId,
                            teamBId: p.teamBId,
                            seriesFormat: swissStage.seriesFormat,
                            status: "SCHEDULED",
                          },
                        })
                      )
                    );
                  });

                  console.log(`[Swiss] ✅ Rodada ${nextRoundNumber} gerada automaticamente com ${pairings.length} partidas!`);
                }
              } else {
                console.log(`[Swiss] Menos de 2 times ativos — sem próxima rodada.`);
              }
            } else {
              console.log(`[Swiss] Todas as ${totalRounds} rodadas concluídas.`);
            }
          }
        }
      }

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /matches/:id/picks-bans ────────────────────────────────────────────
// Cria uma sessão de picks & bans no sistema externo para esta partida.
// Retorna o link da sessão para o admin compartilhar com os times.
matchesRouter.post(
  "/:id/picks-bans",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER, UserRole.REFEREE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matchId = getParam(req.params, "id");

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teamA: { select: { id: true, name: true, tag: true, logoUrl: true } },
          teamB: { select: { id: true, name: true, tag: true, logoUrl: true } },
        },
      });

      if (!match) throw AppError.notFound("Partida não encontrada");

      const PICKS_BANS_API = process.env.PICKS_BANS_API_URL || "https://peaks-and-bans-backend.vercel.app";
      const PICKS_BANS_FRONTEND = process.env.PICKS_BANS_FRONTEND_URL || "https://peaks-and-bans.vercel.app";
      const WEBHOOK_SECRET = process.env.ECL_WEBHOOK_SECRET || "ecl-picks-bans-webhook-secret";

      const ECL_FRONTEND_URL = process.env.FRONTEND_URL || "https://ecl-official.vercel.app";

      // Resolver logoUrl para URL absoluta
      const resolveLogoUrl = (url: string | null) => {
        if (url && url.startsWith("/images/")) return `${ECL_FRONTEND_URL}${url}`;
        return url;
      };

      const payload = {
        matchId,
        teamAName: match.teamA.name,
        teamBName: match.teamB.name,
        teamALogo: resolveLogoUrl(match.teamA.logoUrl),
        teamBLogo: resolveLogoUrl(match.teamB.logoUrl),
        teamATag: match.teamA.tag,
        teamBTag: match.teamB.tag,
        seriesFormat: match.seriesFormat,
      };

      let response;
      try {
        response = await fetch(`${PICKS_BANS_API}/api/sessions/from-match`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-ecl-secret": WEBHOOK_SECRET,
          },
          body: JSON.stringify(payload),
        });
      } catch (fetchError) {
        console.error("Erro ao conectar no serviço Picks & Bans:", fetchError);
        throw AppError.serviceUnavailable(
          `Serviço de Picks & Bans indisponível. Verifique se está rodando em ${PICKS_BANS_API}`
        );
      }

      if (!response.ok) {
        const err = await response.text();
        console.error("Erro na resposta do Picks & Bans:", err);
        throw AppError.badRequest(`Erro ao criar sessão de picks & bans: ${err}`);
      }

      const data = (await response.json()) as { sessionId: string; alreadyExists?: boolean };

      const sessionLink = `${PICKS_BANS_FRONTEND}/session/${data.sessionId}`;

      res.json({
        sessionId: data.sessionId,
        sessionLink,
        alreadyExists: data.alreadyExists ?? false,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /matches/:id/picks-bans-complete ───────────────────────────────────
// Webhook chamado pelo sistema de picks & bans quando a sessão é concluída.
// Salva automaticamente os mapas na partida.
matchesRouter.post(
  "/:id/picks-bans-complete",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Autenticação via secret compartilhado
      const secret = req.headers["x-picks-bans-secret"] as string;
      const WEBHOOK_SECRET = process.env.ECL_WEBHOOK_SECRET || "ecl-picks-bans-webhook-secret";

      if (secret !== WEBHOOK_SECRET) {
        return res.status(401).json({ error: "Não autorizado" });
      }

      const matchId = getParam(req.params, "id");

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teamA: { select: { id: true } },
          teamB: { select: { id: true } },
        },
      });

      if (!match) throw AppError.notFound("Partida não encontrada");

      const { maps } = req.body as {
        maps: Array<{
          mapName: string;
          order: number;
          action: "PICKED" | "BANNED" | "DECIDER";
          actionTeamSide: "A" | "B" | null;
        }>;
      };

      if (!Array.isArray(maps) || maps.length === 0) {
        throw AppError.badRequest("Lista de mapas obrigatória");
      }

      // Resolver teamSide ('A'/'B') para o ID real do time
      const resolveTeamId = (side: "A" | "B" | null): string | null => {
        if (side === "A") return match.teamAId;
        if (side === "B") return match.teamBId;
        return null;
      };

      await prisma.$transaction(async (tx) => {
        // Substituir todos os mapas da partida
        await tx.matchMap.deleteMany({ where: { matchId } });
        await tx.matchMap.createMany({
          data: maps.map((m) => ({
            matchId,
            mapName: m.mapName,
            order: m.order,
            action: m.action,
            actionTeamId: resolveTeamId(m.actionTeamSide),
            scoreA: null,
            scoreB: null,
            winnerId: null,
            played: false,
          })),
        });

        // Marcar a partida como READY (picks feitos, aguardando jogar)
        if (match.status === "SCHEDULED") {
          await tx.match.update({
            where: { id: matchId },
            data: { status: MatchStatus.READY },
          });
        }
      });

      res.json({ success: true, mapsCount: maps.length });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /matches/:id/picks-bans-status ──────────────────────────────────────
// Proxy para checar o status da sessão de picks & bans sem expor a URL interna
// no frontend. O admin frontend faz polling nesta rota.
matchesRouter.get(
  "/:id/picks-bans-status",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matchId = getParam(req.params, "id");
      const PICKS_BANS_API = process.env.PICKS_BANS_API_URL || "https://peaks-and-bans-backend.vercel.app";
      const WEBHOOK_SECRET = process.env.ECL_WEBHOOK_SECRET || "ecl-picks-bans-webhook-secret";

      // Buscar sessão pelo matchId no picks-and-bans
      const response = await fetch(
        `${PICKS_BANS_API}/api/sessions/by-match/${matchId}`,
        { headers: { "x-ecl-secret": WEBHOOK_SECRET } },
      );

      if (!response.ok) {
        return res.json({ status: "NOT_FOUND" });
      }

      const data = await response.json() as { status: string; sessionId?: string };
      res.json(data);
    } catch {
      res.json({ status: "NOT_FOUND" });
    }
  }
);

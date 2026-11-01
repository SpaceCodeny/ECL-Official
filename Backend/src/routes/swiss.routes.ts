import { Router, type Request, type Response, type NextFunction } from "express";
import { UserRole, MatchStatus } from "@prisma/client";
import { prisma } from "../database/prisma";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";
import { AppError, getParam } from "../utils/app-error";
import {
  generateSwissPairings,
  finalizeSwissStandings,
  calculateSwissStandings,
} from "../services/swiss-pairing.service";

export const swissRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /tournaments/:id/swiss/campaigns
// Retorna todas as campanhas do torneio, ordenadas por classificação
// ─────────────────────────────────────────────────────────────────────────────
swissRouter.get(
  "/:id/swiss/campaigns",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaigns = await prisma.swissCampaign.findMany({
        where: { tournamentId: getParam(req.params, "id") },
        include: {
          team: {
            select: { id: true, name: true, slug: true, logoUrl: true, tag: true },
          },
        },
        orderBy: [{ wins: "desc" }, { roundDiff: "desc" }, { losses: "asc" }],
      });

      res.json(campaigns);
    } catch (error) {
      next(error);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /tournaments/:id/swiss/rounds
// Retorna todas as rodadas com TODAS as suas partidas (histórico permanente)
// ─────────────────────────────────────────────────────────────────────────────
swissRouter.get(
  "/:id/swiss/rounds",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tournamentId = getParam(req.params, "id");

      const rounds = await prisma.swissRound.findMany({
        where: { tournamentId },
        include: {
          matches: {
            select: {
              id: true,
              teamAId: true,
              teamBId: true,
              winnerTeamId: true,
              status: true,
              scoreA: true,
              scoreB: true,
              teamA: {
                select: { id: true, name: true, slug: true, logoUrl: true, tag: true },
              },
              teamB: {
                select: { id: true, name: true, slug: true, logoUrl: true, tag: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { roundNumber: "asc" },
      });

      // Normalizar campo para o frontend (banco usa winnerTeamId, front usa winnerId)
      const normalized = rounds.map((round) => ({
        ...round,
        matches: round.matches.map((m) => ({
          ...m,
          winnerId: m.winnerTeamId, // alias para compatibilidade
        })),
      }));

      res.json(normalized);
    } catch (error) {
      next(error);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /tournaments/:id/swiss/init
// Inicializa a fase suíça: cria campanhas, APENAS a Rodada 1, e seus confrontos
// ─────────────────────────────────────────────────────────────────────────────
swissRouter.post(
  "/:id/swiss/init",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tournamentId = getParam(req.params, "id");

      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          preset: true,
          registrations: {
            where: { status: "APPROVED" },
            include: { team: { select: { id: true, name: true } } },
          },
        },
      });

      if (!tournament) throw AppError.notFound("Torneio não encontrado");
      if (!tournament.preset) throw AppError.badRequest("Torneio não usa preset");

      const presetConfig = tournament.presetConfig as any;
      const swissConfig = presetConfig?.swiss;
      if (!swissConfig) throw AppError.badRequest("Preset não possui configuração de fase suíça");

      // Idempotência: verifica se já foi inicializado
      const existing = await prisma.swissCampaign.count({ where: { tournamentId } });
      if (existing > 0) throw AppError.badRequest("Fase suíça já foi inicializada");

      // Times que participam do Swiss (excluindo convidados diretos para playoffs)
      const invitedIds = await prisma.invitedTeam
        .findMany({ where: { tournamentId }, select: { teamId: true } })
        .then((r) => r.map((x) => x.teamId));

      const swissTeams = tournament.registrations.filter(
        (r) => !invitedIds.includes(r.teamId)
      );

      if (swissTeams.length < 2) {
        throw AppError.badRequest(
          `Mínimo de 2 times necessários (atual: ${swissTeams.length})`
        );
      }
      if (swissTeams.length % 2 !== 0) {
        throw AppError.badRequest(
          `Número de times deve ser par para o sistema suíço (atual: ${swissTeams.length})`
        );
      }

      const totalRounds = swissConfig.roundsCount ?? 5;

      // --- Transação: tudo ou nada ---
      const result = await prisma.$transaction(async (tx) => {
        // 1. Criar TournamentStage tipo SWISS
        const swissStage = await tx.tournamentStage.create({
          data: {
            tournamentId,
            name: "Fase Suíça",
            type: "SWISS",
            order: 1,
            seriesFormat: swissConfig.matchFormat ?? "BO1",
            startDate: tournament.startDate,
            endDate: tournament.endDate,
          },
        });

        // 2. Criar campanhas para todos os times (todos começam 0-0)
        await tx.swissCampaign.createMany({
          data: swissTeams.map((reg) => ({
            tournamentId,
            teamId: reg.teamId,
            wins: 0,
            losses: 0,
            roundsPlayed: 0,
            roundDiff: 0,
            opponentsIds: [],
            isEliminated: false,
          })),
        });

        // 3. Criar APENAS a Rodada 1 (rodadas futuras são criadas via POST /rounds)
        const round1 = await tx.swissRound.create({
          data: { tournamentId, roundNumber: 1, isComplete: false },
        });

        // 4. Gerar confrontos da Rodada 1 (sorteio aleatório)
        const teamIds = swissTeams.map((t) => t.teamId);
        const shuffled = [...teamIds].sort(() => Math.random() - 0.5);

        const matches = [];
        for (let i = 0; i < shuffled.length - 1; i += 2) {
          const match = await tx.match.create({
            data: {
              tournamentId,
              stageId: swissStage.id,
              swissRoundId: round1.id,
              teamAId: shuffled[i]!,
              teamBId: shuffled[i + 1]!,
              seriesFormat: swissStage.seriesFormat,
              status: MatchStatus.SCHEDULED,
            },
          });
          matches.push(match);
        }

        return { swissStage, round1, matchesCreated: matches.length };
      });

      console.log(
        `[Swiss] Init: ${swissTeams.length} times, stage=${result.swissStage.id}, ` +
        `round1=${result.round1.id}, partidas=${result.matchesCreated}`
      );

      res.status(201).json({
        message: "Fase suíça inicializada",
        teamsCount: swissTeams.length,
        stageId: result.swissStage.id,
        round1Id: result.round1.id,
        matchesCreated: result.matchesCreated,
        totalRounds,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /tournaments/:id/swiss/rounds
// Gera a próxima rodada (somente após a anterior estar completa)
// ─────────────────────────────────────────────────────────────────────────────
swissRouter.post(
  "/:id/swiss/rounds",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tournamentId = getParam(req.params, "id");

      // Última rodada existente
      const lastRound = await prisma.swissRound.findFirst({
        where: { tournamentId },
        orderBy: { roundNumber: "desc" },
        include: { matches: { select: { id: true, status: true } } },
      });

      if (!lastRound) {
        throw AppError.badRequest("Fase suíça não inicializada. Execute /swiss/init primeiro.");
      }

      // A rodada anterior deve estar completa
      const pending = lastRound.matches.filter((m) => m.status !== MatchStatus.COMPLETED);
      if (pending.length > 0) {
        throw AppError.badRequest(
          `Rodada ${lastRound.roundNumber} tem ${pending.length} partida(s) pendente(s). ` +
          `Finalize todos os resultados antes de gerar a próxima rodada.`
        );
      }
      if (!lastRound.isComplete) {
        throw AppError.badRequest(
          `Rodada ${lastRound.roundNumber} não foi marcada como completa.`
        );
      }

      const nextRoundNumber = lastRound.roundNumber + 1;

      // Idempotência: se a próxima rodada já existe, retorna ela
      const existingNext = await prisma.swissRound.findUnique({
        where: { tournamentId_roundNumber: { tournamentId, roundNumber: nextRoundNumber } },
        include: {
          matches: {
            include: {
              teamA: { select: { id: true, name: true, slug: true } },
              teamB: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      });
      if (existingNext && existingNext.matches.length > 0) {
        return res.status(200).json({
          message: `Rodada ${nextRoundNumber} já existia`,
          round: existingNext,
          matches: existingNext.matches,
        });
      }

      // Gerar os pares
      const pairings = await generateSwissPairings(tournamentId, nextRoundNumber);

      // Buscar stage Swiss
      const swissStage = await prisma.tournamentStage.findFirst({
        where: { tournamentId, type: "SWISS" },
      });
      if (!swissStage) throw AppError.notFound("Stage suíça não encontrada");

      // Transação: criar rodada + todas as partidas de uma vez
      const { round, matches } = await prisma.$transaction(async (tx) => {
        // Criar (ou reutilizar) a rodada
        const round = await tx.swissRound.upsert({
          where: { tournamentId_roundNumber: { tournamentId, roundNumber: nextRoundNumber } },
          create: { tournamentId, roundNumber: nextRoundNumber, isComplete: false },
          update: {}, // se já existia vazia, apenas usa
        });

        // Criar as partidas vinculadas a esta rodada
        const matches = await Promise.all(
          pairings.map((p) =>
            tx.match.create({
              data: {
                tournamentId,
                stageId: swissStage.id,
                swissRoundId: round.id,
                teamAId: p.teamAId,
                teamBId: p.teamBId,
                seriesFormat: swissStage.seriesFormat,
                status: MatchStatus.SCHEDULED,
              },
              include: {
                teamA: { select: { id: true, name: true, slug: true } },
                teamB: { select: { id: true, name: true, slug: true } },
              },
            })
          )
        );

        return { round, matches };
      });

      console.log(
        `[Swiss] Rodada ${nextRoundNumber} gerada: ${matches.length} partidas`
      );

      res.status(201).json({ round, matches });
    } catch (error) {
      next(error);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /tournaments/:id/swiss/rounds/:roundId/complete
// Marca uma rodada como completa (valida que todas as partidas estão finalizadas)
// ─────────────────────────────────────────────────────────────────────────────
swissRouter.post(
  "/:id/swiss/rounds/:roundId/complete",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roundId = getParam(req.params, "roundId");

      const round = await prisma.swissRound.findUnique({
        where: { id: roundId },
        include: { matches: { select: { id: true, status: true } } },
      });
      if (!round) throw AppError.notFound("Rodada não encontrada");

      const pending = round.matches.filter((m) => m.status !== MatchStatus.COMPLETED);
      if (pending.length > 0) {
        throw AppError.badRequest(
          `Ainda há ${pending.length} partida(s) pendente(s) na rodada ${round.roundNumber}`
        );
      }

      await prisma.swissRound.update({
        where: { id: roundId },
        data: { isComplete: true },
      });

      console.log(`[Swiss] Rodada ${round.roundNumber} marcada como completa`);
      res.json({ message: `Rodada ${round.roundNumber} marcada como completa` });
    } catch (error) {
      next(error);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /tournaments/:id/swiss/finalize
// Finaliza a fase suíça:
// 1. Times com 3+ wins já estão classificados
// 2. Times com 3+ losses já estão eliminados
// 3. Times restantes são ordenados por ranking e classificados/eliminados
//    para atingir exatamente classifiedCount e eliminatedCount
// ─────────────────────────────────────────────────────────────────────────────
swissRouter.post(
  "/:id/swiss/finalize",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tournamentId = getParam(req.params, "id");

      const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
      if (!tournament) throw AppError.notFound("Torneio não encontrado");

      const presetConfig = tournament.presetConfig as any;
      const swissConfig = presetConfig?.swiss;
      const classifiedCount: number = swissConfig?.classifiedCount ?? 12;
      const eliminatedCount: number = swissConfig?.eliminatedCount ?? 8;

      if (classifiedCount + eliminatedCount !== 20) {
        throw AppError.badRequest(
          `classifiedCount (${classifiedCount}) + eliminatedCount (${eliminatedCount}) deve ser 20`
        );
      }

      // Buscar todas as campanhas ordenadas por ranking
      const campaigns = await prisma.swissCampaign.findMany({
        where: { tournamentId },
        include: { team: { select: { id: true, name: true, slug: true } } },
        orderBy: [{ wins: "desc" }, { roundDiff: "desc" }, { losses: "asc" }],
      });

      if (campaigns.length !== 20) {
        throw AppError.badRequest(`Esperado 20 campanhas, encontrado ${campaigns.length}`);
      }

      // Verificar campanhas inválidas (nunca deveria acontecer)
      const invalid = campaigns.filter((c) => c.wins > 3 || c.losses > 3);
      if (invalid.length > 0) {
        throw AppError.badRequest(
          `Campanhas inválidas encontradas: ${invalid.map((c) => `${c.team.name}(${c.wins}-${c.losses})`).join(", ")}`
        );
      }

      // Aplicar posições finais e marcar classificados/eliminados
      // REGRA CRÍTICA: times com 3+ losses NUNCA classificam, mesmo com ranking alto
      // Isso pode acontecer se o formato produzir >12 times com 3+ wins ou <12 times sem 3+ losses
      
      const alreadyClassified = campaigns.filter((c) => c.wins >= 3 && c.losses < 3);
      const alreadyEliminated = campaigns.filter((c) => c.losses >= 3);
      const borderline = campaigns.filter((c) => c.wins < 3 && c.losses < 3);
      // Casos edge: time com wins >= 3 E losses >= 3 (impossível com 3W/3L pois para na 1ª)

      // Ordenar borderline por ranking (wins desc, roundDiff desc, losses asc)
      borderline.sort((a, b) => b.wins - a.wins || b.roundDiff - a.roundDiff || a.losses - b.losses);

      // Verificar quantas vagas faltam depois dos classificados por resultado
      const vagas = classifiedCount - alreadyClassified.length;
      if (vagas < 0) {
        throw AppError.badRequest(
          `${alreadyClassified.length} times já classificados por resultado, mas classifiedCount=${classifiedCount}. ` +
          `Ajuste o classifiedCount no preset.`
        );
      }

      // Preencher vagas com borderline primeiro, depois com melhores eliminados se necessário
      // (Regra de fechamento: se não houver borderline suficiente, pegar os melhores entre os eliminados)
      const allCandidates = [
        ...borderline,
        // Se ainda faltam vagas, pegar eliminados ordenados por melhor campanha
        ...alreadyEliminated.sort((a, b) => b.wins - a.wins || b.roundDiff - a.roundDiff || a.losses - b.losses),
      ];

      const classifiedByRankingTeams = allCandidates.slice(0, vagas);
      const eliminatedTeams = allCandidates.slice(vagas);

      // Construir lista final ordenada para posições
      const finalOrdered = [
        ...alreadyClassified,
        ...classifiedByRankingTeams,
        ...eliminatedTeams.sort((a, b) =>
          b.wins - a.wins || b.roundDiff - a.roundDiff || a.losses - b.losses
        ),
      ];

      // Persistir as posições finais
      await prisma.$transaction(
        finalOrdered.map((c, i) => {
          const position = i + 1;
          const isClassified = position <= classifiedCount;
          return prisma.swissCampaign.update({
            where: { id: c.id },
            data: { finalPosition: position, isEliminated: !isClassified },
          });
        })
      );

      const classified = finalOrdered.slice(0, classifiedCount);
      const eliminated = finalOrdered.slice(classifiedCount);

      const classifiedByResult = alreadyClassified.length;
      const classifiedByRanking = classifiedByRankingTeams.length;
      const eliminatedByResult = alreadyEliminated.length;
      const eliminatedByRanking = eliminatedByRankingTeams.length - alreadyEliminated.length;

      console.log(
        `[Swiss] Finalizado: ${classifiedCount} classificados ` +
        `(${classifiedByResult} por resultado, ${classifiedByRanking} por ranking) | ` +
        `${eliminatedCount} eliminados ` +
        `(${eliminatedByResult} por resultado, ${eliminatedByRanking} por ranking)`
      );

      res.json({
        message: "Fase suíça finalizada",
        classifiedCount,
        eliminatedCount,
        classified: classified.map((c) => ({
          teamId: c.teamId,
          name: c.team.name,
          campaign: `${c.wins}-${c.losses}`,
          position: campaigns.indexOf(c) + 1,
          classifiedBy: c.wins >= 3 ? "result" : "ranking",
        })),
        eliminated: eliminated.map((c) => ({
          teamId: c.teamId,
          name: c.team.name,
          campaign: `${c.wins}-${c.losses}`,
          position: campaigns.indexOf(c) + 1,
          eliminatedBy: c.losses >= 3 ? "result" : "ranking",
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /tournaments/:id/swiss/standings
// Retorna a classificação atual com metadados da fase
// ─────────────────────────────────────────────────────────────────────────────
swissRouter.get(
  "/:id/swiss/standings",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tournamentId = getParam(req.params, "id");

      const campaigns = await prisma.swissCampaign.findMany({
        where: { tournamentId },
        include: {
          team: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
        },
        orderBy: [{ wins: "desc" }, { roundDiff: "desc" }, { losses: "asc" }],
      });

      if (campaigns.length === 0) return res.json(null);

      const rounds = await prisma.swissRound.findMany({
        where: { tournamentId },
        orderBy: { roundNumber: "asc" },
      });

      const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
      const presetConfig = tournament?.presetConfig as any;
      const swissConfig = presetConfig?.swiss;

      const totalRounds = swissConfig?.roundsCount ?? 5;
      const classifiedCount = swissConfig?.classifiedCount ?? 12;

      // Rodada atual = a mais recente que tem partidas
      const roundsWithMatches = await prisma.swissRound.findMany({
        where: {
          tournamentId,
          matches: { some: {} },
        },
        orderBy: { roundNumber: "desc" },
        take: 1,
      });
      const currentRound = roundsWithMatches[0]?.roundNumber ?? 1;

      const standings = await calculateSwissStandings(tournamentId);
      const result = standings.map((s) => ({
        ...campaigns.find((c) => c.teamId === s.teamId),
        position: s.position,
      }));

      res.json({
        campaigns: result,
        currentRound,
        totalRounds,
        classifiedCount,
        isComplete: rounds.every((r) => r.isComplete),
      });
    } catch (error) {
      next(error);
    }
  }
);

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../database/prisma";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";
import type { Request, Response, NextFunction } from "express";
import type { SeriesFormat } from "@prisma/client";

export const bracketRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Ordinal em PT-BR: 1 → "1º", 12 → "12º" */
function ordinal(n: number): string {
  return `${n}º`;
}

/** Label do placeholder para classificado pela posição suíça */
function swissPlaceholder(position: number): string {
  return `${ordinal(position)} Classificado`;
}

/** Label do vencedor de uma oitava */
function ro16WinnerLabel(matchNum: number): string {
  return `Vencedor Oitava ${matchNum}`;
}

/** Label do vencedor de uma quarta */
function qfWinnerLabel(matchNum: number): string {
  return `Vencedor Quartas ${matchNum}`;
}

/** Label do vencedor de uma semi */
function sfWinnerLabel(matchNum: number): string {
  return `Vencedor Semi ${matchNum}`;
}

/** Calcula a seed suíça atribuída a cada posição no bracket de 16.
 *
 * Layout dos 16 seeds (1-indexado):
 * Posição RO16-1:  seed 1  (convidado slot 1, "cabeça de chave A")
 * Posição RO16-2:  seed 16
 * Posição RO16-3:  seed 8  (convidado slot 2, "cabeça de chave B")
 * Posição RO16-4:  seed 9
 * Posição RO16-5:  seed 4  (convidado slot 3, "cabeça de chave C")
 * Posição RO16-6:  seed 13
 * Posição RO16-7:  seed 5  (convidado slot 4, "cabeça de chave D")
 * Posição RO16-8:  seed 12
 * Posição RO16-9:  seed 2
 * Posição RO16-10: seed 15
 * Posição RO16-11: seed 7
 * Posição RO16-12: seed 10
 * Posição RO16-13: seed 3
 * Posição RO16-14: seed 14
 * Posição RO16-15: seed 6
 * Posição RO16-16: seed 11
 */
const SEED_BY_POSITION: Record<number, number> = {
  1: 1, 2: 16, 3: 8, 4: 9, 5: 4, 6: 13, 7: 5, 8: 12,
  9: 2, 10: 15, 11: 7, 12: 10, 13: 3, 14: 14, 15: 6, 16: 11,
};

/** Posição de cada seed (inverso) */
const POSITION_BY_SEED: Record<number, number> = Object.fromEntries(
  Object.entries(SEED_BY_POSITION).map(([pos, seed]) => [seed, Number(pos)])
);

/** Seeds fixos dos cabeças de chave (convidados), um por quadrante */
const INVITED_SEEDS = [1, 8, 4, 5]; // bracketSlot 1→seed1, 2→seed8, 3→seed4, 4→seed5

// ─── Construção do chaveamento virtual (sem partidas no banco) ─────────────

interface PlayoffTeam {
  id: string;
  name: string;
  tag: string | null;
  logoUrl: string | null;
  slug: string;
}

interface VirtualMatch {
  id: string; // pode ser UUID do banco ou ID virtual "virtual-RO16-1"
  bracketPosition: string;
  status: string;
  seriesFormat: string;
  scoreA: number | null;
  scoreB: number | null;
  winnerTeamId: string | null;
  teamA: PlayoffTeam | null;
  teamB: PlayoffTeam | null;
  teamALabel: string | null;  // placeholder quando teamA não existe
  teamBLabel: string | null;  // placeholder quando teamB não existe
  isInvitedA: boolean;
  isInvitedB: boolean;
  scheduledAt: string | null;
}

interface PlayoffBracket {
  isGenerated: boolean;       // true se partidas existem no banco
  swissFinalized: boolean;    // true se finalPosition foi definida
  invitedTeams: Array<{
    id: string;
    bracketSlot: number;
    team: PlayoffTeam;
  }>;
  ro16: VirtualMatch[];
  qf: VirtualMatch[];
  sf: VirtualMatch[];
  final: VirtualMatch[];
}

/**
 * Constrói o chaveamento completo, sempre visível.
 * Se as partidas já existem no banco, usa os dados reais.
 * Se não existem, monta o bracket virtual com placeholders.
 */
async function buildPlayoffBracket(tournamentId: string): Promise<PlayoffBracket> {
  // 1. Equipes convidadas
  const invitedTeams = await prisma.invitedTeam.findMany({
    where: { tournamentId },
    include: { team: { select: { id: true, name: true, tag: true, logoUrl: true, slug: true } } },
    orderBy: { bracketSlot: "asc" },
  });

  // 2. Campanhas finalizadas (finalPosition preenchida)
  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId, finalPosition: { not: null } },
    include: { team: { select: { id: true, name: true, tag: true, logoUrl: true, slug: true } } },
    orderBy: { finalPosition: "asc" },
  });

  console.log('[Bracket Debug] Campaigns com finalPosition:', campaigns.length);
  campaigns.forEach(c => console.log(`  - ${c.team.name}: finalPosition=${c.finalPosition}`));

  const swissFinalized = campaigns.length >= 12;

  // Mapa seed → time (convidados + classificados)
  const teamBySeed = new Map<number, { team: PlayoffTeam; isInvited: boolean; label: string }>();

  // Posicionar convidados por bracketSlot
  for (const inv of invitedTeams) {
    const seed = INVITED_SEEDS[(inv.bracketSlot - 1)] ?? (inv.bracketSlot * 8 - 7);
    teamBySeed.set(seed, {
      team: inv.team,
      isInvited: true,
      label: `Convidado ${inv.bracketSlot}`,
    });
  }

  // Posicionar classificados suíços (seeds não ocupados por convidados)
  // Distribuição: classificados preenchem as 12 posições restantes
  const swissSeeds = Array.from({ length: 16 }, (_, i) => i + 1)
    .filter((seed) => !INVITED_SEEDS.includes(seed));

  for (const camp of campaigns.slice(0, 12)) {
    const idx = (camp.finalPosition ?? 99) - 1;
    const seed = swissSeeds[idx];
    if (seed !== undefined) {
      console.log(`[Bracket Debug] Adicionando ${camp.team.name} (pos ${camp.finalPosition}) no seed ${seed}`);
      teamBySeed.set(seed, {
        team: camp.team,
        isInvited: false,
        label: swissPlaceholder(camp.finalPosition!),
      });
    }
  }

  console.log('[Bracket Debug] teamBySeed final:', Array.from(teamBySeed.entries()).map(([seed, entry]) => 
    `seed ${seed}: ${entry.team.name} (${entry.isInvited ? 'convidado' : 'classificado'})`
  ));

  // 3. Verificar se partidas reais existem no banco
  const realMatches = await prisma.match.findMany({
    where: { tournamentId, bracketPosition: { not: null } },
    include: {
      teamA: { select: { id: true, name: true, tag: true, logoUrl: true, slug: true } },
      teamB: { select: { id: true, name: true, tag: true, logoUrl: true, slug: true } },
    },
    orderBy: { bracketPosition: "asc" },
  });

  const isGenerated = realMatches.length > 0;
  const realMatchMap = new Map(realMatches.map((m) => [m.bracketPosition!, m]));

  // 4. Montar as 8 oitavas
  const ro16: VirtualMatch[] = [];
  for (let pos = 1; pos <= 8; pos++) {
    const posKey = `RO16-${pos}`;
    const real = realMatchMap.get(posKey);

    // Determinar os dois seeds que se enfrentam neste match
    // Posições 1-8 no bracket: posição P tem seed SEED_BY_POSITION[P*2-1] vs SEED_BY_POSITION[P*2]
    const seedA = SEED_BY_POSITION[pos * 2 - 1]!;
    const seedB = SEED_BY_POSITION[pos * 2]!;

    const entryA = teamBySeed.get(seedA);
    const entryB = teamBySeed.get(seedB);

    if (real) {
      ro16.push({
        id: real.id,
        bracketPosition: posKey,
        status: real.status,
        seriesFormat: real.seriesFormat,
        scoreA: real.scoreA,
        scoreB: real.scoreB,
        winnerTeamId: real.winnerTeamId,
        teamA: real.teamA as PlayoffTeam | null,
        teamB: real.teamB as PlayoffTeam | null,
        teamALabel: !real.teamA ? (entryA?.label ?? swissPlaceholder(seedA)) : null,
        teamBLabel: !real.teamB ? (entryB?.label ?? swissPlaceholder(seedB)) : null,
        isInvitedA: entryA?.isInvited ?? false,
        isInvitedB: entryB?.isInvited ?? false,
        scheduledAt: real.scheduledAt?.toISOString() ?? null,
      });
    } else {
      // Match virtual - usar dados do teamBySeed se disponível
      ro16.push({
        id: `virtual-${posKey}`,
        bracketPosition: posKey,
        status: "SCHEDULED",
        seriesFormat: "BO3",
        scoreA: null,
        scoreB: null,
        winnerTeamId: null,
        teamA: entryA?.team ?? null,
        teamB: entryB?.team ?? null,
        teamALabel: entryA?.team ? null : (entryA?.label ?? swissPlaceholder(seedA)),
        teamBLabel: entryB?.team ? null : (entryB?.label ?? swissPlaceholder(seedB)),
        isInvitedA: entryA?.isInvited ?? false,
        isInvitedB: entryB?.isInvited ?? false,
        scheduledAt: null,
      });
    }
  }

  // 5. Montar as 4 quartas
  const qf: VirtualMatch[] = [];
  for (let pos = 1; pos <= 4; pos++) {
    const posKey = `QF-${pos}`;
    const real = realMatchMap.get(posKey);

    const srcA = `RO16-${pos * 2 - 1}`;
    const srcB = `RO16-${pos * 2}`;
    const labelA = ro16WinnerLabel(pos * 2 - 1);
    const labelB = ro16WinnerLabel(pos * 2);

    if (real) {
      qf.push({
        id: real.id,
        bracketPosition: posKey,
        status: real.status,
        seriesFormat: real.seriesFormat,
        scoreA: real.scoreA,
        scoreB: real.scoreB,
        winnerTeamId: real.winnerTeamId,
        teamA: real.teamA as PlayoffTeam | null,
        teamB: real.teamB as PlayoffTeam | null,
        teamALabel: !real.teamA ? labelA : null,
        teamBLabel: !real.teamB ? labelB : null,
        isInvitedA: false,
        isInvitedB: false,
        scheduledAt: real.scheduledAt?.toISOString() ?? null,
      });
    } else {
      // Tentar preencher com vencedores das oitavas já definidos
      const ro16A = ro16.find((m) => m.bracketPosition === srcA);
      const ro16B = ro16.find((m) => m.bracketPosition === srcB);
      const winnerATeam = ro16A?.winnerTeamId
        ? ro16A.teamA?.id === ro16A.winnerTeamId ? ro16A.teamA : ro16A.teamB
        : null;
      const winnerBTeam = ro16B?.winnerTeamId
        ? ro16B.teamA?.id === ro16B.winnerTeamId ? ro16B.teamA : ro16B.teamB
        : null;

      qf.push({
        id: `virtual-${posKey}`,
        bracketPosition: posKey,
        status: "SCHEDULED",
        seriesFormat: "BO3",
        scoreA: null,
        scoreB: null,
        winnerTeamId: null,
        teamA: winnerATeam ?? null,
        teamB: winnerBTeam ?? null,
        teamALabel: !winnerATeam ? labelA : null,
        teamBLabel: !winnerBTeam ? labelB : null,
        isInvitedA: false,
        isInvitedB: false,
        scheduledAt: null,
      });
    }
  }

  // 6. Montar as 2 semis
  const sf: VirtualMatch[] = [];
  for (let pos = 1; pos <= 2; pos++) {
    const posKey = `SF-${pos}`;
    const real = realMatchMap.get(posKey);

    const srcA = `QF-${pos * 2 - 1}`;
    const srcB = `QF-${pos * 2}`;
    const labelA = qfWinnerLabel(pos * 2 - 1);
    const labelB = qfWinnerLabel(pos * 2);

    if (real) {
      sf.push({
        id: real.id,
        bracketPosition: posKey,
        status: real.status,
        seriesFormat: real.seriesFormat,
        scoreA: real.scoreA,
        scoreB: real.scoreB,
        winnerTeamId: real.winnerTeamId,
        teamA: real.teamA as PlayoffTeam | null,
        teamB: real.teamB as PlayoffTeam | null,
        teamALabel: !real.teamA ? labelA : null,
        teamBLabel: !real.teamB ? labelB : null,
        isInvitedA: false,
        isInvitedB: false,
        scheduledAt: real.scheduledAt?.toISOString() ?? null,
      });
    } else {
      const qfA = qf.find((m) => m.bracketPosition === srcA);
      const qfB = qf.find((m) => m.bracketPosition === srcB);
      const winnerATeam = qfA?.winnerTeamId
        ? qfA.teamA?.id === qfA.winnerTeamId ? qfA.teamA : qfA.teamB
        : null;
      const winnerBTeam = qfB?.winnerTeamId
        ? qfB.teamA?.id === qfB.winnerTeamId ? qfB.teamA : qfB.teamB
        : null;

      sf.push({
        id: `virtual-${posKey}`,
        bracketPosition: posKey,
        status: "SCHEDULED",
        seriesFormat: "BO3",
        scoreA: null,
        scoreB: null,
        winnerTeamId: null,
        teamA: winnerATeam ?? null,
        teamB: winnerBTeam ?? null,
        teamALabel: !winnerATeam ? labelA : null,
        teamBLabel: !winnerBTeam ? labelB : null,
        isInvitedA: false,
        isInvitedB: false,
        scheduledAt: null,
      });
    }
  }

  // 7. Final
  const finalMatches: VirtualMatch[] = [];
  const realFinal = realMatchMap.get("FINAL");

  if (realFinal) {
    finalMatches.push({
      id: realFinal.id,
      bracketPosition: "FINAL",
      status: realFinal.status,
      seriesFormat: realFinal.seriesFormat,
      scoreA: realFinal.scoreA,
      scoreB: realFinal.scoreB,
      winnerTeamId: realFinal.winnerTeamId,
      teamA: realFinal.teamA as PlayoffTeam | null,
      teamB: realFinal.teamB as PlayoffTeam | null,
      teamALabel: !realFinal.teamA ? sfWinnerLabel(1) : null,
      teamBLabel: !realFinal.teamB ? sfWinnerLabel(2) : null,
      isInvitedA: false,
      isInvitedB: false,
      scheduledAt: realFinal.scheduledAt?.toISOString() ?? null,
    });
  } else {
    const sf1 = sf.find((m) => m.bracketPosition === "SF-1");
    const sf2 = sf.find((m) => m.bracketPosition === "SF-2");
    const winnerATeam = sf1?.winnerTeamId
      ? sf1.teamA?.id === sf1.winnerTeamId ? sf1.teamA : sf1.teamB
      : null;
    const winnerBTeam = sf2?.winnerTeamId
      ? sf2.teamA?.id === sf2.winnerTeamId ? sf2.teamA : sf2.teamB
      : null;

    finalMatches.push({
      id: "virtual-FINAL",
      bracketPosition: "FINAL",
      status: "SCHEDULED",
      seriesFormat: "BO5",
      scoreA: null,
      scoreB: null,
      winnerTeamId: null,
      teamA: winnerATeam ?? null,
      teamB: winnerBTeam ?? null,
      teamALabel: !winnerATeam ? sfWinnerLabel(1) : null,
      teamBLabel: !winnerBTeam ? sfWinnerLabel(2) : null,
      isInvitedA: false,
      isInvitedB: false,
      scheduledAt: null,
    });
  }

  return {
    isGenerated,
    swissFinalized,
    invitedTeams: invitedTeams.map((i) => ({ id: i.id, bracketSlot: i.bracketSlot, team: i.team })),
    ro16,
    qf,
    sf,
    final: finalMatches,
  };
}

// ─── Rotas ────────────────────────────────────────────────────────────────────

/**
 * GET /tournaments/:tournamentId/bracket
 * Retorna o bracket de playoffs sempre visível, com placeholders dinâmicos.
 * Funciona desde o início do campeonato, mesmo antes do Swiss terminar.
 */
bracketRouter.get(
  "/:tournamentId/bracket",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tournamentId } = z.object({ tournamentId: z.string() }).parse(req.params);

      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { id: true, preset: { select: { config: true } } },
      });
      if (!tournament) return res.status(404).json({ message: "Torneio não encontrado" });

      const bracket = await buildPlayoffBracket(tournamentId);
      console.log('[Bracket Endpoint] Retornando:', {
        keys: Object.keys(bracket),
        ro16Count: bracket.ro16.length,
        qfCount: bracket.qf.length,
        sfCount: bracket.sf.length,
        finalCount: bracket.final.length,
      });
      res.json(bracket);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /tournaments/:tournamentId/bracket/generate
 * Persiste as partidas das oitavas no banco, usando os classificados reais do Swiss.
 * Só pode ser chamado após o Swiss ser finalizado (finalPosition definidas).
 */
bracketRouter.post(
  "/:tournamentId/bracket/generate",
  authenticate,
  authorize("ADMINISTRATOR" as any),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tournamentId } = z.object({ tournamentId: z.string() }).parse(req.params);

      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: { preset: true },
      });
      if (!tournament) return res.status(404).json({ message: "Torneio não encontrado" });

      // Idempotência
      const existing = await prisma.match.count({
        where: { tournamentId, bracketPosition: { not: null } },
      });
      if (existing > 0) {
        return res.status(400).json({ message: "Bracket já foi gerado para este torneio" });
      }

      // Verificar convidados
      const invitedTeams = await prisma.invitedTeam.findMany({
        where: { tournamentId },
        orderBy: { bracketSlot: "asc" },
      });
      if (invitedTeams.length !== 4) {
        return res.status(400).json({
          message: `São necessárias exatamente 4 equipes convidadas (atual: ${invitedTeams.length})`,
        });
      }

      // Verificar classificados Swiss
      const swissClassified = await prisma.swissCampaign.findMany({
        where: { tournamentId, finalPosition: { not: null, lte: 12 } },
        orderBy: { finalPosition: "asc" },
      });
      if (swissClassified.length !== 12) {
        return res.status(400).json({
          message: `Swiss não finalizado. Esperados 12 classificados, encontrados ${swissClassified.length}. Execute /swiss/finalize primeiro.`,
        });
      }

      // Buscar/criar stage de playoffs
      let playoffStage = await prisma.tournamentStage.findFirst({
        where: { tournamentId, type: "BRACKET" },
      });
      if (!playoffStage) {
        playoffStage = await prisma.tournamentStage.create({
          data: {
            tournamentId,
            name: "Playoffs",
            order: 2,
            type: "BRACKET",
            seriesFormat: "BO3",
          },
        });
      }

      // Construir mapa seed → teamId
      const invitedBySlot = new Map(invitedTeams.map((i) => [i.bracketSlot, i.teamId]));
      const swissByPosition = new Map(swissClassified.map((c) => [c.finalPosition!, c.teamId]));

      // 12 seeds suíços (posições no array de seeds não-convidados)
      const swissSeeds = Array.from({ length: 16 }, (_, i) => i + 1)
        .filter((seed) => !INVITED_SEEDS.includes(seed));

      // Preset para regra 3-0
      const presetConfig = (tournament.preset?.config ?? {}) as any;
      const specialRule = presetConfig?.bracket?.specialRules?.perfect3_0_vs_invited;
      const perfect3_0 = swissClassified.find((c) => c.wins !== undefined
        ? false
        : false); // 3-0 teams já têm finalPosition definida via finalize

      // Mapa seed → teamId para criar as 8 partidas de oitavas
      const teamBySeed = new Map<number, string>();
      for (const [slot, teamId] of invitedBySlot) {
        const seed = INVITED_SEEDS[(slot - 1)] ?? slot;
        teamBySeed.set(seed, teamId);
      }
      for (let i = 0; i < Math.min(swissClassified.length, swissSeeds.length); i++) {
        const seed = swissSeeds[i]!;
        const classified = swissClassified[i]!;
        teamBySeed.set(seed, classified.teamId);
      }

      // Criar 8 partidas das oitavas (seed X vs seed 17-X para bracket de 16)
      const matchesToCreate: Array<{ pos: string; teamAId: string | null; teamBId: string | null; format: SeriesFormat }> = [];

      for (let matchNum = 1; matchNum <= 8; matchNum++) {
        const seedA = SEED_BY_POSITION[matchNum * 2 - 1]!;
        const seedB = SEED_BY_POSITION[matchNum * 2]!;
        matchesToCreate.push({
          pos: `RO16-${matchNum}`,
          teamAId: teamBySeed.get(seedA) ?? null,
          teamBId: teamBySeed.get(seedB) ?? null,
          format: "BO3",
        });
      }

      // Criar partidas em transação
      const created = await prisma.$transaction(
        matchesToCreate.map((m) =>
          prisma.match.create({
            data: {
              tournamentId,
              stageId: playoffStage!.id,
              teamAId: m.teamAId!,
              teamBId: m.teamBId!,
              seriesFormat: m.format,
              status: "SCHEDULED",
              bracketPosition: m.pos,
            },
          })
        )
      );

      res.status(201).json({
        message: "Bracket gerado com sucesso",
        matchesCreated: created.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /tournaments/:tournamentId/bracket/:matchId/result
 * Registra resultado e avança vencedor automaticamente.
 */
bracketRouter.patch(
  "/:tournamentId/bracket/:matchId/result",
  authenticate,
  authorize("ADMINISTRATOR" as any),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tournamentId, matchId } = z
        .object({ tournamentId: z.string(), matchId: z.string() })
        .parse(req.params);

      const { winnerId, scoreA, scoreB } = z
        .object({
          winnerId: z.string(),
          scoreA: z.number().int().min(0),
          scoreB: z.number().int().min(0),
        })
        .parse(req.body);

      const match = await prisma.match.findUnique({ where: { id: matchId } });
      if (!match || match.tournamentId !== tournamentId) {
        return res.status(404).json({ message: "Partida não encontrada" });
      }
      if (!match.bracketPosition) {
        return res.status(400).json({ message: "Esta partida não pertence ao bracket" });
      }
      if (match.status === "COMPLETED") {
        return res.status(400).json({ message: "Partida já foi finalizada" });
      }
      if (winnerId !== match.teamAId && winnerId !== match.teamBId) {
        return res.status(400).json({ message: "Vencedor deve ser uma das equipes da partida" });
      }

      // Atualizar partida
      const updated = await prisma.match.update({
        where: { id: matchId },
        data: { status: "COMPLETED", winnerTeamId: winnerId, scoreA, scoreB },
      });

      // Calcular próxima posição
      const pos = match.bracketPosition;
      let nextPos: string | null = null;

      if (pos.startsWith("RO16-")) {
        const n = parseInt(pos.split("-")[1]!);
        nextPos = `QF-${Math.ceil(n / 2)}`;
      } else if (pos.startsWith("QF-")) {
        const n = parseInt(pos.split("-")[1]!);
        nextPos = `SF-${Math.ceil(n / 2)}`;
      } else if (pos.startsWith("SF-")) {
        nextPos = "FINAL";
      }

      // Avançar vencedor
      if (nextPos) {
        const matchNum = parseInt(pos.split("-").pop() ?? "1");
        const isTeamA = matchNum % 2 === 1;

        let nextMatch = await prisma.match.findFirst({
          where: { tournamentId, bracketPosition: nextPos },
        });

        // Se partida da próxima fase não existe ainda, criar
        if (!nextMatch) {
          const playoffStage = await prisma.tournamentStage.findFirst({
            where: { tournamentId, type: "BRACKET" },
          });
          if (playoffStage) {
            // Formato da próxima fase
            let nextFormat: SeriesFormat = "BO3";
            if (nextPos === "FINAL") nextFormat = "BO5";

            nextMatch = await prisma.match.create({
              data: {
                tournamentId,
                stageId: playoffStage.id,
                teamAId: isTeamA ? winnerId : "placeholder",
                teamBId: isTeamA ? "placeholder" : winnerId,
                seriesFormat: nextFormat,
                status: "SCHEDULED",
                bracketPosition: nextPos,
              },
            });

            // Corrigir placeholder
            await prisma.match.update({
              where: { id: nextMatch.id },
              data: isTeamA ? { teamAId: winnerId } : { teamBId: winnerId },
            });
          }
        } else {
          await prisma.match.update({
            where: { id: nextMatch.id },
            data: isTeamA ? { teamAId: winnerId } : { teamBId: winnerId },
          });
        }
      }

      res.json({ message: "Resultado registrado com sucesso", match: updated, advancedTo: nextPos });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /tournaments/:tournamentId/invited/:invitedId
 * Atualiza posição (bracketSlot) de um time convidado — controle total do admin.
 */
bracketRouter.put(
  "/:tournamentId/invited/:invitedId",
  authenticate,
  authorize("ADMINISTRATOR" as any),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tournamentId, invitedId } = z
        .object({ tournamentId: z.string(), invitedId: z.string() })
        .parse(req.params);

      const { bracketSlot } = z
        .object({ bracketSlot: z.number().int().min(1).max(4) })
        .parse(req.body);

      const invited = await prisma.invitedTeam.findUnique({ where: { id: invitedId } });
      if (!invited || invited.tournamentId !== tournamentId) {
        return res.status(404).json({ message: "Convite não encontrado" });
      }

      // Verificar conflito de slot
      const conflict = await prisma.invitedTeam.findFirst({
        where: { tournamentId, bracketSlot, id: { not: invitedId } },
      });
      if (conflict) {
        return res.status(400).json({ message: `Slot ${bracketSlot} já está ocupado por outra equipe` });
      }

      const updated = await prisma.invitedTeam.update({
        where: { id: invitedId },
        data: { bracketSlot },
        include: { team: { select: { id: true, name: true, tag: true, logoUrl: true, slug: true } } },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

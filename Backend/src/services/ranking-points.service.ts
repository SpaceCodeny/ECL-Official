/**
 * ranking-points.service.ts
 *
 * Aplica pontos ao ranking automaticamente após cada resultado de partida.
 * Os pontos são lidos do presetConfig do torneio (campo scoring).
 *
 * Estrutura esperada no presetConfig.scoring:
 * {
 *   swissWin:      number,  // pontos por vitória na fase suíça
 *   swissLoss:     number,  // pontos por derrota na fase suíça (geralmente 0 ou negativo)
 *   playoffWin:    number,  // pontos por vitória no playoff
 *   playoffLoss:   number,  // pontos por derrota no playoff (geralmente 0)
 * }
 */

import { prisma } from "../database/prisma";

export interface ScoringConfig {
  swissWin: number;
  swissLoss: number;
  playoffWin: number;
  playoffLoss: number;
}

const DEFAULT_SCORING: ScoringConfig = {
  swissWin: 30,
  swissLoss: 0,
  playoffWin: 50,
  playoffLoss: 0,
};

/**
 * Lê a configuração de pontuação do preset do torneio.
 */
async function getScoringConfig(tournamentId: string): Promise<ScoringConfig> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { presetConfig: true, season: true, startDate: true },
  });

  const config = tournament?.presetConfig as any;
  const scoring = config?.scoring;

  if (!scoring) return DEFAULT_SCORING;

  return {
    swissWin: scoring.swissWin ?? DEFAULT_SCORING.swissWin,
    swissLoss: scoring.swissLoss ?? DEFAULT_SCORING.swissLoss,
    playoffWin: scoring.playoffWin ?? DEFAULT_SCORING.playoffWin,
    playoffLoss: scoring.playoffLoss ?? DEFAULT_SCORING.playoffLoss,
  };
}

/**
 * Determina a season do torneio.
 */
async function getTournamentSeason(tournamentId: string): Promise<string> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { season: true, startDate: true },
  });

  return tournament?.season ?? new Date().getFullYear().toString();
}

/**
 * Atualiza os pontos de ranking de um time após uma partida.
 * Cria a entrada no ranking se não existir.
 */
async function applyPoints(
  teamId: string,
  season: string,
  pointsDelta: number,
  isWin: boolean,
): Promise<void> {
  const existing = await prisma.rankingSnapshot.findFirst({
    where: { teamId, season },
  });

  if (existing) {
    await prisma.rankingSnapshot.update({
      where: { id: existing.id },
      data: {
        points: Math.max(0, existing.points + pointsDelta),
        wins: isWin ? existing.wins + 1 : existing.wins,
        losses: isWin ? existing.losses : existing.losses + 1,
        lastPointsDelta: pointsDelta,
        // Salvar posição atual como anterior antes de reordenar
        previousPosition: existing.position,
      },
    });
  } else {
    // Criar entrada se não existe
    const count = await prisma.rankingSnapshot.count({ where: { season } });
    await prisma.rankingSnapshot.create({
      data: {
        teamId,
        season,
        position: count + 1,
        previousPosition: null,
        points: Math.max(0, pointsDelta),
        wins: isWin ? 1 : 0,
        losses: isWin ? 0 : 1,
        titles: 0,
        lastPointsDelta: pointsDelta,
        snapshotAt: new Date(),
      },
    });
  }
}

/**
 * Atualiza pontos após resultado de partida Swiss.
 */
export async function applySwissMatchPoints(
  tournamentId: string,
  winnerId: string,
  loserId: string,
): Promise<void> {
  try {
    const [scoring, season] = await Promise.all([
      getScoringConfig(tournamentId),
      getTournamentSeason(tournamentId),
    ]);

    await Promise.all([
      applyPoints(winnerId, season, scoring.swissWin, true),
      applyPoints(loserId, season, scoring.swissLoss, false),
    ]);

    console.log(
      `[Ranking] Swiss: +${scoring.swissWin}pts para vencedor, +${scoring.swissLoss}pts para perdedor (season: ${season})`
    );
  } catch (err) {
    console.error(`[Ranking] Erro ao aplicar pontos Swiss:`, err);
  }
}

/**
 * Atualiza pontos após resultado de partida de Playoff.
 */
export async function applyPlayoffMatchPoints(
  tournamentId: string,
  winnerId: string,
  loserId: string,
  bracketPosition: string,
): Promise<void> {
  try {
    const [scoring, season] = await Promise.all([
      getScoringConfig(tournamentId),
      getTournamentSeason(tournamentId),
    ]);

    // Na Final, aplicar pontos de título ao vencedor
    const isFinal = bracketPosition === "FINAL";

    await Promise.all([
      applyPoints(winnerId, season, scoring.playoffWin, true),
      applyPoints(loserId, season, scoring.playoffLoss, false),
    ]);

    // Marcar campeão com título
    if (isFinal) {
      const entry = await prisma.rankingSnapshot.findFirst({
        where: { teamId: winnerId, season },
      });
      if (entry) {
        await prisma.rankingSnapshot.update({
          where: { id: entry.id },
          data: { titles: entry.titles + 1 },
        });
        console.log(`[Ranking] 🏆 Título adicionado ao campeão!`);
      }
    }

    console.log(
      `[Ranking] Playoff ${bracketPosition}: +${scoring.playoffWin}pts vencedor, +${scoring.playoffLoss}pts perdedor`
    );
  } catch (err) {
    console.error(`[Ranking] Erro ao aplicar pontos Playoff:`, err);
  }
}

/**
 * Recalcula posições do ranking após atualização de pontos.
 * Atualiza o campo `position` de todos os entries da season.
 */
export async function recalculateRankingPositions(season: string): Promise<void> {
  try {
    const entries = await prisma.rankingSnapshot.findMany({
      where: { season },
      orderBy: [{ points: "desc" }, { wins: "desc" }],
    });

    await prisma.$transaction(
      entries.map((entry, index) =>
        prisma.rankingSnapshot.update({
          where: { id: entry.id },
          data: { position: index + 1 },
        })
      )
    );
  } catch (err) {
    console.error(`[Ranking] Erro ao recalcular posições:`, err);
  }
}

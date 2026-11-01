/**
 * Swiss Classification Service — Atualização Automática de Classificados
 *
 * Este serviço gerencia a classificação progressiva conforme equipes atingem 3 vitórias.
 * As posições são calculadas em tempo real usando critérios de desempate:
 * 1. Vitórias (desc)
 * 2. Saldo de rounds (desc)
 * 3. Derrotas (asc)
 */

import { prisma } from "../database/prisma";

export const CLASSIFICATION_THRESHOLD = 3; // Vitórias necessárias para classificar

/**
 * Recalcula e atualiza as posições finais de todos os times classificados.
 * Chamado automaticamente após cada resultado de partida Swiss.
 */
export async function updateClassifiedPositions(tournamentId: string): Promise<void> {
  // Buscar todos os times que já têm 3+ vitórias (classificados)
  const classified = await prisma.swissCampaign.findMany({
    where: {
      tournamentId,
      wins: { gte: CLASSIFICATION_THRESHOLD },
    },
    include: {
      team: { select: { id: true, name: true } },
    },
  });

  if (classified.length === 0) {
    console.log(`[Swiss] Nenhum time classificado ainda para ${tournamentId}`);
    return;
  }

  // Ordenar por critérios oficiais de desempate
  const sorted = classified.sort((a, b) => {
    // 1º critério: mais vitórias
    if (b.wins !== a.wins) return b.wins - a.wins;

    // 2º critério: melhor saldo de rounds
    if (b.roundDiff !== a.roundDiff) return b.roundDiff - a.roundDiff;

    // 3º critério: menos derrotas
    if (a.losses !== b.losses) return a.losses - b.losses;

    // 4º critério (tiebreaker final): ID alfabético
    return a.teamId.localeCompare(b.teamId);
  });

  // Atualizar finalPosition para os classificados
  const updates = sorted.map((campaign, index) => {
    const position = index + 1;
    return prisma.swissCampaign.update({
      where: { id: campaign.id },
      data: { 
        finalPosition: position,
        isEliminated: false, // Garantir que classificados não estão marcados como eliminados
      },
    });
  });

  await prisma.$transaction(updates);

  console.log(
    `[Swiss] Atualizado: ${sorted.length} classificados para ${tournamentId}`,
    sorted.slice(0, 5).map((c, i) => 
      `${i + 1}º ${c.team.name} (${c.wins}-${c.losses}, +${c.roundDiff})`
    )
  );
}

/**
 * Recalcula todas as posições finais (classificados e eliminados).
 * Usado apenas no finalize manual do Swiss.
 */
export async function finalizeAllPositions(
  tournamentId: string,
  classifiedCount: number
): Promise<{ classified: number; eliminated: number }> {
  const allCampaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId },
    include: {
      team: { select: { id: true, name: true } },
    },
  });

  // Ordenar TODOS os times pelos mesmos critérios
  const sorted = allCampaigns.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.roundDiff !== a.roundDiff) return b.roundDiff - a.roundDiff;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return a.teamId.localeCompare(b.teamId);
  });

  // Atribuir posições e marcar classificados/eliminados
  const updates = sorted.map((campaign, index) => {
    const position = index + 1;
    const isClassified = position <= classifiedCount;

    return prisma.swissCampaign.update({
      where: { id: campaign.id },
      data: {
        finalPosition: position,
        isEliminated: !isClassified,
      },
    });
  });

  await prisma.$transaction(updates);

  const classified = sorted.filter((_, i) => i < classifiedCount);
  const eliminated = sorted.filter((_, i) => i >= classifiedCount);

  console.log(
    `[Swiss] Finalizado: ${classified.length} classificados, ${eliminated.length} eliminados`
  );

  return {
    classified: classified.length,
    eliminated: eliminated.length,
  };
}

/**
 * Retorna a classificação atual do Swiss, incluindo times ainda em disputa.
 */
export async function getCurrentStandings(tournamentId: string) {
  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId },
    include: {
      team: { select: { id: true, name: true, tag: true, logoUrl: true, slug: true } },
    },
  });

  // Ordenar por critérios oficiais
  const sorted = campaigns.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.roundDiff !== a.roundDiff) return b.roundDiff - a.roundDiff;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return a.teamId.localeCompare(b.teamId);
  });

  return sorted.map((campaign, index) => ({
    position: index + 1,
    team: campaign.team,
    wins: campaign.wins,
    losses: campaign.losses,
    roundDiff: campaign.roundDiff,
    isClassified: campaign.wins >= CLASSIFICATION_THRESHOLD,
    isEliminated: campaign.isEliminated,
    finalPosition: campaign.finalPosition,
  }));
}

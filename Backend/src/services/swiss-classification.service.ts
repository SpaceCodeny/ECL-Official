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
 * Verifica se temos 12 classificados + 4 convidados e cria as partidas RO16 automaticamente.
 * Retorna true se as partidas foram criadas.
 */
export async function autoGeneratePlayoffMatches(tournamentId: string): Promise<boolean> {
  // 1. Verificar se as partidas já foram criadas
  const existingMatches = await prisma.match.count({
    where: { tournamentId, bracketPosition: { not: null } },
  });

  if (existingMatches > 0) {
    console.log(`[Swiss] Partidas de playoff já existem para ${tournamentId}`);
    return false;
  }

  // 2. Verificar convidados (devem ser exatamente 4)
  const invitedTeams = await prisma.invitedTeam.findMany({
    where: { tournamentId },
    orderBy: { bracketSlot: "asc" },
  });

  if (invitedTeams.length !== 4) {
    console.log(`[Swiss] Aguardando 4 convidados (atual: ${invitedTeams.length})`);
    return false;
  }

  // 3. Verificar classificados (devem ser pelo menos 12)
  const classifiedCount = await prisma.swissCampaign.count({
    where: {
      tournamentId,
      finalPosition: { not: null },
    },
  });

  if (classifiedCount < 12) {
    console.log(`[Swiss] Aguardando 12 classificados (atual: ${classifiedCount})`);
    return false;
  }

  console.log(`[Swiss] ✅ 16 times completos! Gerando partidas RO16 automaticamente...`);

  // 4. Buscar configuração do preset e a stage de PLAYOFF no banco
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { preset: true },
  });

  if (!tournament?.preset?.config) {
    console.error(`[Swiss] Erro: preset não encontrado para ${tournamentId}`);
    return false;
  }

  // Buscar ou criar a stage de PLAYOFF no banco
  let playoffStage = await prisma.tournamentStage.findFirst({
    where: { tournamentId, type: "PLAYOFF" },
  });

  if (!playoffStage) {
    console.log(`[Swiss] Stage PLAYOFF não encontrada — criando automaticamente...`);

    const lastStage = await prisma.tournamentStage.findFirst({
      where: { tournamentId },
      orderBy: { order: "desc" },
    });

    playoffStage = await prisma.tournamentStage.create({
      data: {
        tournamentId,
        name: "Playoffs",
        type: "PLAYOFF",
        order: (lastStage?.order ?? 0) + 1,
        seriesFormat: "BO3",
      },
    });

    console.log(`[Swiss] Stage PLAYOFF criada automaticamente: ${playoffStage.id}`);
  }

  // 5. Construir mapa seed → teamId usando a mesma lógica do bracket
  const INVITED_SEEDS = [1, 8, 4, 5];
  const swissSeeds = Array.from({ length: 16 }, (_, i) => i + 1)
    .filter((seed) => !INVITED_SEEDS.includes(seed));

  const teamBySeed = new Map<number, string>();

  // Convidados
  for (const inv of invitedTeams) {
    const seed = INVITED_SEEDS[(inv.bracketSlot - 1)] ?? (inv.bracketSlot * 8 - 7);
    teamBySeed.set(seed, inv.teamId);
  }

  // Classificados
  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId, finalPosition: { not: null } },
    orderBy: { finalPosition: "asc" },
    take: 12,
  });

  for (const camp of campaigns) {
    const idx = (camp.finalPosition ?? 99) - 1;
    const seed = swissSeeds[idx];
    if (seed !== undefined) {
      teamBySeed.set(seed, camp.teamId);
    }
  }

  // 6. Criar as 8 partidas RO16
  const SEED_BY_POSITION: Record<number, number> = {
    1: 1, 2: 16, 3: 8, 4: 9, 5: 4, 6: 13, 7: 5, 8: 12,
    9: 2, 10: 15, 11: 7, 12: 10, 13: 3, 14: 14, 15: 6, 16: 11,
  };

  const matchesToCreate = [];
  for (let pos = 1; pos <= 8; pos++) {
    const seedA = SEED_BY_POSITION[pos * 2 - 1]!;
    const seedB = SEED_BY_POSITION[pos * 2]!;

    const teamAId = teamBySeed.get(seedA);
    const teamBId = teamBySeed.get(seedB);

    if (!teamAId || !teamBId) {
      console.error(`[Swiss] Erro: seeds ${seedA} ou ${seedB} sem time atribuído`);
      return false;
    }

    matchesToCreate.push({
      tournamentId,
      stageId: playoffStage.id,
      bracketPosition: `RO16-${pos}`,
      teamAId,
      teamBId,
      status: "SCHEDULED",
      seriesFormat: "BO3",
      scheduledAt: null,
    });
  }

  // 7. Criar no banco em transação
  await prisma.$transaction(
    matchesToCreate.map((data) => prisma.match.create({ data }))
  );

  console.log(`[Swiss] ✅ ${matchesToCreate.length} partidas RO16 criadas automaticamente!`);
  return true;
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

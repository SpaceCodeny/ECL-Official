/**
 * Bracket Generator Service
 * 
 * Gera chaveamentos de playoffs com 16 equipes:
 * - 4 equipes convidadas (classificação direta)
 * - 12 equipes classificadas da fase suíça
 * 
 * Regras especiais:
 * - Cada convidada ocupa um quadrante diferente
 * - Time 3-0 enfrenta convidada específica (configurável)
 * - Evita confrontos repetidos da fase suíça quando possível
 */

import { prisma } from "../database/prisma";
import type { SeriesFormat, MatchStatus } from "@prisma/client";

interface InvitedTeamData {
  teamId: string;
  bracketSlot: number;
  reservedOpponent?: string;
}

interface SwissQualified {
  teamId: string;
  finalPosition: number;
  wins: number;
  losses: number;
}

interface BracketSeed {
  position: string; // "RO16-1", "RO16-2", etc.
  teamId: string | null;
  placeholder?: string; // "Convidado 1", "Classificado 3-0"
}

/**
 * Gera o bracket de 16 equipes para os playoffs
 */
export async function generatePlayoffBracket(
  tournamentId: string,
  presetConfig: any
): Promise<BracketSeed[]> {
  // 1. Busca equipes convidadas
  const invitedTeams = await prisma.invitedTeam.findMany({
    where: { tournamentId },
    orderBy: { bracketSlot: "asc" },
    include: {
      team: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (invitedTeams.length !== 4) {
    throw new Error(
      `Esperadas 4 equipes convidadas, mas encontradas ${invitedTeams.length}`
    );
  }

  // 2. Busca classificados da fase suíça (top 12)
  const swissClassified = await prisma.swissCampaign.findMany({
    where: {
      tournamentId,
      finalPosition: { lte: 12 },
    },
    orderBy: { finalPosition: "asc" },
  });

  if (swissClassified.length !== 12) {
    throw new Error(
      `Esperados 12 classificados da fase suíça, mas encontrados ${swissClassified.length}`
    );
  }

  // 3. Identifica o time 3-0 (se houver)
  const perfect3_0 = swissClassified.find((c) => c.wins === 3 && c.losses === 0);

  // 4. Verifica regra especial do preset
  const specialRule = presetConfig?.bracket?.specialRules?.perfect3_0_vs_invited;
  let reserved3_0_slot: number | null = null;

  if (specialRule?.enabled && perfect3_0) {
    reserved3_0_slot = specialRule.invitedSlot; // 1-4
    console.log(
      `[Bracket] Regra especial ativada: Time 3-0 enfrentará Convidado ${reserved3_0_slot}`
    );
  }

  // 5. Distribui as equipes nas 16 posições
  const seeds: BracketSeed[] = [];

  // Posições fixas dos convidados (1 por quadrante)
  // Quadrante A: posições 1, 16
  // Quadrante B: posições 8, 9
  // Quadrante C: posições 4, 13
  // Quadrante D: posições 5, 12

  const invitedPositions = [1, 8, 4, 5]; // Seeds dos 4 quadrantes

  // Mapeia convidados para suas posições
  const invitedMap = new Map<number, string>();
  for (let i = 0; i < 4; i++) {
    invitedMap.set(invitedPositions[i]!, invitedTeams[i]!.teamId);
  }

  // Remove o time 3-0 da lista de classificados normais se há regra especial
  const normalClassified = perfect3_0 && reserved3_0_slot
    ? swissClassified.filter((c) => c.teamId !== perfect3_0.teamId)
    : swissClassified;

  // Posições disponíveis para classificados (exceto as dos convidados)
  const allPositions = Array.from({ length: 16 }, (_, i) => i + 1);
  const classifiedPositions = allPositions.filter(
    (pos) => !invitedPositions.includes(pos)
  );

  // Distribui classificados
  let classifiedIndex = 0;

  for (let position = 1; position <= 16; position++) {
    if (invitedPositions.includes(position)) {
      // Posição de convidado
      const teamId = invitedMap.get(position)!;
      seeds.push({
        position: `RO16-${position}`,
        teamId,
        placeholder: `Convidado ${invitedPositions.indexOf(position) + 1}`,
      });
    } else {
      // Posição de classificado
      // Verifica se é a posição reservada para o time 3-0
      const invitedSlotPosition = reserved3_0_slot
        ? getOpponentPosition(invitedPositions[reserved3_0_slot - 1]!)
        : null;

      if (perfect3_0 && position === invitedSlotPosition) {
        seeds.push({
          position: `RO16-${position}`,
          teamId: perfect3_0.teamId,
          placeholder: "Classificado 3-0",
        });
      } else {
        const classified = normalClassified[classifiedIndex];
        if (classified) {
          seeds.push({
            position: `RO16-${position}`,
            teamId: classified.teamId,
            placeholder: `${classified.finalPosition}º Classificado`,
          });
          classifiedIndex++;
        }
      }
    }
  }

  return seeds;
}

/**
 * Retorna a posição do adversário no bracket de eliminação simples
 */
function getOpponentPosition(seed: number): number {
  // Em um bracket de 16:
  // Seed 1 enfrenta Seed 16
  // Seed 2 enfrenta Seed 15
  // ...
  return 17 - seed;
}

/**
 * Cria as partidas das oitavas de final no banco
 */
export async function createRoundOf16Matches(
  tournamentId: string,
  stageId: string,
  seeds: BracketSeed[],
  seriesFormat: SeriesFormat
): Promise<void> {
  const matches: Array<{
    teamAId: string | null;
    teamBId: string | null;
    position: string;
  }> = [];

  // Agrupa seeds em pares (1 vs 16, 2 vs 15, etc.)
  for (let i = 0; i < 8; i++) {
    const seedA = seeds[i]!;
    const seedB = seeds[15 - i]!;

    matches.push({
      teamAId: seedA.teamId,
      teamBId: seedB.teamId,
      position: `RO16-${i + 1}`,
    });
  }

  // Cria as partidas no banco
  for (const match of matches) {
    // Se ambos os times estão definidos, cria a partida
    if (match.teamAId && match.teamBId) {
      await prisma.match.create({
        data: {
          tournamentId,
          stageId,
          teamAId: match.teamAId,
          teamBId: match.teamBId,
          seriesFormat,
          status: "SCHEDULED" as MatchStatus,
          bracketPosition: match.position,
        },
      });
    } else {
      console.log(
        `[Bracket] Partida ${match.position} ainda não pode ser criada (times pendentes)`
      );
    }
  }

  console.log(`[Bracket] ${matches.length} partidas das oitavas criadas`);
}

/**
 * Avança o vencedor para a próxima fase
 */
export async function advanceWinnerToNextRound(
  matchId: string,
  winnerTeamId: string
): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { bracketPosition: true, stageId: true, tournamentId: true },
  });

  if (!match?.bracketPosition) {
    throw new Error("Partida não possui posição no bracket");
  }

  // Determina a próxima fase
  const nextPosition = calculateNextBracketPosition(match.bracketPosition);

  if (!nextPosition) {
    console.log("[Bracket] Final alcançada, não há próxima fase");
    return;
  }

  // Busca ou cria a partida da próxima fase
  const nextMatch = await prisma.match.findFirst({
    where: {
      tournamentId: match.tournamentId,
      bracketPosition: nextPosition,
    },
  });

  if (nextMatch) {
    // Determina se o vencedor vai para teamA ou teamB
    const isTeamA = shouldGoToTeamA(match.bracketPosition);

    await prisma.match.update({
      where: { id: nextMatch.id },
      data: isTeamA ? { teamAId: winnerTeamId } : { teamBId: winnerTeamId },
    });

    console.log(`[Bracket] Time ${winnerTeamId} avançou para ${nextPosition}`);
  } else {
    console.log(
      `[Bracket] Partida ${nextPosition} ainda não existe (será criada automaticamente)`
    );
  }
}

/**
 * Calcula a próxima posição no bracket
 */
function calculateNextBracketPosition(currentPosition: string): string | null {
  // RO16-1 → QF-1
  // RO16-2 → QF-1
  // RO16-3 → QF-2
  // QF-1 → SF-1
  // SF-1 → FINAL

  if (currentPosition.startsWith("RO16-")) {
    const matchNum = parseInt(currentPosition.split("-")[1]!);
    const qfNum = Math.ceil(matchNum / 2);
    return `QF-${qfNum}`;
  }

  if (currentPosition.startsWith("QF-")) {
    const matchNum = parseInt(currentPosition.split("-")[1]!);
    const sfNum = Math.ceil(matchNum / 2);
    return `SF-${sfNum}`;
  }

  if (currentPosition.startsWith("SF-")) {
    return "FINAL";
  }

  return null; // Final não tem próxima
}

/**
 * Determina se o vencedor vai para teamA ou teamB da próxima partida
 */
function shouldGoToTeamA(currentPosition: string): boolean {
  // Posições ímpares vão para teamA, pares para teamB
  const matchNum = parseInt(currentPosition.split("-")[1]!);
  return matchNum % 2 === 1;
}

/**
 * Valida se o bracket está completo e consistente
 */
export async function validateBracket(tournamentId: string): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Verifica equipes convidadas
  const invitedCount = await prisma.invitedTeam.count({
    where: { tournamentId },
  });

  if (invitedCount !== 4) {
    errors.push(`Esperadas 4 equipes convidadas, mas há ${invitedCount}`);
  }

  // Verifica classificados da fase suíça
  const classifiedCount = await prisma.swissCampaign.count({
    where: {
      tournamentId,
      finalPosition: { lte: 12 },
    },
  });

  if (classifiedCount !== 12) {
    errors.push(`Esperados 12 classificados, mas há ${classifiedCount}`);
  }

  // Verifica se há partidas duplicadas
  const matches = await prisma.match.findMany({
    where: { tournamentId },
    select: { teamAId: true, teamBId: true },
  });

  const matchSet = new Set<string>();
  for (const match of matches) {
    const key = [match.teamAId, match.teamBId].sort().join("-");
    if (matchSet.has(key)) {
      errors.push(`Partida duplicada: ${match.teamAId} vs ${match.teamBId}`);
    }
    matchSet.add(key);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Função principal que orquestra a geração completa do bracket
 */
export async function generateBracket(
  tournamentId: string,
  swissCampaigns: any[],
  invitedTeams: any[],
  preset: any
): Promise<any[]> {
  // Buscar ou criar stage de playoffs
  let playoffStage = await prisma.tournamentStage.findFirst({
    where: {
      tournamentId,
      type: "BRACKET",
    },
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

  // Gera as seeds do bracket
  const seeds = await generatePlayoffBracket(tournamentId, preset.config);

  // Cria as partidas das oitavas
  await createRoundOf16Matches(
    tournamentId,
    playoffStage.id,
    seeds,
    playoffStage.seriesFormat
  );

  // Retorna as partidas criadas
  const matches = await prisma.match.findMany({
    where: {
      tournamentId,
      bracketPosition: { not: null },
    },
    include: {
      teamA: true,
      teamB: true,
    },
  });

  return matches;
}

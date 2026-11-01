/**
 * Swiss Pairing Service — ECL MASTER EDITION
 *
 * REGRA OFICIAL:
 *   - 20 equipes, até 5 rodadas, MD1
 *   - 3 vitórias → CLASSIFICADO (para de jogar)
 *   - 3 derrotas  → ELIMINADO   (para de jogar)
 *   - 8 vagas pela fase suíça + 4 convidados = 12 playoffs
 *
 * CAMPANHAS POSSÍVEIS:
 *   Classificados: 3-0, 3-1, 3-2
 *   Eliminados:    0-3, 1-3, 2-3
 *   Em jogo:       0-0, 1-0, 0-1, 2-0, 1-1, 0-2, 2-1, 1-2, 2-2
 *
 * PAREAMENTO:
 *   1. Apenas times ATIVOS (wins < 3 E losses < 3) entram no pool
 *   2. Agrupa por campanha W-L
 *   3. Pareia dentro do grupo; floating para grupos ímpares
 *   4. Sem rematches (fallback aceita rematch se inevitável)
 *   5. Validação obrigatória antes de retornar
 */

import { prisma } from "../database/prisma";
import type { Team } from "@prisma/client";

export const WINS_TO_CLASSIFY = 3;
export const LOSSES_TO_ELIMINATE = 3;

interface TeamWithCampaign {
  teamId: string;
  team: Pick<Team, "id" | "name" | "slug">;
  wins: number;
  losses: number;
  roundDiff: number;
  opponentsIds: string[];
}

export interface SwissMatchPair {
  teamAId: string;
  teamBId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

export async function generateSwissPairings(
  tournamentId: string,
  roundNumber: number
): Promise<SwissMatchPair[]> {
  // Apenas times ATIVOS: wins < 3 E losses < 3
  const campaigns = await prisma.swissCampaign.findMany({
    where: {
      tournamentId,
      wins: { lt: WINS_TO_CLASSIFY },
      losses: { lt: LOSSES_TO_ELIMINATE },
    },
    include: {
      team: { select: { id: true, name: true, slug: true } },
    },
    orderBy: [{ wins: "desc" }, { roundDiff: "desc" }, { losses: "asc" }],
  });

  if (campaigns.length === 0) {
    throw new Error(
      `Rodada ${roundNumber}: Nenhum time ativo encontrado. ` +
      `Todos foram classificados ou eliminados?`
    );
  }

  if (campaigns.length % 2 !== 0) {
    throw new Error(
      `Rodada ${roundNumber}: Número ímpar de times ativos (${campaigns.length}). ` +
      `Impossível gerar pareamento completo.`
    );
  }

  const teams: TeamWithCampaign[] = campaigns.map((c) => ({
    teamId: c.teamId,
    team: c.team,
    wins: c.wins,
    losses: c.losses,
    roundDiff: c.roundDiff,
    opponentsIds: c.opponentsIds as string[],
  }));

  const pairs = buildPairings(teams, roundNumber);
  validatePairings(pairs, teams, roundNumber);
  return pairs;
}

// ─────────────────────────────────────────────────────────────────────────────
// ALGORITMO DE PAREAMENTO
// ─────────────────────────────────────────────────────────────────────────────

function buildPairings(teams: TeamWithCampaign[], roundNumber: number): SwissMatchPair[] {
  const matched = new Set<string>();
  const pairs: SwissMatchPair[] = [];

  // Grupos em ordem de qualidade (melhor campanha primeiro)
  const groups = buildGroups(teams);

  // Fase 1: parear dentro do mesmo grupo
  for (const group of groups) {
    pairWithinGroup(group, matched, pairs);
  }

  // Fase 2: floating — times sobrados de grupos ímpares
  // Percorre grupos do melhor para o pior; o sobrado "flutua" para o grupo abaixo
  for (let i = 0; i < groups.length; i++) {
    const floaters = groups[i]!.filter((t) => !matched.has(t.teamId));
    if (floaters.length === 0) continue;

    // Candidatos nos grupos adjacentes (abaixo primeiro, depois acima)
    const candidates = getAdjacentCandidates(groups, i, matched);

    for (const floater of floaters) {
      if (matched.has(floater.teamId)) continue;
      const opponent = findOpponent(floater, candidates, matched);
      if (opponent) {
        pairs.push({ teamAId: floater.teamId, teamBId: opponent.teamId });
        matched.add(floater.teamId);
        matched.add(opponent.teamId);
      }
    }
  }

  // Fase 3: qualquer sobrado restante (último recurso)
  const remaining = teams.filter((t) => !matched.has(t.teamId));
  if (remaining.length > 0) {
    console.warn(
      `[Swiss R${roundNumber}] Fase 3: ${remaining.length} times sem par após floating:`,
      remaining.map((t) => `${t.team.name}(${t.wins}-${t.losses})`).join(", ")
    );
    pairWithinGroup(remaining, matched, pairs);
  }

  return pairs;
}

function buildGroups(teams: TeamWithCampaign[]): TeamWithCampaign[][] {
  const map = new Map<string, TeamWithCampaign[]>();
  for (const t of teams) {
    const key = `${t.wins}-${t.losses}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      const [wa, la] = a.split("-").map(Number);
      const [wb, lb] = b.split("-").map(Number);
      return (wb! - wa!) || (la! - lb!);
    })
    .map(([, group]) => group);
}

function pairWithinGroup(
  group: TeamWithCampaign[],
  matched: Set<string>,
  pairs: SwissMatchPair[]
): void {
  const available = group
    .filter((t) => !matched.has(t.teamId))
    .sort((a, b) => b.roundDiff - a.roundDiff);

  for (let i = 0; i < available.length; i++) {
    const t1 = available[i]!;
    if (matched.has(t1.teamId)) continue;

    const rest = available.slice(i + 1);
    let opp = findOpponent(t1, rest, matched);
    // Fallback: aceita rematch
    if (!opp) opp = rest.find((c) => !matched.has(c.teamId)) ?? null;
    if (!opp) continue;

    pairs.push({ teamAId: t1.teamId, teamBId: opp.teamId });
    matched.add(t1.teamId);
    matched.add(opp.teamId);
  }
}

function getAdjacentCandidates(
  groups: TeamWithCampaign[][],
  idx: number,
  matched: Set<string>
): TeamWithCampaign[] {
  // Abaixo primeiro
  for (let i = idx + 1; i < groups.length; i++) {
    const c = groups[i]!.filter((t) => !matched.has(t.teamId));
    if (c.length > 0) return c;
  }
  // Acima como fallback
  for (let i = idx - 1; i >= 0; i--) {
    const c = groups[i]!.filter((t) => !matched.has(t.teamId));
    if (c.length > 0) return c;
  }
  return [];
}

function findOpponent(
  team: TeamWithCampaign,
  candidates: TeamWithCampaign[],
  matched: Set<string>
): TeamWithCampaign | null {
  return (
    candidates
      .filter((c) => !matched.has(c.teamId) && c.teamId !== team.teamId)
      .filter((c) => !team.opponentsIds.includes(c.teamId))
      .sort((a, b) => b.roundDiff - a.roundDiff)[0] ?? null
  );
}

function validatePairings(
  pairs: SwissMatchPair[],
  teams: TeamWithCampaign[],
  roundNumber: number
): void {
  const expected = teams.length / 2;
  if (pairs.length !== expected) {
    throw new Error(
      `[Swiss R${roundNumber}] Validação falhou: ${pairs.length} confrontos gerados, ` +
      `esperado ${expected} (${teams.length} times ativos)`
    );
  }

  const seen = new Set<string>();
  for (const p of pairs) {
    if (!p.teamAId || !p.teamBId)
      throw new Error(`[Swiss R${roundNumber}] Confronto com teamId nulo`);
    if (p.teamAId === p.teamBId)
      throw new Error(`[Swiss R${roundNumber}] Time pareado consigo mesmo: ${p.teamAId}`);
    if (seen.has(p.teamAId) || seen.has(p.teamBId)) {
      const name = teams.find((t) => seen.has(t.teamId) && (t.teamId === p.teamAId || t.teamId === p.teamBId))?.team.name;
      throw new Error(`[Swiss R${roundNumber}] Time em mais de um confronto: ${name}`);
    }
    seen.add(p.teamAId);
    seen.add(p.teamBId);
  }

  console.log(
    `[Swiss R${roundNumber}] ✓ ${pairs.length} confrontos válidos, ${teams.length} times ativos`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────────────────────────────────────

export async function finalizeSwissStandings(
  tournamentId: string,
  classifiedCount: number
): Promise<void> {
  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId },
    orderBy: [{ wins: "desc" }, { roundDiff: "desc" }, { losses: "asc" }],
  });

  await prisma.$transaction(
    campaigns.map((c, i) =>
      prisma.swissCampaign.update({
        where: { id: c.id },
        data: { finalPosition: i + 1 },
      })
    )
  );
}

export async function calculateSwissStandings(
  tournamentId: string
): Promise<Array<{ teamId: string; position: number }>> {
  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId },
    orderBy: [{ wins: "desc" }, { roundDiff: "desc" }, { losses: "asc" }],
  });
  return campaigns.map((c, i) => ({ teamId: c.teamId, position: i + 1 }));
}

export { calculateSwissStandings as checkSwissElimination };
export { finalizeSwissStandings as updateSwissCampaign };
export type { SwissMatchPair as SwissMatch };

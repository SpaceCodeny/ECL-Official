/**
 * Auditoria completa: mostra exatamente quais campanhas existem
 * em cada rodada (W-L antes de cada partida), para calibrar o frontend.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TID = "5f117fad-c3a9-4fcd-a410-fed4efdcd3f2";

async function main() {
  const rounds = await prisma.swissRound.findMany({
    where: { tournamentId: TID },
    include: {
      matches: {
        select: {
          id: true,
          teamAId: true,
          teamBId: true,
          winnerTeamId: true,
          status: true,
          teamA: { select: { tag: true } },
          teamB: { select: { tag: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { roundNumber: "asc" },
  });

  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId: TID },
    include: { team: { select: { tag: true } } },
  });

  // Construir histórico: campanha de cada time ANTES de cada partida
  const hist = new Map<string, { matchId: string; wBefore: number; lBefore: number }[]>();
  campaigns.forEach((c) => hist.set(c.teamId, []));

  for (const round of rounds) {
    for (const match of round.matches) {
      if (!hist.has(match.teamAId)) hist.set(match.teamAId, []);
      if (!hist.has(match.teamBId)) hist.set(match.teamBId, []);

      const hA = hist.get(match.teamAId)!;
      const hB = hist.get(match.teamBId)!;

      const allMatches = rounds.flatMap((r) => r.matches);

      const wA = hA.filter((e) => allMatches.find((m) => m.id === e.matchId)?.winnerTeamId === match.teamAId).length;
      const lA = hA.filter((e) => {
        const m = allMatches.find((x) => x.id === e.matchId);
        return m?.winnerTeamId !== null && m?.winnerTeamId !== match.teamAId;
      }).length;

      const wB = hB.filter((e) => allMatches.find((m) => m.id === e.matchId)?.winnerTeamId === match.teamBId).length;
      const lB = hB.filter((e) => {
        const m = allMatches.find((x) => x.id === e.matchId);
        return m?.winnerTeamId !== null && m?.winnerTeamId !== match.teamBId;
      }).length;

      hA.push({ matchId: match.id, wBefore: wA, lBefore: lA });
      hB.push({ matchId: match.id, wBefore: wB, lBefore: lB });
    }
  }

  // Por rodada: quais campanhas W-L realmente aparecem
  console.log("\n=== CAMPANHAS REAIS POR RODADA ===\n");

  for (const round of rounds) {
    const campaignSet = new Set<string>();
    const campaignDetails = new Map<string, string[]>(); // chave → ["TAG1 vs TAG2", ...]

    for (const match of round.matches) {
      const hA = hist.get(match.teamAId)!;
      const entry = hA.find((e) => e.matchId === match.id);
      const wA = entry?.wBefore ?? 0;
      const lA = entry?.lBefore ?? 0;

      const key = `${wA}-${lA}`;
      campaignSet.add(key);
      if (!campaignDetails.has(key)) campaignDetails.set(key, []);
      campaignDetails.get(key)!.push(`${match.teamA.tag} vs ${match.teamB.tag}`);
    }

    console.log(`Rodada ${round.roundNumber}:`);
    for (const [key, matches] of [...campaignDetails.entries()].sort()) {
      console.log(`  [${key}] — ${matches.join(" | ")}`);
    }
    console.log();
  }

  // Campanhas finais (W-L após 5 rodadas)
  console.log("=== DISTRIBUIÇÃO FINAL DE CAMPANHAS ===\n");
  const distribution = new Map<string, string[]>();
  campaigns.forEach((c) => {
    const key = `${c.wins}-${c.losses}`;
    if (!distribution.has(key)) distribution.set(key, []);
    distribution.get(key)!.push(c.team.tag ?? "?");
  });

  for (const [key, tags] of [...distribution.entries()].sort((a, b) => {
    const [wa, la] = a[0].split("-").map(Number);
    const [wb, lb] = b[0].split("-").map(Number);
    return (wb! - wa!) || (la! - lb!);
  })) {
    console.log(`  ${key.padEnd(5)} (${tags.length} times): ${tags.join(", ")}`);
  }

  // Resumo por rodada: quais grupos de campanha o frontend precisa exibir
  console.log("\n=== GRUPOS NECESSÁRIOS POR RODADA (para o frontend) ===\n");
  for (const round of rounds) {
    const groups = new Set<string>();
    for (const match of round.matches) {
      const hA = hist.get(match.teamAId)!;
      const entry = hA.find((e) => e.matchId === match.id);
      groups.add(`${entry?.wBefore ?? 0}-${entry?.lBefore ?? 0}`);
    }
    const sorted = [...groups].sort((a, b) => {
      const [wa, la] = a.split("-").map(Number);
      const [wb, lb] = b.split("-").map(Number);
      return (wb! - wa!) || (la! - lb!);
    });
    console.log(`  R${round.roundNumber}: ${sorted.join(", ")}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

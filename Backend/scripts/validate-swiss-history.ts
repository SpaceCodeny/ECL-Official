/**
 * Validação do histórico Swiss - simula exatamente o que o frontend faz
 * para verificar se a lógica de reconstrução está correta.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TOURNAMENT_ID = "5f117fad-c3a9-4fcd-a410-fed4efdcd3f2";

async function main() {
  // 1. Buscar dados exatamente como a API retorna
  const rounds = await prisma.swissRound.findMany({
    where: { tournamentId: TOURNAMENT_ID },
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
          teamA: { select: { id: true, name: true, tag: true, logoUrl: true, slug: true } },
          teamB: { select: { id: true, name: true, tag: true, logoUrl: true, slug: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { roundNumber: "asc" },
  });

  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId: TOURNAMENT_ID },
    include: { team: { select: { id: true, name: true, tag: true, slug: true, logoUrl: true } } },
  });

  // 2. Simular a lógica do frontend: construir histórico
  type HistEntry = { matchId: string; wBefore: number; lBefore: number };
  const hist = new Map<string, HistEntry[]>();
  campaigns.forEach((c) => hist.set(c.teamId, []));

  for (const round of rounds) {
    for (const match of round.matches) {
      if (!hist.has(match.teamAId)) hist.set(match.teamAId, []);
      if (!hist.has(match.teamBId)) hist.set(match.teamBId, []);

      const hA = hist.get(match.teamAId)!;
      const hB = hist.get(match.teamBId)!;

      const wA = hA.filter((e) => {
        const m = rounds.flatMap((r) => r.matches).find((x) => x.id === e.matchId)!;
        return m.winnerTeamId === match.teamAId;
      }).length;
      const lA = hA.filter((e) => {
        const m = rounds.flatMap((r) => r.matches).find((x) => x.id === e.matchId)!;
        return m.winnerTeamId !== null && m.winnerTeamId !== match.teamAId;
      }).length;
      const wB = hB.filter((e) => {
        const m = rounds.flatMap((r) => r.matches).find((x) => x.id === e.matchId)!;
        return m.winnerTeamId === match.teamBId;
      }).length;
      const lB = hB.filter((e) => {
        const m = rounds.flatMap((r) => r.matches).find((x) => x.id === e.matchId)!;
        return m.winnerTeamId !== null && m.winnerTeamId !== match.teamBId;
      }).length;

      hA.push({ matchId: match.id, wBefore: wA, lBefore: lA });
      hB.push({ matchId: match.id, wBefore: wB, lBefore: lB });
    }
  }

  // 3. Imprimir histórico completo de cada time
  console.log("\n" + "═".repeat(80));
  console.log("HISTÓRICO COMPLETO POR TIME");
  console.log("═".repeat(80));

  const allMatches = rounds.flatMap((r) =>
    r.matches.map((m) => ({ ...m, roundNumber: r.roundNumber }))
  );

  let allCorrect = true;

  for (const campaign of campaigns.sort((a, b) => b.wins - a.wins || a.losses - b.losses)) {
    const teamId = campaign.teamId;
    const entries = hist.get(teamId) ?? [];

    console.log(`\n${campaign.team.name.toUpperCase()} (${campaign.team.tag}) — Final: ${campaign.wins}-${campaign.losses}`);
    console.log("─".repeat(60));

    let expectedW = 0;
    let expectedL = 0;

    for (const entry of entries) {
      const match = allMatches.find((m) => m.id === entry.matchId)!;
      const opponent = match.teamAId === teamId ? match.teamB : match.teamA;
      const won = match.winnerTeamId === teamId;
      const result = match.winnerTeamId === null ? "⏳" : won ? "✅" : "❌";

      // Verificar se o W-L antes da partida está correto
      const correct = entry.wBefore === expectedW && entry.lBefore === expectedL;
      if (!correct) {
        allCorrect = false;
        console.log(
          `  R${match.roundNumber}: ${result} vs ${opponent.name} — ` +
          `esperado ${expectedW}-${expectedL}, got ${entry.wBefore}-${entry.lBefore} ⚠️ ERRO`
        );
      } else {
        console.log(
          `  R${match.roundNumber}: ${result} vs ${opponent.name} — antes: ${entry.wBefore}-${entry.lBefore} ✓`
        );
      }

      if (match.winnerTeamId === teamId) expectedW++;
      else if (match.winnerTeamId !== null) expectedL++;
    }

    // Verificar campanha final
    const finalW = entries.filter((e) => {
      const m = allMatches.find((x) => x.id === e.matchId)!;
      return m.winnerTeamId === teamId;
    }).length;
    const finalL = entries.filter((e) => {
      const m = allMatches.find((x) => x.id === e.matchId)!;
      return m.winnerTeamId !== null && m.winnerTeamId !== teamId;
    }).length;

    const campaignMatch = finalW === campaign.wins && finalL === campaign.losses;
    if (!campaignMatch) {
      allCorrect = false;
      console.log(
        `  ⚠️  Campanha final calculada: ${finalW}-${finalL}, banco: ${campaign.wins}-${campaign.losses}`
      );
    }
  }

  console.log("\n" + "═".repeat(80));
  console.log("RESUMO");
  console.log("═".repeat(80));

  // Contar partidas por rodada
  for (const round of rounds) {
    const completed = round.matches.filter((m) => m.status === "COMPLETED").length;
    const scheduled = round.matches.filter((m) => m.status === "SCHEDULED").length;
    console.log(
      `Rodada ${round.roundNumber}: ${round.matches.length} partidas ` +
      `(${completed} concluídas, ${scheduled} pendentes) — isComplete: ${round.isComplete}`
    );
  }

  const totalMatches = rounds.reduce((s, r) => s + r.matches.length, 0);
  console.log(`\nTotal de partidas: ${totalMatches}`);
  console.log(`Total de times: ${campaigns.length}`);

  // Contar partidas por time
  const matchesPerTeam = new Map<string, number>();
  for (const round of rounds) {
    for (const m of round.matches) {
      if (m.status !== "COMPLETED") continue;
      matchesPerTeam.set(m.teamAId, (matchesPerTeam.get(m.teamAId) ?? 0) + 1);
      matchesPerTeam.set(m.teamBId, (matchesPerTeam.get(m.teamBId) ?? 0) + 1);
    }
  }

  const teamsWith5 = [...matchesPerTeam.values()].filter((v) => v === 5).length;
  const teamsWithLess = [...matchesPerTeam.entries()].filter(([, v]) => v < 5);

  console.log(`\nTimes com 5 partidas: ${teamsWith5}`);
  if (teamsWithLess.length > 0) {
    console.log("Times com menos de 5 partidas:");
    for (const [teamId, count] of teamsWithLess) {
      const c = campaigns.find((x) => x.teamId === teamId);
      console.log(`  ${c?.team.name ?? teamId}: ${count} partidas (${c?.wins}-${c?.losses})`);
    }
  }

  console.log(`\n${allCorrect ? "✅ TODOS OS HISTÓRICOS ESTÃO CORRETOS" : "⚠️  EXISTEM INCONSISTÊNCIAS"}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

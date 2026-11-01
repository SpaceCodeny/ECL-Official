/**
 * Completa rodadas 4 e 5 do Swiss (rodadas 1-3 já estão no banco)
 */
import { PrismaClient, MatchStatus } from "@prisma/client";
import { generateSwissPairings } from "../src/services/swiss-pairing.service";

const prisma = new PrismaClient();
const TOURNAMENT_ID = "5f117fad-c3a9-4fcd-a410-fed4efdcd3f2";

async function completeRound(roundNum: number, stageId: string) {
  console.log(`\n${"─".repeat(50)}`);
  console.log(`📍 RODADA ${roundNum}`);

  // Gerar pares
  const pairs = await generateSwissPairings(TOURNAMENT_ID, roundNum);
  console.log(`  Confrontos: ${pairs.length}`);

  // Criar rodada
  const round = await prisma.swissRound.upsert({
    where: { tournamentId_roundNumber: { tournamentId: TOURNAMENT_ID, roundNumber: roundNum } },
    create: { tournamentId: TOURNAMENT_ID, roundNumber: roundNum, isComplete: false },
    update: {},
  });

  // Criar partidas
  for (const p of pairs) {
    // Verificar se já existe
    const existing = await prisma.match.findFirst({
      where: { swissRoundId: round.id, teamAId: p.teamAId, teamBId: p.teamBId },
    });
    if (existing) continue;

    // Criar
    const match = await prisma.match.create({
      data: {
        tournamentId: TOURNAMENT_ID,
        stageId,
        swissRoundId: round.id,
        teamAId: p.teamAId,
        teamBId: p.teamBId,
        seriesFormat: "BO1",
        status: MatchStatus.SCHEDULED,
      },
      include: {
        teamA: { select: { id: true, name: true, tag: true } },
        teamB: { select: { id: true, name: true, tag: true } },
      },
    });

    // Simular resultado determinístico
    const seed = p.teamAId.charCodeAt(0) + p.teamBId.charCodeAt(0) + roundNum;
    const teamAWins = seed % 2 === 0;
    const winnerId = teamAWins ? match.teamAId : match.teamBId;
    const loserId = teamAWins ? match.teamBId : match.teamAId;
    const winnerTag = teamAWins ? match.teamA.tag : match.teamB.tag;
    const loserTag = teamAWins ? match.teamB.tag : match.teamA.tag;

    await prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: match.id },
        data: { winnerTeamId: winnerId, scoreA: teamAWins ? 1 : 0, scoreB: teamAWins ? 0 : 1, status: MatchStatus.COMPLETED },
      });

      const winner = await tx.swissCampaign.findUnique({
        where: { tournamentId_teamId: { tournamentId: TOURNAMENT_ID, teamId: winnerId } },
      });
      if (winner) {
        await tx.swissCampaign.update({
          where: { id: winner.id },
          data: {
            wins: winner.wins + 1,
            roundsPlayed: winner.roundsPlayed + 1,
            roundDiff: winner.roundDiff + 1,
            opponentsIds: { push: loserId },
          },
        });
      }

      const loser = await tx.swissCampaign.findUnique({
        where: { tournamentId_teamId: { tournamentId: TOURNAMENT_ID, teamId: loserId } },
      });
      if (loser) {
        await tx.swissCampaign.update({
          where: { id: loser.id },
          data: {
            losses: loser.losses + 1,
            roundsPlayed: loser.roundsPlayed + 1,
            roundDiff: loser.roundDiff - 1,
            opponentsIds: { push: winnerId },
          },
        });
      }
    });

    console.log(`  ✓ ${winnerTag} VENCEU ${loserTag}`);
  }

  await prisma.swissRound.update({
    where: { id: round.id },
    data: { isComplete: true },
  });

  console.log(`  ✅ Rodada ${roundNum} completa`);
}

async function main() {
  const stage = await prisma.tournamentStage.findFirst({
    where: { tournamentId: TOURNAMENT_ID, type: "SWISS" },
  });
  if (!stage) throw new Error("Stage Swiss não encontrado");

  // Marcar rodada 3 como completa se não estiver
  const r3 = await prisma.swissRound.findUnique({
    where: { tournamentId_roundNumber: { tournamentId: TOURNAMENT_ID, roundNumber: 3 } },
  });
  if (r3 && !r3.isComplete) {
    await prisma.swissRound.update({ where: { id: r3.id }, data: { isComplete: true } });
    console.log("✓ Rodada 3 marcada como completa");
  }

  await completeRound(4, stage.id);
  await completeRound(5, stage.id);

  // Relatório final
  console.log(`\n${"═".repeat(50)}`);
  console.log("📊 RELATÓRIO FINAL");

  const matchCount = new Map<string, number>();
  const rounds = await prisma.swissRound.findMany({
    where: { tournamentId: TOURNAMENT_ID },
    include: { matches: true },
    orderBy: { roundNumber: "asc" },
  });

  let total = 0;
  for (const r of rounds) {
    total += r.matches.length;
    console.log(`  Rodada ${r.roundNumber}: ${r.matches.length} partidas`);
    for (const m of r.matches) {
      matchCount.set(m.teamAId, (matchCount.get(m.teamAId) ?? 0) + 1);
      matchCount.set(m.teamBId, (matchCount.get(m.teamBId) ?? 0) + 1);
    }
  }

  console.log(`  Total: ${total} partidas`);

  const allHave5 = [...matchCount.values()].every((v) => v === 5);
  console.log(`\n  Todos os 20 times com 5 partidas: ${allHave5 ? "✅ SIM" : "❌ NÃO"}`);

  if (!allHave5) {
    const campaigns = await prisma.swissCampaign.findMany({
      where: { tournamentId: TOURNAMENT_ID },
      include: { team: { select: { name: true, tag: true } } },
    });
    for (const [teamId, count] of matchCount.entries()) {
      if (count !== 5) {
        const c = campaigns.find((x) => x.teamId === teamId);
        console.log(`  ⚠️  ${c?.team.name}: ${count} partidas`);
      }
    }
  }

  console.log(`\n${total === 50 && allHave5 ? "✅ 50 partidas, todos com 5 jogos — PERFEITO" : "⚠️ Verificar inconsistências"}`);

  // Campanhas finais
  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId: TOURNAMENT_ID },
    include: { team: { select: { name: true } } },
    orderBy: [{ wins: "desc" }, { losses: "asc" }],
  });

  console.log("\n  CAMPANHAS FINAIS:");
  campaigns.forEach((c) => console.log(`    ${c.team.name.padEnd(22)} ${c.wins}-${c.losses}`));
}

main()
  .catch((e) => { console.error("\n❌ ERRO:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());

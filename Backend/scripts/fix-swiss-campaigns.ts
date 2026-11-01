/**
 * Recalcula todas as campanhas Swiss a partir dos resultados reais das partidas.
 * Fonte de verdade: tabela Match com swissRoundId.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TOURNAMENT_ID = "5f117fad-c3a9-4fcd-a410-fed4efdcd3f2";

async function main() {
  console.log("\n🔧 Recalculando campanhas a partir das partidas...\n");

  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId: TOURNAMENT_ID },
    include: { team: { select: { name: true, tag: true } } },
  });

  const rounds = await prisma.swissRound.findMany({
    where: { tournamentId: TOURNAMENT_ID },
    include: {
      matches: {
        where: { status: "COMPLETED" },
        select: { id: true, teamAId: true, teamBId: true, winnerTeamId: true, scoreA: true, scoreB: true },
      },
    },
    orderBy: { roundNumber: "asc" },
  });

  let fixed = 0;

  for (const campaign of campaigns) {
    const teamId = campaign.teamId;

    // Calcular wins, losses, roundsPlayed, roundDiff a partir das partidas
    let wins = 0;
    let losses = 0;
    let roundDiff = 0;
    const opponentsIds: string[] = [];

    for (const round of rounds) {
      for (const match of round.matches) {
        if (match.teamAId !== teamId && match.teamBId !== teamId) continue;

        const opponentId = match.teamAId === teamId ? match.teamBId : match.teamAId;
        const won = match.winnerTeamId === teamId;
        const diff = Math.abs((match.scoreA ?? 0) - (match.scoreB ?? 0));

        if (won) {
          wins++;
          roundDiff += diff;
        } else {
          losses++;
          roundDiff -= diff;
        }
        opponentsIds.push(opponentId);
      }
    }

    const roundsPlayed = wins + losses;
    const isEliminated = losses >= 3;

    // Comparar com banco
    if (
      campaign.wins !== wins ||
      campaign.losses !== losses ||
      campaign.roundsPlayed !== roundsPlayed ||
      campaign.roundDiff !== roundDiff
    ) {
      await prisma.swissCampaign.update({
        where: { id: campaign.id },
        data: { wins, losses, roundsPlayed, roundDiff, opponentsIds, isEliminated },
      });

      console.log(
        `✓ ${campaign.team.name.padEnd(22)} | banco: ${campaign.wins}-${campaign.losses} → correto: ${wins}-${losses}`
      );
      fixed++;
    }
  }

  if (fixed === 0) {
    console.log("✅ Todas as campanhas já estão corretas.");
  } else {
    console.log(`\n✅ ${fixed} campanha(s) corrigida(s).`);
  }

  // Mostrar resultado final
  const final = await prisma.swissCampaign.findMany({
    where: { tournamentId: TOURNAMENT_ID },
    include: { team: { select: { name: true, tag: true } } },
    orderBy: [{ wins: "desc" }, { losses: "asc" }],
  });

  console.log("\n=== CAMPANHAS FINAIS ===\n");
  final.forEach((c) => {
    const status =
      c.wins >= 3 ? "🟢 CLASSIFICADO" : c.losses >= 3 ? "🔴 ELIMINADO" : "⚪ ATIVO";
    console.log(`  ${c.team.name.padEnd(22)} ${c.wins}-${c.losses}  ${status}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

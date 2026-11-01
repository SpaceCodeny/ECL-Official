import { PrismaClient, MatchStatus } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Script para completar TODAS as partidas pendentes e gerar novas rodadas
 * com HISTÓRICO PERMANENTE
 */

async function completeAllPendingMatches() {
  const pending = await prisma.match.findMany({
    where: {
      swissRoundId: { not: null },
      status: MatchStatus.SCHEDULED
    },
    include: {
      teamA: { select: { id: true, name: true, tag: true } },
      teamB: { select: { id: true, name: true, tag: true } },
      swissRound: true
    }
  });

  console.log(`\n⚡ Completando ${pending.length} partidas pendentes...\n`);

  for (const match of pending) {
    const teamAWins = Math.random() > 0.5;
    const winnerId = teamAWins ? match.teamAId : match.teamBId;
    const loserId = teamAWins ? match.teamBId : match.teamAId;

    await prisma.$transaction(async (tx) => {
      // 1. Completar partida
      await tx.match.update({
        where: { id: match.id },
        data: {
          winnerTeamId: winnerId,
          scoreA: teamAWins ? 1 : 0,
          scoreB: teamAWins ? 0 : 1,
          status: MatchStatus.COMPLETED
        }
      });

      // 2. Atualizar campanha do vencedor
      const winnerCampaign = await tx.swissCampaign.findUnique({
        where: {
          tournamentId_teamId: {
            tournamentId: match.swissRound!.tournamentId,
            teamId: winnerId
          }
        }
      });

      if (winnerCampaign) {
        await tx.swissCampaign.update({
          where: { id: winnerCampaign.id },
          data: {
            wins: winnerCampaign.wins + 1,
            roundsPlayed: winnerCampaign.roundsPlayed + 1,
            roundDiff: winnerCampaign.roundDiff + 1,
            opponentsIds: [...winnerCampaign.opponentsIds, loserId]
          }
        });
      }

      // 3. Atualizar campanha do perdedor
      const loserCampaign = await tx.swissCampaign.findUnique({
        where: {
          tournamentId_teamId: {
            tournamentId: match.swissRound!.tournamentId,
            teamId: loserId
          }
        }
      });

      if (loserCampaign) {
        const newLosses = loserCampaign.losses + 1;
        await tx.swissCampaign.update({
          where: { id: loserCampaign.id },
          data: {
            losses: newLosses,
            roundsPlayed: loserCampaign.roundsPlayed + 1,
            roundDiff: loserCampaign.roundDiff - 1,
            opponentsIds: [...loserCampaign.opponentsIds, winnerId],
            isEliminated: newLosses >= 3
          }
        });
      }
    });

    const winner = teamAWins ? match.teamA.name : match.teamB.name;
    const loser = teamAWins ? match.teamB.name : match.teamA.name;
    console.log(`  ✓ Rodada ${match.swissRound?.roundNumber}: ${winner} VENCEU ${loser}`);
  }
}

async function generateNextRound(tournamentId: string, roundNumber: number) {
  console.log(`\n🔄 Gerando Rodada ${roundNumber}...\n`);

  // Buscar stage Swiss
  const swissStage = await prisma.tournamentStage.findFirst({
    where: { tournamentId, type: "SWISS" }
  });

  if (!swissStage) throw new Error("Stage Swiss não encontrado");

  // Buscar rodada
  const round = await prisma.swissRound.findFirst({
    where: { tournamentId, roundNumber }
  });

  if (!round) throw new Error(`Rodada ${roundNumber} não encontrada`);

  // Buscar campanhas atuais e agrupar por campanha
  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId },
    include: { team: true }
  });

  // Filtrar times que ainda não terminaram (wins < 3 E losses < 3)
  const activeCampaigns = campaigns.filter(c => c.wins < 3 && c.losses < 3);

  // Agrupar por campanha
  const groups = new Map<string, typeof activeCampaigns>();
  activeCampaigns.forEach(c => {
    const key = `${c.wins}-${c.losses}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  });

  let matchesCreated = 0;

  // Gerar partidas para cada grupo
  for (const [campaign, teams] of groups.entries()) {
    console.log(`  📌 Campanha ${campaign}: ${teams.length} times`);

    const shuffled = [...teams].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        const teamA = shuffled[i];
        const teamB = shuffled[i + 1];

        // Verificar se já existe partida entre esses times nesta rodada
        const existing = await prisma.match.findFirst({
          where: {
            swissRoundId: round.id,
            OR: [
              { teamAId: teamA.teamId, teamBId: teamB.teamId },
              { teamAId: teamB.teamId, teamBId: teamA.teamId }
            ]
          }
        });

        if (!existing) {
          await prisma.match.create({
            data: {
              tournamentId,
              stageId: swissStage.id,
              swissRoundId: round.id,
              teamAId: teamA.teamId,
              teamBId: teamB.teamId,
              seriesFormat: swissStage.seriesFormat,
              status: MatchStatus.SCHEDULED
            }
          });

          matchesCreated++;
          console.log(`    ✓ ${teamA.team.name} vs ${teamB.team.name}`);
        }
      }
    }
  }

  console.log(`\n  ✅ ${matchesCreated} partidas criadas para Rodada ${roundNumber}\n`);
}

async function main() {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { slug: "ecl-swiss-test-2024" }
    });

    if (!tournament) throw new Error("Torneio não encontrado");

    console.log("\n" + "═".repeat(70));
    console.log("🎮 COMPLETANDO SWISS SYSTEM - 5 RODADAS COMPLETAS");
    console.log("═".repeat(70));

    // Ciclo: completar partidas pendentes → gerar próxima rodada
    for (let round = 1; round <= 5; round++) {
      console.log(`\n\n${"═".repeat(70)}`);
      console.log(`📍 PROCESSANDO RODADA ${round}`);
      console.log("═".repeat(70));

      // Completar partidas pendentes
      await completeAllPendingMatches();

      // Marcar rodada como completa
      await prisma.swissRound.updateMany({
        where: { tournamentId: tournament.id, roundNumber: round },
        data: { isComplete: true }
      });

      // Gerar próxima rodada (se não for a última)
      if (round < 5) {
        await generateNextRound(tournament.id, round + 1);
      }
    }

    // Estatísticas finais
    console.log("\n\n" + "═".repeat(70));
    console.log("📊 ESTATÍSTICAS FINAIS");
    console.log("═".repeat(70));

    const allMatches = await prisma.match.count({
      where: {
        tournamentId: tournament.id,
        swissRoundId: { not: null }
      }
    });

    const finalCampaigns = await prisma.swissCampaign.findMany({
      where: { tournamentId: tournament.id },
      include: { team: true },
      orderBy: [{ wins: "desc" }, { losses: "asc" }]
    });

    console.log(`\n✅ Total de partidas criadas: ${allMatches}`);
    console.log(`✅ Total de times: ${finalCampaigns.length}\n`);

    const classified = finalCampaigns.filter(c => c.wins >= 3);
    const eliminated = finalCampaigns.filter(c => c.losses >= 3);
    const active = finalCampaigns.filter(c => c.wins < 3 && c.losses < 3);

    console.log(`🟢 CLASSIFICADOS (3+ vitórias): ${classified.length}`);
    classified.forEach(c => console.log(`  • ${c.team.name}: ${c.wins}-${c.losses}`));

    console.log(`\n🔴 ELIMINADOS (3+ derrotas): ${eliminated.length}`);
    eliminated.forEach(c => console.log(`  • ${c.team.name}: ${c.wins}-${c.losses}`));

    console.log(`\n⚪ EM ANDAMENTO: ${active.length}`);
    active.forEach(c => console.log(`  • ${c.team.name}: ${c.wins}-${c.losses}`));

    console.log("\n" + "═".repeat(70));
    console.log("✅ SWISS SYSTEM COMPLETO - 5 RODADAS FINALIZADAS");
    console.log("═".repeat(70) + "\n");

  } catch (error) {
    console.error("\n❌ Erro:", error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

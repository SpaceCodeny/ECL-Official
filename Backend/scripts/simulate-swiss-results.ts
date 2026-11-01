import { PrismaClient, MatchStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n🎮 Simulando resultados completos do Swiss System...\n");
  
  const tournament = await prisma.tournament.findUnique({
    where: { slug: "ecl-swiss-test-2024" }
  });
  
  if (!tournament) {
    console.log("❌ Torneio não encontrado");
    return;
  }
  
  // Buscar todas as rodadas
  const rounds = await prisma.swissRound.findMany({
    where: { tournamentId: tournament.id },
    include: {
      matches: {
        include: {
          teamA: true,
          teamB: true
        }
      }
    },
    orderBy: { roundNumber: "asc" }
  });
  
  console.log(`📊 Total de rodadas: ${rounds.length}\n`);
  
  for (const round of rounds) {
    console.log(`\n🔵 RODADA ${round.roundNumber}`);
    console.log("─".repeat(60));
    
    if (round.matches.length === 0) {
      console.log("  ⚠️  Sem partidas criadas (aguardando geração)\n");
      continue;
    }
    
    for (const match of round.matches) {
      // Se já tem resultado, pular
      if (match.status === "COMPLETED") {
        console.log(`  ✓ ${match.teamA.name} vs ${match.teamB.name} (já completa)`);
        continue;
      }
      
      // Simular resultado aleatório (60% chance do time A ganhar)
      const teamAWins = Math.random() > 0.4;
      const winnerId = teamAWins ? match.teamAId : match.teamBId;
      const loserId = teamAWins ? match.teamBId : match.teamAId;
      
      // Atualizar partida
      await prisma.match.update({
        where: { id: match.id },
        data: {
          winnerTeamId: winnerId,
          status: MatchStatus.COMPLETED,
          scoreA: teamAWins ? 1 : 0,
          scoreB: teamAWins ? 0 : 1,
        }
      });
      
      // Atualizar campanhas
      const winnerCampaign = await prisma.swissCampaign.findFirst({
        where: {
          tournamentId: tournament.id,
          teamId: winnerId
        }
      });
      
      const loserCampaign = await prisma.swissCampaign.findFirst({
        where: {
          tournamentId: tournament.id,
          teamId: loserId
        }
      });
      
      if (winnerCampaign) {
        await prisma.swissCampaign.update({
          where: { id: winnerCampaign.id },
          data: {
            wins: winnerCampaign.wins + 1,
            roundsPlayed: winnerCampaign.roundsPlayed + 1,
            roundDiff: winnerCampaign.roundDiff + 1,
            opponentsIds: [...(winnerCampaign.opponentsIds as string[]), loserId],
            isEliminated: false
          }
        });
      }
      
      if (loserCampaign) {
        const newLosses = loserCampaign.losses + 1;
        await prisma.swissCampaign.update({
          where: { id: loserCampaign.id },
          data: {
            losses: newLosses,
            roundsPlayed: loserCampaign.roundsPlayed + 1,
            roundDiff: loserCampaign.roundDiff - 1,
            opponentsIds: [...(loserCampaign.opponentsIds as string[]), winnerId],
            isEliminated: newLosses >= 3
          }
        });
      }
      
      const winnerName = teamAWins ? match.teamA.name : match.teamB.name;
      const loserName = teamAWins ? match.teamB.name : match.teamA.name;
      console.log(`  ✓ ${winnerName} VENCEU ${loserName}`);
    }
    
    // Marcar rodada como completa
    await prisma.swissRound.update({
      where: { id: round.id },
      data: { isComplete: true }
    });
    
    console.log(`\n  ✅ Rodada ${round.roundNumber} concluída!`);
  }
  
  // Mostrar classificação final
  console.log("\n\n📊 CLASSIFICAÇÃO FINAL\n");
  console.log("═".repeat(60));
  
  const finalCampaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId: tournament.id },
    include: { team: true },
    orderBy: [
      { wins: "desc" },
      { roundDiff: "desc" }
    ]
  });
  
  finalCampaigns.forEach((campaign, index) => {
    const status = campaign.wins === 3 
      ? "🟢 CLASSIFICADO" 
      : campaign.losses === 3 
      ? "🔴 ELIMINADO" 
      : "⚪ EM ANDAMENTO";
    
    console.log(
      `${(index + 1).toString().padStart(2)}º ${campaign.team.name.padEnd(25)} ` +
      `${campaign.wins}-${campaign.losses} (${campaign.roundDiff >= 0 ? '+' : ''}${campaign.roundDiff}) ${status}`
    );
    
    if (index === 11) {
      console.log("─".repeat(60));
    }
  });
  
  console.log("\n✅ Simulação completa!\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

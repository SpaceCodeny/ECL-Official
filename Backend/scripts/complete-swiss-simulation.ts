import { PrismaClient, MatchStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function generateAndCompleteRound(tournamentId: string, roundNumber: number) {
  console.log(`\n🔄 Gerando Rodada ${roundNumber}...`);
  
  // Buscar campanhas atuais
  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId },
    include: { team: true }
  });
  
  // Agrupar por campanha
  const groups = new Map<string, typeof campaigns>();
  campaigns.forEach(c => {
    const key = `${c.wins}-${c.losses}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  });
  
  // Buscar stage Swiss
  const swissStage = await prisma.tournamentStage.findFirst({
    where: { tournamentId, type: "SWISS" }
  });
  
  if (!swissStage) throw new Error("Swiss stage not found");
  
  // Buscar ou criar rodada
  let round = await prisma.swissRound.findFirst({
    where: { tournamentId, roundNumber }
  });
  
  if (!round) {
    round = await prisma.swissRound.create({
      data: { tournamentId, roundNumber, isComplete: false }
    });
  }
  
  // Gerar partidas para cada grupo
  const matches = [];
  for (const [campaign, teamList] of groups.entries()) {
    // Emparejar times do mesmo grupo
    const shuffled = [...teamList].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        const match = await prisma.match.create({
          data: {
            tournamentId,
            stageId: swissStage.id,
            swissRoundId: round.id,
            teamAId: shuffled[i]!.teamId,
            teamBId: shuffled[i + 1]!.teamId,
            seriesFormat: swissStage.seriesFormat,
            status: MatchStatus.SCHEDULED,
          },
          include: {
            teamA: true,
            teamB: true
          }
        });
        matches.push(match);
      }
    }
  }
  
  console.log(`  ✅ ${matches.length} partidas criadas`);
  
  // Simular resultados
  console.log(`\n⚡ Simulando resultados da Rodada ${roundNumber}...`);
  
  for (const match of matches) {
    const teamAWins = Math.random() > 0.5;
    const winnerId = teamAWins ? match.teamAId : match.teamBId;
    const loserId = teamAWins ? match.teamBId : match.teamAId;
    
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
    const winnerCampaign = campaigns.find(c => c.teamId === winnerId);
    const loserCampaign = campaigns.find(c => c.teamId === loserId);
    
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
  
  console.log(`\n  ✅ Rodada ${roundNumber} concluída!`);
}

async function main() {
  console.log("\n🎮 Completando simulação do Swiss System (Rodadas 2-5)...\n");
  
  const tournament = await prisma.tournament.findUnique({
    where: { slug: "ecl-swiss-test-2024" }
  });
  
  if (!tournament) {
    console.log("❌ Torneio não encontrado");
    return;
  }
  
  // Gerar e completar rodadas 2, 3, 4 e 5
  for (let round = 2; round <= 5; round++) {
    await generateAndCompleteRound(tournament.id, round);
  }
  
  // Mostrar classificação final
  console.log("\n\n📊 CLASSIFICAÇÃO FINAL DO SWISS SYSTEM\n");
  console.log("═".repeat(70));
  
  const finalCampaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId: tournament.id },
    include: { team: true },
    orderBy: [
      { wins: "desc" },
      { roundDiff: "desc" }
    ]
  });
  
  let position = 1;
  finalCampaigns.forEach((campaign) => {
    const status = campaign.wins === 3 
      ? "🟢 CLASSIFICADO" 
      : campaign.losses === 3 
      ? "🔴 ELIMINADO" 
      : "⚪ EM ANDAMENTO";
    
    const posStr = `${position}º`.padStart(3);
    const nameStr = campaign.team.name.padEnd(25);
    const recordStr = `${campaign.wins}-${campaign.losses}`.padEnd(5);
    const diffStr = `(${campaign.roundDiff >= 0 ? '+' : ''}${campaign.roundDiff})`.padEnd(5);
    
    console.log(`${posStr} ${nameStr} ${recordStr} ${diffStr} ${status}`);
    
    if (position === 12) {
      console.log("─".repeat(70));
    }
    
    position++;
  });
  
  const classified = finalCampaigns.filter(c => c.wins === 3).length;
  const eliminated = finalCampaigns.filter(c => c.losses === 3).length;
  
  console.log("\n📈 RESUMO:");
  console.log(`  • Classificados (3 vitórias): ${classified}`);
  console.log(`  • Eliminados (3 derrotas): ${eliminated}`);
  console.log(`  • Em andamento: ${20 - classified - eliminated}`);
  
  console.log("\n✅ Simulação completa! Todas as 5 rodadas finalizadas.\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

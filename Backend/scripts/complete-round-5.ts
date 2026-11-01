import { PrismaClient, MatchStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n🎮 Completando Rodada 5 do Swiss System...\n");
  
  const tournament = await prisma.tournament.findUnique({
    where: { slug: "ecl-swiss-test-2024" }
  });
  
  if (!tournament) {
    console.log("❌ Torneio não encontrado");
    return;
  }
  
  // Buscar campanhas atuais (times que ainda não classificaram/eliminaram)
  const activeCampaigns = await prisma.swissCampaign.findMany({
    where: {
      tournamentId: tournament.id,
      wins: { lt: 3 },
      losses: { lt: 3 }
    },
    include: { team: true }
  });
  
  console.log(`📊 Times ativos (sem 3V ou 3D): ${activeCampaigns.length}\n`);
  
  // Agrupar por campanha
  const groups = new Map<string, typeof activeCampaigns>();
  activeCampaigns.forEach(c => {
    const key = `${c.wins}-${c.losses}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  });
  
  console.log("Grupos ativos:");
  for (const [campaign, teams] of groups.entries()) {
    console.log(`  ${campaign}: ${teams.length} times`);
  }
  
  // Buscar stage Swiss
  const swissStage = await prisma.tournamentStage.findFirst({
    where: { tournamentId: tournament.id, type: "SWISS" }
  });
  
  if (!swissStage) throw new Error("Swiss stage not found");
  
  // Buscar ou criar rodada 5
  let round5 = await prisma.swissRound.findFirst({
    where: { tournamentId: tournament.id, roundNumber: 5 }
  });
  
  if (!round5) {
    round5 = await prisma.swissRound.create({
      data: { tournamentId: tournament.id, roundNumber: 5, isComplete: false }
    });
  }
  
  // Gerar partidas para cada grupo
  console.log("\n⚡ Gerando e simulando partidas da Rodada 5...\n");
  
  for (const [campaign, teamList] of groups.entries()) {
    if (teamList.length === 0) continue;
    
    console.log(`\n🔵 Grupo ${campaign} (${teamList.length} times)`);
    
    // Emparelar times do mesmo grupo
    const shuffled = [...teamList].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        const teamA = shuffled[i]!;
        const teamB = shuffled[i + 1]!;
        
        // Criar partida
        const match = await prisma.match.create({
          data: {
            tournamentId: tournament.id,
            stageId: swissStage.id,
            swissRoundId: round5.id,
            teamAId: teamA.teamId,
            teamBId: teamB.teamId,
            seriesFormat: swissStage.seriesFormat,
            status: MatchStatus.SCHEDULED,
          }
        });
        
        // Simular resultado
        const teamAWins = Math.random() > 0.5;
        const winnerId = teamAWins ? teamA.teamId : teamB.teamId;
        const loserId = teamAWins ? teamB.teamId : teamA.teamId;
        
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
        const newWinsWinner = teamA.teamId === winnerId ? teamA.wins + 1 : teamB.wins + 1;
        const newLossesLoser = teamA.teamId === loserId ? teamA.losses + 1 : teamB.losses + 1;
        
        await prisma.swissCampaign.update({
          where: {
            tournamentId_teamId: {
              tournamentId: tournament.id,
              teamId: winnerId
            }
          },
          data: {
            wins: { increment: 1 },
            roundsPlayed: { increment: 1 },
            roundDiff: { increment: 1 },
            opponentsIds: { push: loserId },
            isEliminated: false
          }
        });
        
        await prisma.swissCampaign.update({
          where: {
            tournamentId_teamId: {
              tournamentId: tournament.id,
              teamId: loserId
            }
          },
          data: {
            losses: { increment: 1 },
            roundsPlayed: { increment: 1 },
            roundDiff: { decrement: 1 },
            opponentsIds: { push: winnerId },
            isEliminated: newLossesLoser >= 3
          }
        });
        
        const winnerName = teamAWins ? teamA.team.name : teamB.team.name;
        const loserName = teamAWins ? teamB.team.name : teamA.team.name;
        const winnerRecord = teamAWins ? `${teamA.wins + 1}-${teamA.losses}` : `${teamB.wins + 1}-${teamB.losses}`;
        const loserRecord = teamAWins ? `${teamB.wins}-${teamB.losses + 1}` : `${teamA.wins}-${teamA.losses + 1}`;
        
        console.log(`  ✓ ${winnerName} (${winnerRecord}) VENCEU ${loserName} (${loserRecord})`);
      }
    }
  }
  
  // Marcar rodada como completa
  await prisma.swissRound.update({
    where: { id: round5.id },
    data: { isComplete: true }
  });
  
  // Mostrar classificação final
  console.log("\n\n📊 CLASSIFICAÇÃO FINAL - TODAS AS 5 RODADAS COMPLETAS\n");
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
    const status = campaign.wins >= 3 
      ? "🟢 CLASSIFICADO" 
      : campaign.losses >= 3 
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
  
  const classified = finalCampaigns.filter(c => c.wins >= 3).length;
  const eliminated = finalCampaigns.filter(c => c.losses >= 3).length;
  
  console.log("\n📈 RESUMO FINAL:");
  console.log(`  • Classificados (3+ vitórias): ${classified}`);
  console.log(`  • Eliminados (3+ derrotas): ${eliminated}`);
  console.log(`  • Em andamento: ${20 - classified - eliminated}`);
  
  // Mostrar distribuição por campanha
  console.log("\n📊 DISTRIBUIÇÃO POR CAMPANHA:");
  const distribution = new Map<string, number>();
  finalCampaigns.forEach(c => {
    const key = `${c.wins}-${c.losses}`;
    distribution.set(key, (distribution.get(key) || 0) + 1);
  });
  
  for (const [campaign, count] of Array.from(distribution.entries()).sort()) {
    const [w, l] = campaign.split('-').map(Number);
    const icon = w >= 3 ? '🟢' : l >= 3 ? '🔴' : '⚪';
    console.log(`  ${icon} ${campaign}: ${count} times`);
  }
  
  console.log("\n✅ FASE SUÍÇA COMPLETA! Todas as 5 rodadas finalizadas.\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n🧹 Limpando partidas do sistema Swiss...\n");
  
  const tournament = await prisma.tournament.findUnique({
    where: { slug: "ecl-swiss-test-2024" }
  });
  
  if (!tournament) {
    console.log("❌ Torneio não encontrado");
    return;
  }
  
  // Buscar times removidos
  const redCanids = await prisma.team.findUnique({ where: { slug: "red-canids" } });
  const imperial = await prisma.team.findUnique({ where: { slug: "imperial-esports" } });
  
  if (!redCanids && !imperial) {
    console.log("⚠️  Times não encontrados no banco");
    return;
  }
  
  const removedTeamIds = [redCanids?.id, imperial?.id].filter(Boolean) as string[];
  
  // Buscar stage Swiss
  const swissStage = await prisma.tournamentStage.findFirst({
    where: {
      tournamentId: tournament.id,
      type: "SWISS"
    }
  });
  
  if (!swissStage) {
    console.log("ℹ️  Fase Swiss ainda não foi inicializada");
    return;
  }
  
  console.log(`Fase Swiss encontrada: ${swissStage.name}`);
  
  // Buscar rodadas Swiss
  const swissRounds = await prisma.swissRound.findMany({
    where: { tournamentId: tournament.id },
    include: { matches: true },
    orderBy: { roundNumber: 'asc' }
  });
  
  console.log(`Rodadas: ${swissRounds.length}\n`);
  
  // Deletar partidas com times removidos
  let deletedMatches = 0;
  
  for (const round of swissRounds) {
    for (const match of round.matches) {
      const hasRemovedTeam = 
        removedTeamIds.includes(match.team1Id) || 
        (match.team2Id && removedTeamIds.includes(match.team2Id));
      
      if (hasRemovedTeam) {
        await prisma.match.delete({ where: { id: match.id } });
        deletedMatches++;
        console.log(`  ✓ Removida partida: ${match.id} (Round ${round.roundNumber})`);
      }
    }
  }
  
  // Deletar campanhas Swiss dos times removidos
  const deletedCampaigns = await prisma.swissCampaign.deleteMany({
    where: {
      tournamentId: tournament.id,
      teamId: { in: removedTeamIds }
    }
  });
  
  console.log(`\n✅ Resultado:`);
  console.log(`  • Partidas removidas: ${deletedMatches}`);
  console.log(`  • Campanhas removidas: ${deletedCampaigns.count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

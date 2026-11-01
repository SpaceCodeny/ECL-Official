import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n🗑️  Removendo times extras do torneio Swiss...\n");
  
  const tournament = await prisma.tournament.findUnique({
    where: { slug: "ecl-swiss-test-2024" }
  });
  
  if (!tournament) {
    console.log("❌ Torneio não encontrado");
    return;
  }
  
  // Remover RED Canids e Imperial Esports
  const teamsToRemove = ["red-canids", "imperial-esports"];
  
  for (const slug of teamsToRemove) {
    const team = await prisma.team.findUnique({
      where: { slug }
    });
    
    if (!team) {
      console.log(`⚠️  Time ${slug} não encontrado`);
      continue;
    }
    
    // Remover inscrição
    const deleted = await prisma.tournamentRegistration.deleteMany({
      where: {
        tournamentId: tournament.id,
        teamId: team.id
      }
    });
    
    console.log(`✓ Removido: ${team.name} (${deleted.count} inscrição)`);
  }
  
  // Verificar total final
  const remaining = await prisma.tournamentRegistration.count({
    where: {
      tournamentId: tournament.id,
      status: "APPROVED"
    }
  });
  
  console.log(`\n✅ Total de times restantes: ${remaining}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n🔄 Resetando sistema Swiss completamente...\n");
  
  const tournament = await prisma.tournament.findUnique({
    where: { slug: "ecl-swiss-test-2024" }
  });
  
  if (!tournament) {
    console.log("❌ Torneio não encontrado");
    return;
  }
  
  // 1. Deletar todas as partidas Swiss
  const matches = await prisma.match.deleteMany({
    where: {
      swissRoundId: { not: null },
      tournamentId: tournament.id
    }
  });
  console.log(`✓ Partidas deletadas: ${matches.count}`);
  
  // 2. Deletar todas as rodadas Swiss
  const rounds = await prisma.swissRound.deleteMany({
    where: { tournamentId: tournament.id }
  });
  console.log(`✓ Rodadas deletadas: ${rounds.count}`);
  
  // 3. Deletar todas as campanhas Swiss
  const campaigns = await prisma.swissCampaign.deleteMany({
    where: { tournamentId: tournament.id }
  });
  console.log(`✓ Campanhas deletadas: ${campaigns.count}`);
  
  // 4. Deletar o stage Swiss
  const stage = await prisma.tournamentStage.deleteMany({
    where: {
      tournamentId: tournament.id,
      type: "SWISS"
    }
  });
  console.log(`✓ Stage Swiss deletado: ${stage.count}`);
  
  // 5. Verificar total de times inscritos
  const totalTeams = await prisma.tournamentRegistration.count({
    where: {
      tournamentId: tournament.id,
      status: "APPROVED"
    }
  });
  
  console.log(`\n✅ Sistema Swiss resetado!`);
  console.log(`📊 Times inscritos: ${totalTeams}`);
  console.log(`\n💡 Agora você pode inicializar o Swiss novamente no admin panel.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

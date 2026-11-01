import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tournaments = await prisma.tournament.findMany({
    include: {
      preset: true,
      stages: true,
      _count: {
        select: {
          invitedTeams: true,
          registrations: true
        }
      }
    }
  });
  
  // Buscar campanhas e rodadas separadamente
  for (const t of tournaments) {
    const campaigns = await prisma.swissCampaign.count({
      where: { tournamentId: t.id }
    });
    const rounds = await prisma.swissRound.count({
      where: { tournamentId: t.id }
    });
    (t as any).swissCampaignsCount = campaigns;
    (t as any).swissRoundsCount = rounds;
  }

  console.log('\n=== TORNEIOS ===\n');
  
  tournaments.forEach(t => {
    console.log(`ID: ${t.id}`);
    console.log(`Nome: ${t.name}`);
    console.log(`Preset: ${t.preset?.name || 'N/A'}`);
    console.log(`Status: ${t.status}`);
    console.log(`Times convidados: ${t._count.invitedTeams}`);
    console.log(`Campanhas Swiss: ${(t as any).swissCampaignsCount}`);
    console.log(`Rodadas Swiss: ${(t as any).swissRoundsCount}`);
    console.log(`Stages: ${t.stages.map(s => s.type).join(', ')}`);
    console.log('---');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

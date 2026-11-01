import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId: '5f117fad-c3a9-4fcd-a410-fed4efdcd3f2' },
    orderBy: [{ wins: 'desc' }, { losses: 'asc' }],
    include: { team: true }
  });

  console.log('\n=== CAMPANHAS ATUAIS ===\n');
  
  const classified = campaigns.filter(c => c.wins >= 3);
  const eliminated = campaigns.filter(c => c.losses >= 3);
  const active = campaigns.filter(c => c.wins < 3 && c.losses < 3);

  console.log('CLASSIFICADOS (3+ vitórias):');
  classified.forEach(c => {
    console.log(`  ${c.team.name.padEnd(20)} | ${c.wins}-${c.losses} | isClassified: ${c.isClassified}`);
  });

  console.log('\nELIMINADOS (3+ derrotas):');
  eliminated.forEach(c => {
    console.log(`  ${c.team.name.padEnd(20)} | ${c.wins}-${c.losses} | isEliminated: ${c.isEliminated}`);
  });

  console.log('\nATIVOS (em progresso):');
  active.forEach(c => {
    console.log(`  ${c.team.name.padEnd(20)} | ${c.wins}-${c.losses}`);
  });

  console.log('\n=== RESUMO ===');
  console.log(`Classificados: ${classified.length}`);
  console.log(`Eliminados: ${eliminated.length}`);
  console.log(`Ativos: ${active.length}`);
  console.log(`Total: ${campaigns.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

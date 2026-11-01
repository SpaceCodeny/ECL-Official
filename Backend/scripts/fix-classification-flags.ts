import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tournamentId = '5f117fad-c3a9-4fcd-a410-fed4efdcd3f2';
  
  console.log('\n=== Corrigindo flags de classificação/eliminação ===\n');
  
  // Buscar todas as campanhas
  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId },
    include: { team: true }
  });
  
  let classifiedCount = 0;
  let eliminatedCount = 0;
  
  for (const campaign of campaigns) {
    const updates: any = {};
    let needsUpdate = false;
    
    // Classificados: 3+ vitórias
    if (campaign.wins >= 3) {
      if (campaign.isClassified !== true) {
        updates.isClassified = true;
        needsUpdate = true;
        classifiedCount++;
      }
    }
    
    // Eliminados: 3+ derrotas
    if (campaign.losses >= 3) {
      if (campaign.isEliminated !== true) {
        updates.isEliminated = true;
        needsUpdate = true;
        eliminatedCount++;
      }
    }
    
    if (needsUpdate) {
      await prisma.swissCampaign.update({
        where: { id: campaign.id },
        data: updates
      });
      
      console.log(`✓ ${campaign.team.name.padEnd(20)} | ${campaign.wins}-${campaign.losses} | ${JSON.stringify(updates)}`);
    }
  }
  
  console.log('\n=== Resumo ===');
  console.log(`Times marcados como classificados: ${classifiedCount}`);
  console.log(`Times marcados como eliminados: ${eliminatedCount}`);
  console.log('\nVerificando resultado...\n');
  
  // Verificar resultado
  const updated = await prisma.swissCampaign.findMany({
    where: { tournamentId },
    orderBy: [{ wins: 'desc' }, { losses: 'asc' }],
    include: { team: true }
  });
  
  const classified = updated.filter(c => c.wins >= 3);
  const eliminated = updated.filter(c => c.losses >= 3);
  
  console.log('CLASSIFICADOS:');
  classified.forEach(c => {
    console.log(`  ${c.team.name.padEnd(20)} | ${c.wins}-${c.losses} | isClassified: ${c.isClassified}`);
  });
  
  console.log('\nELIMINADOS:');
  eliminated.forEach(c => {
    console.log(`  ${c.team.name.padEnd(20)} | ${c.wins}-${c.losses} | isEliminated: ${c.isEliminated}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initRanking() {
  try {
    console.log('🔄 Inicializando ranking para todos os times...');
    
    // Buscar todos os times
    const teams = await prisma.team.findMany({
      select: { id: true, name: true },
    });

    if (teams.length === 0) {
      console.log('⚠️  Nenhum time cadastrado');
      return;
    }

    console.log(`📋 Encontrados ${teams.length} times`);

    const season = '2024-2025';
    let created = 0;
    let updated = 0;

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      
      // Verificar se já existe registro
      const existing = await prisma.rankingSnapshot.findFirst({
        where: { teamId: team.id, season },
      });

      if (existing) {
        // Atualizar existente
        await prisma.rankingSnapshot.update({
          where: { id: existing.id },
          data: {
            position: i + 1,
            points: 0,
            wins: 0,
            losses: 0,
            titles: 0,
            previousPosition: null,
            snapshotAt: new Date(),
          },
        });
        updated++;
      } else {
        // Criar novo
        await prisma.rankingSnapshot.create({
          data: {
            teamId: team.id,
            season,
            position: i + 1,
            points: 0,
            wins: 0,
            losses: 0,
            titles: 0,
            previousPosition: null,
            snapshotAt: new Date(),
          },
        });
        created++;
      }

      console.log(`  ${i + 1}. ${team.name}`);
    }

    console.log(`\n✅ Ranking inicializado: ${created} criados, ${updated} atualizados`);
  } catch (error) {
    console.error('❌ Erro ao inicializar ranking:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initRanking();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetRanking() {
  try {
    console.log('🔄 Zerando ranking...');
    
    // Atualizar todos os registros de ranking
    const result = await prisma.rankingSnapshot.updateMany({
      data: {
        points: 0,
        wins: 0,
        losses: 0,
        titles: 0,
        previousPosition: null,
        snapshotAt: new Date(),
      },
    });

    console.log(`✅ ${result.count} times tiveram o ranking zerado`);

    // Limpar histórico de pontos de torneios
    const pointsDeleted = await prisma.tournamentRankingPoints.deleteMany({});
    console.log(`✅ ${pointsDeleted.count} registros de pontos removidos`);

    console.log('✨ Ranking zerado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao zerar ranking:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetRanking();

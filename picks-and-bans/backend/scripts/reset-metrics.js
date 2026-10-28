/**
 * Script Node.js para zerar métricas e logs do banco picks-and-bans
 * Mantém admins, remove sessões e logs
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function resetMetrics() {
  try {
    console.log('🧹 Iniciando limpeza de métricas...\n');

    // 1. Deletar todas as ações (filhas de Session)
    const deletedActions = await prisma.sessionAction.deleteMany({});
    console.log(`✅ ${deletedActions.count} ações deletadas`);

    // 2. Deletar todas as sessões
    const deletedSessions = await prisma.session.deleteMany({});
    console.log(`✅ ${deletedSessions.count} sessões deletadas`);

    // 3. Deletar todos os logs de atividade
    const deletedLogs = await prisma.activityLog.deleteMany({});
    console.log(`✅ ${deletedLogs.count} logs de atividade deletados`);

    // 4. Deletar tokens revogados
    const deletedTokens = await prisma.revokedToken.deleteMany({});
    console.log(`✅ ${deletedTokens.count} tokens revogados deletados`);

    // 5. Verificar o que restou
    console.log('\n📊 Estado final do banco:\n');
    
    const adminCount = await prisma.admin.count();
    const sessionCount = await prisma.session.count();
    const logCount = await prisma.activityLog.count();
    const tokenCount = await prisma.revokedToken.count();

    console.log(`   Admins cadastrados: ${adminCount} ✅`);
    console.log(`   Sessões restantes: ${sessionCount}`);
    console.log(`   Logs de atividade: ${logCount}`);
    console.log(`   Tokens revogados: ${tokenCount}`);

    console.log('\n✨ Limpeza concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao resetar métricas:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetMetrics();

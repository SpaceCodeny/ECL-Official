/**
 * backfill-ranking-entries.ts
 * 
 * Script para adicionar retroativamente todos os times já inscritos em torneios
 * ao sistema de ranking. Usado para corrigir dados históricos onde times foram
 * aprovados antes da função ensureRankingEntry ser implementada.
 * 
 * Uso:
 *   npx tsx scripts/backfill-ranking-entries.ts
 */

import { PrismaClient, RegistrationStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function backfillRankingEntries() {
  console.log("🔍 Buscando inscrições aprovadas sem entrada no ranking...\n");

  try {
    // Busca todas as inscrições aprovadas
    const approvedRegistrations = await prisma.tournamentRegistration.findMany({
      where: {
        status: RegistrationStatus.APPROVED,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        tournament: {
          select: {
            id: true,
            name: true,
            season: true,
            startDate: true,
          },
        },
      },
    });

    console.log(`📊 Total de inscrições aprovadas: ${approvedRegistrations.length}`);

    let added = 0;
    let skipped = 0;
    let errors = 0;

    for (const reg of approvedRegistrations) {
      const teamId = reg.teamId;
      const tournament = reg.tournament;

      // Determina a season do torneio
      const year = tournament.startDate
        ? tournament.startDate.getFullYear().toString()
        : new Date().getFullYear().toString();
      const season = tournament.season ?? year;

      try {
        // Verifica se já existe entrada no ranking
        const existing = await prisma.rankingSnapshot.findFirst({
          where: {
            teamId,
            season,
          },
        });

        if (existing) {
          console.log(`⏭️  Time "${reg.team.name}" já está no ranking da season "${season}"`);
          skipped++;
          continue;
        }

        // Calcula a próxima posição disponível
        const count = await prisma.rankingSnapshot.count({
          where: { season },
        });

        // Adiciona ao ranking
        await prisma.rankingSnapshot.create({
          data: {
            teamId,
            season,
            position: count + 1,
            previousPosition: null,
            points: 0,
            wins: 0,
            losses: 0,
            titles: 0,
            snapshotAt: new Date(),
          },
        });

        console.log(
          `✅ Time "${reg.team.name}" adicionado ao ranking da season "${season}" na posição ${count + 1}`
        );
        added++;
      } catch (err) {
        console.error(
          `❌ Erro ao adicionar time "${reg.team.name}" ao ranking da season "${season}":`,
          err
        );
        errors++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📈 Resultado do backfill:");
    console.log(`   ✅ Adicionados: ${added}`);
    console.log(`   ⏭️  Já existentes: ${skipped}`);
    console.log(`   ❌ Erros: ${errors}`);
    console.log("=".repeat(60) + "\n");

    if (added > 0) {
      console.log("🎉 Backfill concluído com sucesso!");
    } else {
      console.log("ℹ️  Nenhum time precisou ser adicionado.");
    }
  } catch (error) {
    console.error("💥 Erro fatal ao executar backfill:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executa o script
backfillRankingEntries().catch((err) => {
  console.error("💥 Erro não capturado:", err);
  process.exit(1);
});

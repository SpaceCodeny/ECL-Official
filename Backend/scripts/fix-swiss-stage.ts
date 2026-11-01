/**
 * Script para adicionar TournamentStage SWISS a torneios que já foram inicializados
 * mas não possuem a stage necessária
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixSwissStage() {
  try {
    console.log("🔧 Verificando torneios com fase suíça...\n");

    // Busca todos os SwissCampaigns e agrupa por torneio
    const campaigns = await prisma.swissCampaign.findMany({
      select: {
        tournamentId: true,
      },
      distinct: ["tournamentId"],
    });

    const tournamentIds = campaigns.map((c) => c.tournamentId);

    if (tournamentIds.length === 0) {
      console.log("❌ Nenhuma campanha suíça encontrada");
      return;
    }

    console.log(`📊 ${tournamentIds.length} torneio(s) com fase suíça encontrado(s)\n`);

    // Busca os torneios completos
    const tournaments = await prisma.tournament.findMany({
      where: {
        id: { in: tournamentIds },
      },
      include: {
        stages: true,
        preset: true,
      },
    });

    for (const tournament of tournaments) {
      const hasSwissStage = tournament.stages.some((stage) => stage.type === "SWISS");

      if (hasSwissStage) {
        console.log(`✅ ${tournament.name} - já possui stage SWISS`);
        continue;
      }

      console.log(`🔨 ${tournament.name} - criando stage SWISS...`);

      const presetConfig = tournament.presetConfig as any;
      const swissConfig = presetConfig?.swiss;

      // Conta quantos times tem nesse torneio
      const campaignCount = await prisma.swissCampaign.count({
        where: { tournamentId: tournament.id },
      });

      const swissStage = await prisma.tournamentStage.create({
        data: {
          tournamentId: tournament.id,
          name: "Fase Suíça",
          type: "SWISS",
          order: 1,
          seriesFormat: swissConfig?.matchFormat || "BO1",
          startDate: tournament.startDate,
          endDate: tournament.endDate,
        },
      });

      console.log(`   ✔ Stage criada: ${swissStage.id}`);
    }

    console.log("\n✅ Concluído!");
  } catch (error) {
    console.error("❌ Erro:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixSwissStage();

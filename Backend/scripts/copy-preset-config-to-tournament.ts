/**
 * Script para copiar a configuração do preset para o torneio
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function copyPresetConfig() {
  try {
    const tournamentId = "5f117fad-c3a9-4fcd-a410-fed4efdcd3f2";

    console.log("🔧 Copiando configuração do preset...\n");

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { preset: true },
    });

    if (!tournament) {
      console.log("❌ Torneio não encontrado");
      return;
    }

    if (!tournament.preset) {
      console.log("❌ Torneio não possui preset");
      return;
    }

    console.log(`📋 Torneio: ${tournament.name}`);
    console.log(`🎯 Preset: ${tournament.preset.name}`);

    // Atualiza o presetConfig do torneio com a config do preset
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        presetConfig: tournament.preset.config,
      },
    });

    console.log(`\n✅ Configuração copiada com sucesso!`);
    console.log(`\n📦 Config aplicada:`);
    console.log(JSON.stringify(tournament.preset.config, null, 2));
  } catch (error) {
    console.error("❌ Erro:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

copyPresetConfig();

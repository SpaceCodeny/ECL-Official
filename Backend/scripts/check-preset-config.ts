/**
 * Script para verificar a configuração do preset no torneio
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkPresetConfig() {
  try {
    const tournamentId = "5f117fad-c3a9-4fcd-a410-fed4efdcd3f2";

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { preset: true },
    });

    if (!tournament) {
      console.log("❌ Torneio não encontrado");
      return;
    }

    console.log(`\n📋 Torneio: ${tournament.name}`);
    console.log(`\n🎯 Preset: ${tournament.preset?.name || "N/A"}`);
    console.log(`\n📦 presetConfig:`);
    console.log(JSON.stringify(tournament.presetConfig, null, 2));

    if (tournament.preset) {
      console.log(`\n📄 Preset.config:`);
      console.log(JSON.stringify(tournament.preset.config, null, 2));
    }
  } catch (error) {
    console.error("❌ Erro:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkPresetConfig();

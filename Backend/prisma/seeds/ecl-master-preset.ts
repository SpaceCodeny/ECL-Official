/**
 * Seed do preset ECL MASTER EDITION
 *
 * Configuração oficial:
 * - Fase Suíça: 20 equipes, 5 rodadas, MD1
 * - 3 vitórias = classificado antecipado | 3 derrotas = eliminado antecipado
 * - Ao final da fase: 12 classificados + 8 eliminados (ranking fecha empates)
 * - 4 equipes convidadas com vaga direta nos playoffs
 * - Playoffs: 12 suíças + 4 convidadas = 16 equipes
 * - Oitavas e Quartas: BO3 | Semifinais: BO3 | Grande Final: BO5
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedECLMasterPreset() {
  console.log("🎯 Seeding ECL MASTER EDITION preset...");

  const presetConfig = {
    version: "2.0",
    phases: [
      {
        name: "Fase Suíça",
        type: "SWISS",
        order: 1,
        defaultSeriesFormat: "BO1",
        teamsCount: 20,
        roundsCount: 5,
        winsToClassify: 3,
        lossesToEliminate: 3,
        classifiedCount: 12,
        eliminatedCount: 8,
      },
      {
        name: "Oitavas de Final",
        type: "BRACKET",
        order: 2,
        defaultSeriesFormat: "BO3",
        teamsCount: 16,
      },
      {
        name: "Quartas de Final",
        type: "BRACKET",
        order: 3,
        defaultSeriesFormat: "BO3",
        teamsCount: 8,
      },
      {
        name: "Semifinais",
        type: "BRACKET",
        order: 4,
        defaultSeriesFormat: "BO3",
        teamsCount: 4,
      },
      {
        name: "Grande Final",
        type: "BRACKET",
        order: 5,
        defaultSeriesFormat: "BO5",
        teamsCount: 2,
      },
    ],
    swiss: {
      teamsCount: 20,
      roundsCount: 5,
      matchFormat: "BO1",
      // Encerramento antecipado individual
      winsToClassify: 3,
      lossesToEliminate: 3,
      // Vagas totais pela fase suíça (por resultado OU por ranking ao final)
      classifiedCount: 12,
      eliminatedCount: 8,
      tiebreakCriteria: ["wins", "roundDiff", "headToHead", "opponentsStrength"],
    },
    bracket: {
      teamsCount: 16,
      format: "SINGLE_ELIMINATION",
      swissClassified: 12,
      invitedTeams: 4,
      specialRules: {
        perfect3_0_vs_invited: { enabled: true, invitedSlot: 1 },
      },
    },
    totalTeams: 24,
  };

  try {
    const existing = await prisma.tournamentPreset.findUnique({
      where: { slug: "ecl-master-edition" },
    });

    const upsertData = {
      name: "ECL MASTER EDITION",
      description:
        "Formato oficial da Elite Champions League. " +
        "20 equipes na Fase Suíça (3V/3D, máx 5 rodadas), " +
        "12 classificadas + 4 convidadas = 16 nas Oitavas.",
      version: "2.0",
      isActive: true,
      config: presetConfig as any,
    };

    if (existing) {
      console.log("⏭️  ECL MASTER EDITION já existe. Atualizando...");
      const updated = await prisma.tournamentPreset.update({
        where: { slug: "ecl-master-edition" },
        data: upsertData,
      });
      console.log(`✅ Preset atualizado: ${updated.name} v${updated.version}`);
      return updated;
    }

    const preset = await prisma.tournamentPreset.create({
      data: { slug: "ecl-master-edition", ...upsertData },
    });
    console.log(`✅ Preset criado: ${preset.name}`);
    return preset;
  } catch (error) {
    console.error("❌ Erro ao criar preset ECL MASTER EDITION:", error);
    throw error;
  }
}

if (require.main === module) {
  seedECLMasterPreset()
    .then(() => { console.log("🎉 Seed do ECL MASTER EDITION concluído!"); process.exit(0); })
    .catch((error) => { console.error("💥 Erro fatal:", error); process.exit(1); })
    .finally(() => prisma.$disconnect());
}

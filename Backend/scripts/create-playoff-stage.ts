/**
 * Script: Criar stage PLAYOFF para torneio existente
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tournamentId = "5f117fad-c3a9-4fcd-a410-fed4efdcd3f2";

  console.log("🔍 Verificando stages existentes...\n");

  const existingStages = await prisma.tournamentStage.findMany({
    where: { tournamentId },
    select: { id: true, name: true, type: true, order: true },
    orderBy: { order: "asc" },
  });

  console.log("📋 Stages atuais:");
  existingStages.forEach((s) => console.log(`   - ${s.name} (${s.type}) [order: ${s.order}]`));

  const playoffExists = existingStages.some((s) => s.type === "PLAYOFF");

  if (playoffExists) {
    console.log("\n✅ Stage PLAYOFF já existe!");
    return;
  }

  console.log("\n🚀 Criando stage PLAYOFF...\n");

  const maxOrder = Math.max(...existingStages.map((s) => s.order), 0);

  const playoffStage = await prisma.tournamentStage.create({
    data: {
      tournamentId,
      name: "Playoffs",
      type: "PLAYOFF",
      order: maxOrder + 1,
      seriesFormat: "BO3",
      startDate: null,
      endDate: null,
    },
  });

  console.log(`✅ Stage PLAYOFF criada!`);
  console.log(`   ID: ${playoffStage.id}`);
  console.log(`   Nome: ${playoffStage.name}`);
  console.log(`   Order: ${playoffStage.order}`);
}

main()
  .catch((error) => {
    console.error("❌ Erro:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

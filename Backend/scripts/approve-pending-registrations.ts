import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function approvePendingRegistrations() {
  try {
    console.log("🔄 Buscando inscrições pendentes...");

    // Buscar todas as inscrições pendentes
    const pendingRegistrations = await prisma.tournamentRegistration.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        team: {
          select: { name: true, tag: true },
        },
        tournament: {
          select: { name: true },
        },
      },
    });

    if (pendingRegistrations.length === 0) {
      console.log("✅ Nenhuma inscrição pendente encontrada.");
      return;
    }

    console.log(`\n📋 Encontradas ${pendingRegistrations.length} inscrições pendentes:\n`);

    for (const reg of pendingRegistrations) {
      console.log(`  - ${reg.team.name} (${reg.team.tag || "sem tag"}) → ${reg.tournament.name}`);
    }

    console.log("\n🔄 Aprovando todas...\n");

    // Aprovar todas
    const result = await prisma.tournamentRegistration.updateMany({
      where: {
        status: "PENDING",
      },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
      },
    });

    console.log(`✅ ${result.count} inscrições aprovadas com sucesso!`);
  } catch (error) {
    console.error("❌ Erro ao aprovar inscrições:", error);
  } finally {
    await prisma.$disconnect();
  }
}

approvePendingRegistrations();

/**
 * Adiciona 4 equipes convidadas ao torneio de teste para validar o fluxo de playoffs
 * Usa times existentes no banco que não estão na fase suíça
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TID = "5f117fad-c3a9-4fcd-a410-fed4efdcd3f2";

async function main() {
  // Remover convidadas anteriores
  await prisma.invitedTeam.deleteMany({ where: { tournamentId: TID } });

  // IDs das equipes na fase suíça
  const swissTeamIds = await prisma.swissCampaign.findMany({
    where: { tournamentId: TID },
    select: { teamId: true },
  }).then((r) => r.map((c) => c.teamId));

  // Buscar times que não estão na fase suíça
  const otherTeams = await prisma.team.findMany({
    where: {
      id: { notIn: swissTeamIds },
      isActive: true,
      deletedAt: null,
    },
    take: 4,
    orderBy: { createdAt: "asc" },
  });

  if (otherTeams.length < 4) {
    console.log(`⚠️  Apenas ${otherTeams.length} times disponíveis para convidar (esperado 4)`);
    console.log("    Crie mais times no sistema para testar o fluxo completo de playoffs.");

    // Listar times disponíveis
    const all = await prisma.team.findMany({ where: { isActive: true, deletedAt: null }, take: 5 });
    console.log("\nTimes no banco:");
    all.forEach((t) => console.log(`  ${t.name} (${t.id}) — no Swiss: ${swissTeamIds.includes(t.id)}`));
    return;
  }

  for (let i = 0; i < 4; i++) {
    const team = otherTeams[i]!;
    await prisma.invitedTeam.create({
      data: {
        tournamentId: TID,
        teamId: team.id,
        bracketSlot: i + 1,
        reservedOpponent: `Classificado ${i + 1}° Fase Suíça`,
      },
    });
    console.log(`  ✓ Slot ${i + 1}: ${team.name}`);
  }

  const total = await prisma.invitedTeam.count({ where: { tournamentId: TID } });
  console.log(`\n✅ ${total}/4 equipes convidadas registradas`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

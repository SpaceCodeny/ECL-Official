import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.match.findMany({
    where: {
      bracketPosition: { startsWith: "RO16" },
    },
    select: {
      id: true,
      bracketPosition: true,
      status: true,
      scheduledAt: true,
      teamA: { select: { name: true } },
      teamB: { select: { name: true } },
      stage: { select: { name: true, type: true, tournament: { select: { name: true } } } },
    },
  });

  console.log(`\n📋 Partidas RO16 encontradas: ${matches.length}\n`);
  
  matches.forEach((m) => {
    console.log(`${m.bracketPosition}: ${m.teamA.name} vs ${m.teamB.name}`);
    console.log(`   Status: ${m.status}`);
    console.log(`   Stage: ${m.stage.name} (${m.stage.type})`);
    console.log(`   Torneio: ${m.stage.tournament.name}`);
    console.log(`   Scheduled: ${m.scheduledAt}\n`);
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

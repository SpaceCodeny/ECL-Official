import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId: "5f117fad-c3a9-4fcd-a410-fed4efdcd3f2" },
    include: { team: true },
    orderBy: [{ wins: "desc" }, { roundDiff: "desc" }]
  });
  
  console.log("\n📊 CLASSIFICAÇÃO ATUAL\n");
  campaigns.forEach((c, i) => {
    const status = c.wins === 3 ? "🟢" : c.losses === 3 ? "🔴" : "⚪";
    console.log(`${(i+1).toString().padStart(2)}º ${c.team.name.padEnd(25)} ${c.wins}-${c.losses} (${c.roundDiff>=0?'+':''}${c.roundDiff}) ${status}`);
    if (i === 11) console.log("─".repeat(60));
  });
  console.log("");
}

main().finally(() => prisma.$disconnect());

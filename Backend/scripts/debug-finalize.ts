import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const TID = "5f117fad-c3a9-4fcd-a410-fed4efdcd3f2";

async function main() {
  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId: TID },
    include: { team: { select: { name: true, tag: true } } },
    orderBy: [{ wins: "desc" }, { roundDiff: "desc" }, { losses: "asc" }],
  });

  const alreadyClassified = campaigns.filter((c) => c.wins >= 3 && c.losses < 3);
  const alreadyEliminated = campaigns.filter((c) => c.losses >= 3);
  const borderline = campaigns.filter((c) => c.wins < 3 && c.losses < 3)
    .sort((a, b) => b.wins - a.wins || b.roundDiff - a.roundDiff || a.losses - b.losses);

  console.log(`Já classificados: ${alreadyClassified.length}`);
  alreadyClassified.forEach(c => console.log(`  ${c.team.tag} ${c.wins}-${c.losses}`));

  console.log(`\nJá eliminados: ${alreadyEliminated.length}`);
  alreadyEliminated.forEach(c => console.log(`  ${c.team.tag} ${c.wins}-${c.losses}`));

  console.log(`\nBorderline (ativos): ${borderline.length}`);
  borderline.forEach(c => console.log(`  ${c.team.tag} ${c.wins}-${c.losses}`));

  const vagas = 12 - alreadyClassified.length;
  console.log(`\nVagas restantes: ${vagas}`);

  const classifiedByRankingTeams = borderline.slice(0, Math.max(0, vagas));
  console.log(`\nClassificados por ranking: ${classifiedByRankingTeams.length}`);
  classifiedByRankingTeams.forEach(c => console.log(`  ${c.team.tag} ${c.wins}-${c.losses}`));

  const total = alreadyClassified.length + classifiedByRankingTeams.length;
  console.log(`\nTotal classificados: ${total} (esperado: 12)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

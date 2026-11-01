import { PrismaClient, MatchStatus } from "@prisma/client";
import { generateSwissPairings, WINS_TO_CLASSIFY, LOSSES_TO_ELIMINATE } from "../src/services/swiss-pairing.service";

const prisma = new PrismaClient();
const TID = "5f117fad-c3a9-4fcd-a410-fed4efdcd3f2";

async function processRound(roundNum: number, stageId: string) {
  const active = await prisma.swissCampaign.count({
    where: { tournamentId: TID, wins: { lt: WINS_TO_CLASSIFY }, losses: { lt: LOSSES_TO_ELIMINATE } },
  });
  if (active === 0) { console.log(`R${roundNum}: sem times ativos`); return false; }
  if (active % 2 !== 0) { console.log(`R${roundNum}: ${active} ativos (ímpar), impossível parear`); return false; }

  console.log(`\n${"─".repeat(50)}\n📍 RODADA ${roundNum} (${active} ativos)`);

  const round = await prisma.swissRound.upsert({
    where: { tournamentId_roundNumber: { tournamentId: TID, roundNumber: roundNum } },
    create: { tournamentId: TID, roundNumber: roundNum, isComplete: false },
    update: {},
  });

  const pairs = await generateSwissPairings(TID, roundNum);

  for (const p of pairs) {
    const existing = await prisma.match.findFirst({
      where: { swissRoundId: round.id, OR: [
        { teamAId: p.teamAId, teamBId: p.teamBId },
        { teamAId: p.teamBId, teamBId: p.teamAId },
      ]},
    });
    if (existing) continue;

    const match = await prisma.match.create({
      data: {
        tournamentId: TID, stageId, swissRoundId: round.id,
        teamAId: p.teamAId, teamBId: p.teamBId, seriesFormat: "BO1", status: MatchStatus.SCHEDULED,
      },
      include: {
        teamA: { select: { id: true, name: true, tag: true } },
        teamB: { select: { id: true, name: true, tag: true } },
      },
    });

    const seed = match.teamAId.charCodeAt(0) + match.teamBId.charCodeAt(0) + roundNum;
    const winnerId = seed % 2 === 0 ? match.teamAId : match.teamBId;
    const loserId  = seed % 2 === 0 ? match.teamBId : match.teamAId;
    const wTag = winnerId === match.teamAId ? match.teamA.tag : match.teamB.tag;
    const lTag = winnerId === match.teamAId ? match.teamB.tag : match.teamA.tag;

    await prisma.$transaction(async (tx) => {
      await tx.match.update({ where: { id: match.id }, data: { winnerTeamId: winnerId, scoreA: 1, scoreB: 0, status: MatchStatus.COMPLETED } });

      const w = await tx.swissCampaign.findUnique({ where: { tournamentId_teamId: { tournamentId: TID, teamId: winnerId } } });
      if (w) await tx.swissCampaign.update({ where: { id: w.id }, data: {
        wins: w.wins + 1, roundsPlayed: w.roundsPlayed + 1, roundDiff: w.roundDiff + 1, opponentsIds: { push: loserId },
      }});

      const l = await tx.swissCampaign.findUnique({ where: { tournamentId_teamId: { tournamentId: TID, teamId: loserId } } });
      if (l) {
        const nl = l.losses + 1;
        await tx.swissCampaign.update({ where: { id: l.id }, data: {
          losses: nl, roundsPlayed: l.roundsPlayed + 1, roundDiff: l.roundDiff - 1,
          opponentsIds: { push: winnerId }, isEliminated: nl >= LOSSES_TO_ELIMINATE,
        }});
      }
    });

    const wc = await prisma.swissCampaign.findUnique({ where: { tournamentId_teamId: { tournamentId: TID, teamId: winnerId } } });
    const lc = await prisma.swissCampaign.findUnique({ where: { tournamentId_teamId: { tournamentId: TID, teamId: loserId } } });
    const ws = wc && wc.wins >= WINS_TO_CLASSIFY ? " ✅" : "";
    const ls = lc && lc.losses >= LOSSES_TO_ELIMINATE ? " ❌" : "";
    console.log(`  ${wTag} VENCEU ${lTag}  (${wc?.wins}-${wc?.losses}${ws} | ${lc?.wins}-${lc?.losses}${ls})`);
  }

  await prisma.swissRound.update({ where: { id: round.id }, data: { isComplete: true } });
  console.log(`  ✅ Rodada ${roundNum} completa`);
  return true;
}

async function main() {
  // Marcar R3 como completa se todas as partidas já foram completadas
  const r3 = await prisma.swissRound.findUnique({
    where: { tournamentId_roundNumber: { tournamentId: TID, roundNumber: 3 } },
    include: { matches: { select: { status: true } } },
  });
  if (r3 && !r3.isComplete) {
    const allDone = r3.matches.every((m) => m.status === "COMPLETED");
    if (allDone) await prisma.swissRound.update({ where: { id: r3.id }, data: { isComplete: true } });
    console.log(`R3 marcada como completa: ${allDone}`);
  }

  const stage = await prisma.tournamentStage.findFirst({ where: { tournamentId: TID, type: "SWISS" } });
  if (!stage) throw new Error("Stage não encontrada");

  for (let r = 4; r <= 5; r++) await processRound(r, stage.id);

  // Relatório
  console.log("\n" + "═".repeat(50));
  const camps = await prisma.swissCampaign.findMany({
    where: { tournamentId: TID }, include: { team: { select: { name: true, tag: true } } },
    orderBy: [{ wins: "desc" }, { losses: "asc" }],
  });

  const classified = camps.filter((c) => c.wins >= WINS_TO_CLASSIFY);
  const eliminated = camps.filter((c) => c.losses >= LOSSES_TO_ELIMINATE);
  const active = camps.filter((c) => c.wins < WINS_TO_CLASSIFY && c.losses < LOSSES_TO_ELIMINATE);

  console.log(`\n🟢 CLASSIFICADOS (${classified.length}): ${classified.map((c) => `${c.team.tag}(${c.wins}-${c.losses})`).join(", ")}`);
  console.log(`🔴 ELIMINADOS (${eliminated.length}): ${eliminated.map((c) => `${c.team.tag}(${c.wins}-${c.losses})`).join(", ")}`);
  if (active.length) console.log(`⚪ ATIVOS (${active.length}): ${active.map((c) => `${c.team.tag}(${c.wins}-${c.losses})`).join(", ")}`);

  const impossible = camps.filter((c) => c.wins > 3 || c.losses > 3);
  console.log(impossible.length > 0
    ? `\n❌ Campanhas inválidas: ${impossible.map((c) => `${c.team.tag}(${c.wins}-${c.losses})`).join(", ")}`
    : `\n✅ Nenhuma campanha inválida`
  );

  const rounds = await prisma.swissRound.findMany({ where: { tournamentId: TID }, include: { matches: true }, orderBy: { roundNumber: "asc" } });
  let total = 0; rounds.forEach((r) => { total += r.matches.length; console.log(`Rodada ${r.roundNumber}: ${r.matches.length} partidas`); });
  console.log(`Total: ${total} partidas | Classificados: ${classified.length}/8`);
}

main().catch((e) => { console.error("❌", e.message); }).finally(() => prisma.$disconnect());

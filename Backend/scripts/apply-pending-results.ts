/**
 * Aplica resultados de todas as partidas SCHEDULED no Swiss
 * Mais eficiente que o rebuild — faz tudo em batch
 */
import { PrismaClient, MatchStatus } from "@prisma/client";
import { WINS_TO_CLASSIFY, LOSSES_TO_ELIMINATE } from "../src/services/swiss-pairing.service";

const prisma = new PrismaClient();
const TID = "5f117fad-c3a9-4fcd-a410-fed4efdcd3f2";

async function main() {
  for (let roundNum = 1; roundNum <= 5; roundNum++) {
    const round = await prisma.swissRound.findUnique({
      where: { tournamentId_roundNumber: { tournamentId: TID, roundNumber: roundNum } },
    });
    if (!round) break;
    if (round.isComplete) { console.log(`R${roundNum}: já completa`); continue; }

    const pending = await prisma.match.findMany({
      where: { swissRoundId: round.id, status: MatchStatus.SCHEDULED },
      include: { teamA: { select: { tag: true } }, teamB: { select: { tag: true } } },
    });

    if (pending.length === 0) {
      await prisma.swissRound.update({ where: { id: round.id }, data: { isComplete: true } });
      console.log(`R${roundNum}: marcada como completa`);
      continue;
    }

    console.log(`R${roundNum}: ${pending.length} partidas pendentes`);

    // Aplicar resultados — uma transação por partida (mais seguro)
    for (const match of pending) {
      const seed = match.teamAId.charCodeAt(0) + match.teamBId.charCodeAt(0) + roundNum;
      const winnerId = seed % 2 === 0 ? match.teamAId : match.teamBId;
      const loserId  = seed % 2 === 0 ? match.teamBId : match.teamAId;

      await prisma.$transaction(async (tx) => {
        await tx.match.update({ where: { id: match.id }, data: { winnerTeamId: winnerId, scoreA: 1, scoreB: 0, status: MatchStatus.COMPLETED } });
        const w = await tx.swissCampaign.findUnique({ where: { tournamentId_teamId: { tournamentId: TID, teamId: winnerId } } });
        if (w) await tx.swissCampaign.update({ where: { id: w.id }, data: {
          wins: w.wins + 1, roundsPlayed: w.roundsPlayed + 1, roundDiff: w.roundDiff + 1, opponentsIds: { push: loserId },
        }});
        const l = await tx.swissCampaign.findUnique({ where: { tournamentId_teamId: { tournamentId: TID, teamId: loserId } } });
        if (l) { const nl = l.losses + 1; await tx.swissCampaign.update({ where: { id: l.id }, data: {
          losses: nl, roundsPlayed: l.roundsPlayed + 1, roundDiff: l.roundDiff - 1,
          opponentsIds: { push: winnerId }, isEliminated: nl >= LOSSES_TO_ELIMINATE,
        }}); }
      });

      const wTag = winnerId === match.teamAId ? match.teamA.tag : match.teamB.tag;
      const lTag = winnerId === match.teamAId ? match.teamB.tag : match.teamA.tag;
      console.log(`  ${wTag} VENCEU ${lTag}`);
    }

    await prisma.swissRound.update({ where: { id: round.id }, data: { isComplete: true } });
    console.log(`  ✅ R${roundNum} completa\n`);

    // Gerar próxima rodada se necessário
    const nextRound = roundNum + 1;
    if (nextRound > 5) break;

    const active = await prisma.swissCampaign.count({
      where: { tournamentId: TID, wins: { lt: WINS_TO_CLASSIFY }, losses: { lt: LOSSES_TO_ELIMINATE } },
    });
    if (active === 0) { console.log("Fase encerrada."); break; }
    if (active % 2 !== 0) { console.log(`⚠️  ${active} times ativos (ímpar) para R${nextRound}`); break; }

    // Verificar se próxima rodada já existe
    const nextExists = await prisma.swissRound.findUnique({
      where: { tournamentId_roundNumber: { tournamentId: TID, roundNumber: nextRound } },
      include: { matches: true },
    });
    if (!nextExists || nextExists.matches.length === 0) {
      const { generateSwissPairings } = await import("../src/services/swiss-pairing.service");
      const stage = await prisma.tournamentStage.findFirst({ where: { tournamentId: TID, type: "SWISS" } });
      if (!stage) continue;

      const pairs = await generateSwissPairings(TID, nextRound);
      const newRound = await prisma.swissRound.upsert({
        where: { tournamentId_roundNumber: { tournamentId: TID, roundNumber: nextRound } },
        create: { tournamentId: TID, roundNumber: nextRound, isComplete: false },
        update: {},
      });
      for (const p of pairs) {
        await prisma.match.create({ data: {
          tournamentId: TID, stageId: stage.id, swissRoundId: newRound.id,
          teamAId: p.teamAId, teamBId: p.teamBId, seriesFormat: "BO1", status: MatchStatus.SCHEDULED,
        }});
      }
      console.log(`R${nextRound} gerada: ${pairs.length} pares (${active} ativos)`);
    }
  }

  // Relatório final
  console.log("\n" + "═".repeat(50));
  const camps = await prisma.swissCampaign.findMany({
    where: { tournamentId: TID }, include: { team: { select: { name: true, tag: true } } },
    orderBy: [{ wins: "desc" }, { losses: "asc" }],
  });
  const classified = camps.filter((c) => c.wins >= WINS_TO_CLASSIFY);
  const eliminated = camps.filter((c) => c.losses >= LOSSES_TO_ELIMINATE);
  const active = camps.filter((c) => c.wins < WINS_TO_CLASSIFY && c.losses < LOSSES_TO_ELIMINATE);
  const impossible = camps.filter((c) => c.wins > 3 || c.losses > 3);

  console.log(`🟢 CLASSIFICADOS (${classified.length}): ${classified.map((c) => `${c.team.tag}(${c.wins}-${c.losses})`).join(", ")}`);
  console.log(`🔴 ELIMINADOS (${eliminated.length}): ${eliminated.map((c) => `${c.team.tag}(${c.wins}-${c.losses})`).join(", ")}`);
  if (active.length) console.log(`⚪ ATIVOS (${active.length}): ${active.map((c) => `${c.team.tag}(${c.wins}-${c.losses})`).join(", ")}`);

  const rounds = await prisma.swissRound.findMany({ where: { tournamentId: TID }, include: { matches: true }, orderBy: { roundNumber: "asc" } });
  let total = 0; rounds.forEach((r) => { total += r.matches.length; console.log(`R${r.roundNumber}: ${r.matches.length} partidas`); });
  console.log(`Total: ${total}`);
  console.log(impossible.length === 0 ? "✅ Nenhuma campanha inválida" : `❌ Campanhas inválidas: ${impossible.map((c) => `${c.team.tag}(${c.wins}-${c.losses})`).join(", ")}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

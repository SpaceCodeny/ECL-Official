/**
 * Reconstrução limpa do Swiss 3W/3L
 * Processa uma rodada por vez, sem timeouts.
 */
import { PrismaClient, MatchStatus } from "@prisma/client";
import { generateSwissPairings, WINS_TO_CLASSIFY, LOSSES_TO_ELIMINATE } from "../src/services/swiss-pairing.service";

const prisma = new PrismaClient();
const TID = "5f117fad-c3a9-4fcd-a410-fed4efdcd3f2";

const R1_PAIRS: [string, string][] = [
  ["Sharks Esports","Flamengo Esports"],["Palmeiras Esports","9z Team"],
  ["SilentFury 3","Grêmio Esports"],["Corinthians Esports","Santos Esports"],
  ["Vivo Keyd","MIBR"],["BLOCKS","paiN Gaming"],["Fluxo","Vasco Esports"],
  ["Los Grandes","TeamOne"],["FURIA Esports","Athletico Esports"],["LOUD","KaBuM! Esports"],
];
const R1_WINNERS = [
  "Flamengo Esports","9z Team","SilentFury 3","Corinthians Esports","MIBR",
  "BLOCKS","Fluxo","Los Grandes","FURIA Esports","LOUD",
];

async function main() {
  // ── Reset ────────────────────────────────────────────────────────────────
  await prisma.match.deleteMany({ where: { tournamentId: TID, swissRoundId: { not: null } } });
  await prisma.swissRound.deleteMany({ where: { tournamentId: TID } });
  await prisma.swissCampaign.deleteMany({ where: { tournamentId: TID } });
  await prisma.tournamentStage.deleteMany({ where: { tournamentId: TID, type: "SWISS" } });
  console.log("✓ Reset concluído");

  const regs = await prisma.tournamentRegistration.findMany({
    where: { tournamentId: TID, status: "APPROVED" },
    include: { team: { select: { id: true, name: true, tag: true } } },
  });
  if (regs.length !== 20) throw new Error(`Esperado 20 times, encontrado ${regs.length}`);
  const byName = new Map(regs.map((r) => [r.team.name, r.teamId]));

  const stage = await prisma.tournamentStage.create({
    data: { tournamentId: TID, name: "Fase Suíça", type: "SWISS", order: 1, seriesFormat: "BO1" },
  });

  await prisma.swissCampaign.createMany({
    data: regs.map((r) => ({
      tournamentId: TID, teamId: r.teamId, wins: 0, losses: 0,
      roundsPlayed: 0, roundDiff: 0, opponentsIds: [], isEliminated: false,
    })),
  });
  console.log("✓ Stage e 20 campanhas criados\n");

  // ── Rodadas ──────────────────────────────────────────────────────────────
  for (let roundNum = 1; roundNum <= 5; roundNum++) {
    const activeCount = await prisma.swissCampaign.count({
      where: { tournamentId: TID, wins: { lt: WINS_TO_CLASSIFY }, losses: { lt: LOSSES_TO_ELIMINATE } },
    });
    if (activeCount === 0) { console.log(`R${roundNum}: fase encerrada.`); break; }
    if (activeCount % 2 !== 0) {
      console.error(`❌ R${roundNum}: ${activeCount} times ativos (ímpar) — estado corrompido`);
      break;
    }

    // Gerar pares
    let pairs: { teamAId: string; teamBId: string }[];
    if (roundNum === 1) {
      pairs = R1_PAIRS.map(([a, b]) => {
        const aId = byName.get(a!), bId = byName.get(b!);
        if (!aId || !bId) throw new Error(`Time não encontrado: ${a} ou ${b}`);
        return { teamAId: aId, teamBId: bId };
      });
    } else {
      pairs = await generateSwissPairings(TID, roundNum);
    }

    console.log(`R${roundNum}: ${activeCount} ativos → ${pairs.length} pares`);

    // Criar rodada e partidas
    const round = await prisma.swissRound.create({
      data: { tournamentId: TID, roundNumber: roundNum, isComplete: false },
    });

    const matchRecords: { id: string; teamAId: string; teamBId: string }[] = [];
    for (const p of pairs) {
      const m = await prisma.match.create({
        data: {
          tournamentId: TID, stageId: stage.id, swissRoundId: round.id,
          teamAId: p.teamAId, teamBId: p.teamBId, seriesFormat: "BO1", status: MatchStatus.SCHEDULED,
        },
      });
      matchRecords.push(m);
    }

    // Aplicar resultados (uma transação por partida, sem batch grande)
    for (let i = 0; i < matchRecords.length; i++) {
      const m = matchRecords[i]!;
      const pairInfo = pairs[i]!;

      let winnerId: string, loserId: string;
      if (roundNum === 1) {
        const wName = R1_WINNERS[i]!;
        const aReg = regs.find((r) => r.teamId === pairInfo.teamAId);
        winnerId = aReg?.team.name === wName ? pairInfo.teamAId : pairInfo.teamBId;
        loserId  = aReg?.team.name === wName ? pairInfo.teamBId : pairInfo.teamAId;
      } else {
        const seed = m.teamAId.charCodeAt(0) + m.teamBId.charCodeAt(0) + roundNum;
        winnerId = seed % 2 === 0 ? m.teamAId : m.teamBId;
        loserId  = seed % 2 === 0 ? m.teamBId : m.teamAId;
      }

      // Atualizar match
      await prisma.match.update({
        where: { id: m.id },
        data: { winnerTeamId: winnerId, scoreA: 1, scoreB: 0, status: MatchStatus.COMPLETED },
      });

      // Atualizar vencedor
      const wCamp = await prisma.swissCampaign.findUnique({
        where: { tournamentId_teamId: { tournamentId: TID, teamId: winnerId } },
      });
      if (!wCamp) throw new Error(`Campanha não encontrada: ${winnerId}`);
      const newW = wCamp.wins + 1;
      await prisma.swissCampaign.update({
        where: { id: wCamp.id },
        data: { wins: newW, roundsPlayed: wCamp.roundsPlayed + 1, roundDiff: wCamp.roundDiff + 1, opponentsIds: { push: loserId } },
      });

      // Atualizar perdedor
      const lCamp = await prisma.swissCampaign.findUnique({
        where: { tournamentId_teamId: { tournamentId: TID, teamId: loserId } },
      });
      if (!lCamp) throw new Error(`Campanha não encontrada: ${loserId}`);
      const newL = lCamp.losses + 1;
      await prisma.swissCampaign.update({
        where: { id: lCamp.id },
        data: {
          losses: newL, roundsPlayed: lCamp.roundsPlayed + 1, roundDiff: lCamp.roundDiff - 1,
          opponentsIds: { push: winnerId }, isEliminated: newL >= LOSSES_TO_ELIMINATE,
        },
      });

      const wReg = regs.find((r) => r.teamId === winnerId);
      const lReg = regs.find((r) => r.teamId === loserId);
      const wFlag = newW >= WINS_TO_CLASSIFY ? " ✅" : "";
      const lFlag = newL >= LOSSES_TO_ELIMINATE ? " ❌" : "";
      process.stdout.write(`  ${wReg?.team.tag} VENCEU ${lReg?.team.tag} (${newW}-${wCamp.losses}${wFlag} | ${lCamp.wins}-${newL}${lFlag})\n`);
    }

    await prisma.swissRound.update({ where: { id: round.id }, data: { isComplete: true } });

    // Resumo da rodada
    const afterClassified = await prisma.swissCampaign.count({ where: { tournamentId: TID, wins: { gte: WINS_TO_CLASSIFY } } });
    const afterEliminated = await prisma.swissCampaign.count({ where: { tournamentId: TID, losses: { gte: LOSSES_TO_ELIMINATE } } });
    const afterActive = 20 - afterClassified - afterEliminated;
    console.log(`  ✅ R${roundNum} completa | Classificados: ${afterClassified} | Eliminados: ${afterEliminated} | Ativos: ${afterActive}\n`);
  }

  // ── Relatório final ──────────────────────────────────────────────────────
  console.log("═".repeat(60));
  const camps = await prisma.swissCampaign.findMany({
    where: { tournamentId: TID }, include: { team: { select: { name: true, tag: true } } },
    orderBy: [{ wins: "desc" }, { losses: "asc" }],
  });

  const classified = camps.filter((c) => c.wins >= WINS_TO_CLASSIFY);
  const eliminated = camps.filter((c) => c.losses >= LOSSES_TO_ELIMINATE);
  const active     = camps.filter((c) => c.wins < WINS_TO_CLASSIFY && c.losses < LOSSES_TO_ELIMINATE);
  const impossible = camps.filter((c) => c.wins > 3 || c.losses > 3);

  console.log(`\n🟢 CLASSIFICADOS (${classified.length}/8):`);
  classified.forEach((c) => console.log(`  ${c.team.name.padEnd(22)} ${c.wins}-${c.losses}`));

  console.log(`\n🔴 ELIMINADOS (${eliminated.length}/12):`);
  eliminated.forEach((c) => console.log(`  ${c.team.name.padEnd(22)} ${c.wins}-${c.losses}`));

  if (active.length > 0) {
    console.log(`\n⚪ AINDA ATIVOS (${active.length}):`);
    active.forEach((c) => console.log(`  ${c.team.name}: ${c.wins}-${c.losses}`));
  }

  const rounds = await prisma.swissRound.findMany({
    where: { tournamentId: TID }, include: { matches: true }, orderBy: { roundNumber: "asc" },
  });
  let total = 0;
  rounds.forEach((r) => { total += r.matches.length; console.log(`R${r.roundNumber}: ${r.matches.length} partidas`); });
  console.log(`Total: ${total} partidas\n`);

  if (impossible.length > 0) {
    console.log(`❌ Campanhas inválidas: ${impossible.map((c) => `${c.team.tag}(${c.wins}-${c.losses})`).join(", ")}`);
  } else {
    console.log(`✅ Nenhuma campanha inválida (max 3W/3L respeitado)`);
  }
  console.log(classified.length === 8 ? `✅ 8 classificados confirmados!` : `⚠️  ${classified.length} classificados`);
}

main().catch((e) => { console.error("❌", e.message, e.stack); }).finally(() => prisma.$disconnect());

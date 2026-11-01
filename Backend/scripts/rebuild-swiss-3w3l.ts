/**
 * Reconstrução do Swiss Test com regra oficial 3W/3L
 *
 * Regras:
 * - 20 times, máx 5 rodadas, MD1
 * - 3 vitórias = classificado (para de jogar)
 * - 3 derrotas  = eliminado   (para de jogar)
 * - 8 classificados, 12 eliminados
 *
 * Campanhas possíveis: 3-0, 3-1, 3-2, 0-3, 1-3, 2-3
 * Campanhas IMPOSSÍVEIS: 4-x, x-4, 5-x, x-5
 */
import { PrismaClient, MatchStatus } from "@prisma/client";
import { generateSwissPairings, WINS_TO_CLASSIFY, LOSSES_TO_ELIMINATE } from "../src/services/swiss-pairing.service";

const prisma = new PrismaClient();
const TID_SLUG = "ecl-swiss-test-2024";

// Pares fixos da Rodada 1 (determinístico)
const R1_PAIRS: [string, string][] = [
  ["Sharks Esports",      "Flamengo Esports"],
  ["Palmeiras Esports",   "9z Team"],
  ["SilentFury 3",        "Grêmio Esports"],
  ["Corinthians Esports", "Santos Esports"],
  ["Vivo Keyd",           "MIBR"],
  ["BLOCKS",              "paiN Gaming"],
  ["Fluxo",               "Vasco Esports"],
  ["Los Grandes",         "TeamOne"],
  ["FURIA Esports",       "Athletico Esports"],
  ["LOUD",                "KaBuM! Esports"],
];

// Vencedores fixos da Rodada 1
const R1_WINNERS = [
  "Flamengo Esports", "9z Team", "SilentFury 3", "Corinthians Esports",
  "MIBR", "BLOCKS", "Fluxo", "Los Grandes", "FURIA Esports", "LOUD",
];

async function main() {
  const tournament = await prisma.tournament.findUnique({ where: { slug: TID_SLUG } });
  if (!tournament) throw new Error(`Torneio ${TID_SLUG} não encontrado`);

  const tid = tournament.id;
  console.log(`\n🏆 ${tournament.name}`);
  console.log(`Regra: ${WINS_TO_CLASSIFY}W = classificado | ${LOSSES_TO_ELIMINATE}L = eliminado\n`);

  // ── Reset ────────────────────────────────────────────────────────────────
  console.log("🔄 Resetando...");
  await prisma.match.deleteMany({ where: { tournamentId: tid, swissRoundId: { not: null } } });
  await prisma.swissRound.deleteMany({ where: { tournamentId: tid } });
  await prisma.swissCampaign.deleteMany({ where: { tournamentId: tid } });
  await prisma.tournamentStage.deleteMany({ where: { tournamentId: tid, type: "SWISS" } });
  console.log("  ✓ Dados removidos\n");

  // ── Verificar times ──────────────────────────────────────────────────────
  const regs = await prisma.tournamentRegistration.findMany({
    where: { tournamentId: tid, status: "APPROVED" },
    include: { team: { select: { id: true, name: true, tag: true } } },
  });
  if (regs.length !== 20) throw new Error(`Esperado 20 times, encontrado ${regs.length}`);

  const byName = new Map(regs.map((r) => [r.team.name, r.teamId]));

  // ── Criar stage e campanhas ──────────────────────────────────────────────
  const stage = await prisma.tournamentStage.create({
    data: { tournamentId: tid, name: "Fase Suíça", type: "SWISS", order: 1, seriesFormat: "BO1" },
  });
  await prisma.swissCampaign.createMany({
    data: regs.map((r) => ({
      tournamentId: tid, teamId: r.teamId,
      wins: 0, losses: 0, roundsPlayed: 0, roundDiff: 0, opponentsIds: [], isEliminated: false,
    })),
  });
  console.log("✓ Stage e campanhas criados\n");

  // ── Gerar rodadas ────────────────────────────────────────────────────────
  for (let roundNum = 1; roundNum <= 5; roundNum++) {
    // Verificar se ainda há times ativos
    const active = await prisma.swissCampaign.count({
      where: { tournamentId: tid, wins: { lt: WINS_TO_CLASSIFY }, losses: { lt: LOSSES_TO_ELIMINATE } },
    });
    if (active === 0) {
      console.log(`\n✅ Todos classificados/eliminados antes da rodada ${roundNum}. Fase encerrada.\n`);
      break;
    }
    if (active < 2) {
      console.log(`\n⚠️  Apenas ${active} time ativo na rodada ${roundNum}. Não é possível gerar confrontos.\n`);
      break;
    }

    console.log(`${"─".repeat(60)}`);
    console.log(`📍 RODADA ${roundNum} (${active} times ativos)`);

    const round = await prisma.swissRound.create({
      data: { tournamentId: tid, roundNumber: roundNum, isComplete: false },
    });

    // Obter pares
    let pairs: { teamAId: string; teamBId: string }[];
    if (roundNum === 1) {
      pairs = R1_PAIRS.map(([nameA, nameB]) => {
        const a = byName.get(nameA!), b = byName.get(nameB!);
        if (!a || !b) throw new Error(`Time não encontrado: ${nameA} ou ${nameB}`);
        return { teamAId: a, teamBId: b };
      });
      console.log(`  Confrontos: ${pairs.length} (sorteio fixo)`);
    } else {
      pairs = await generateSwissPairings(tid, roundNum);
      console.log(`  Confrontos: ${pairs.length}`);
    }

    // Criar partidas + simular resultados
    for (const p of pairs) {
      const match = await prisma.match.create({
        data: {
          tournamentId: tid, stageId: stage.id, swissRoundId: round.id,
          teamAId: p.teamAId, teamBId: p.teamBId, seriesFormat: "BO1", status: MatchStatus.SCHEDULED,
        },
        include: {
          teamA: { select: { id: true, name: true, tag: true } },
          teamB: { select: { id: true, name: true, tag: true } },
        },
      });

      // Vencedor: rodada 1 fixo, demais por seed
      let winnerId: string, loserId: string;
      if (roundNum === 1) {
        const pIdx = pairs.indexOf(p);
        const winnerName = R1_WINNERS[pIdx]!;
        winnerId = match.teamA.name === winnerName ? match.teamAId : match.teamBId;
        loserId  = match.teamA.name === winnerName ? match.teamBId : match.teamAId;
      } else {
        const seed = match.teamAId.charCodeAt(0) + match.teamBId.charCodeAt(0) + roundNum;
        winnerId = seed % 2 === 0 ? match.teamAId : match.teamBId;
        loserId  = seed % 2 === 0 ? match.teamBId : match.teamAId;
      }

      await prisma.$transaction(async (tx) => {
        await tx.match.update({
          where: { id: match.id },
          data: { winnerTeamId: winnerId, scoreA: 1, scoreB: 0, status: MatchStatus.COMPLETED },
        });

        const winner = await tx.swissCampaign.findUnique({
          where: { tournamentId_teamId: { tournamentId: tid, teamId: winnerId } },
        });
        if (!winner) throw new Error(`Campanha não encontrada: ${winnerId}`);
        const newW = winner.wins + 1;
        await tx.swissCampaign.update({
          where: { id: winner.id },
          data: { wins: newW, roundsPlayed: winner.roundsPlayed + 1, roundDiff: winner.roundDiff + 1, opponentsIds: { push: loserId } },
        });

        const loser = await tx.swissCampaign.findUnique({
          where: { tournamentId_teamId: { tournamentId: tid, teamId: loserId } },
        });
        if (!loser) throw new Error(`Campanha não encontrada: ${loserId}`);
        const newL = loser.losses + 1;
        await tx.swissCampaign.update({
          where: { id: loser.id },
          data: {
            losses: newL, roundsPlayed: loser.roundsPlayed + 1, roundDiff: loser.roundDiff - 1,
            opponentsIds: { push: winnerId }, isEliminated: newL >= LOSSES_TO_ELIMINATE,
          },
        });
      });

      const wTag = winnerId === match.teamAId ? match.teamA.tag : match.teamB.tag;
      const lTag = winnerId === match.teamAId ? match.teamB.tag : match.teamA.tag;

      // Buscar campanha atual para mostrar
      const wCamp = await prisma.swissCampaign.findUnique({ where: { tournamentId_teamId: { tournamentId: tid, teamId: winnerId } } });
      const lCamp = await prisma.swissCampaign.findUnique({ where: { tournamentId_teamId: { tournamentId: tid, teamId: loserId } } });
      const wStatus = wCamp && wCamp.wins >= WINS_TO_CLASSIFY ? " → ✅ CLASSIFICADO" : "";
      const lStatus = lCamp && lCamp.losses >= LOSSES_TO_ELIMINATE ? " → ❌ ELIMINADO" : "";
      console.log(`  ${wTag} VENCEU ${lTag}  (${wCamp?.wins}-${wCamp?.losses}${wStatus} | ${lCamp?.wins}-${lCamp?.losses}${lStatus})`);
    }

    await prisma.swissRound.update({ where: { id: round.id }, data: { isComplete: true } });
    console.log(`  ✅ Rodada ${roundNum} completa\n`);
  }

  // ── Relatório final ──────────────────────────────────────────────────────
  console.log("═".repeat(60));
  console.log("📊 RELATÓRIO FINAL");
  console.log("═".repeat(60));

  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId: tid },
    include: { team: { select: { name: true, tag: true } } },
    orderBy: [{ wins: "desc" }, { losses: "asc" }],
  });

  const classified = campaigns.filter((c) => c.wins >= WINS_TO_CLASSIFY);
  const eliminated = campaigns.filter((c) => c.losses >= LOSSES_TO_ELIMINATE);
  const active     = campaigns.filter((c) => c.wins < WINS_TO_CLASSIFY && c.losses < LOSSES_TO_ELIMINATE);

  console.log(`\n🟢 CLASSIFICADOS (${classified.length}):`);
  classified.forEach((c) => console.log(`  ${c.team.name.padEnd(22)} ${c.wins}-${c.losses}`));

  console.log(`\n🔴 ELIMINADOS (${eliminated.length}):`);
  eliminated.forEach((c) => console.log(`  ${c.team.name.padEnd(22)} ${c.wins}-${c.losses}`));

  if (active.length > 0) {
    console.log(`\n⚪ EM JOGO (${active.length}):`);
    active.forEach((c) => console.log(`  ${c.team.name.padEnd(22)} ${c.wins}-${c.losses}`));
  }

  // Validar campanhas impossíveis
  const impossible = campaigns.filter((c) => c.wins > 3 || c.losses > 3);
  if (impossible.length > 0) {
    console.log(`\n❌ CAMPANHAS INVÁLIDAS (deveriam ser impossíveis):`);
    impossible.forEach((c) => console.log(`  ${c.team.name}: ${c.wins}-${c.losses}`));
  } else {
    console.log(`\n✅ Nenhuma campanha inválida (nenhum time com 4+ vitórias ou 4+ derrotas)`);
  }

  const allRounds = await prisma.swissRound.findMany({
    where: { tournamentId: tid }, include: { matches: true }, orderBy: { roundNumber: "asc" },
  });
  let totalMatches = 0;
  allRounds.forEach((r) => { totalMatches += r.matches.length; console.log(`Rodada ${r.roundNumber}: ${r.matches.length} partidas`); });
  console.log(`Total: ${totalMatches} partidas`);

  const maxMatches = Math.max(...campaigns.map((c) => c.roundsPlayed));
  console.log(`\nMáximo de partidas por time: ${maxMatches} (máx permitido: 5)`);

  if (classified.length === 8) {
    console.log(`\n✅ 8 classificados confirmados!`);
  } else {
    console.log(`\n⚠️  ${classified.length} classificados (esperado: 8)`);
  }

  console.log("\n" + "═".repeat(60));
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); }).finally(() => prisma.$disconnect());

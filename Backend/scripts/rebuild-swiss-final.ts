/**
 * RECONSTRUÇÃO FINAL DO SWISS — Regra 3W/3L
 *
 * Fluxo correto:
 * 1. GERAR todos os pares da rodada N (com base no estado inicial da rodada)
 * 2. SIMULAR resultados (classificações/eliminações acontecem aqui)
 * 3. Marcar rodada como completa
 * 4. GERAR pares da rodada N+1 (agora com menos times ativos)
 *
 * Pares são gerados uma única vez por rodada, NUNCA no meio da simulação.
 *
 * Com 20 times e regra 3W/3L:
 * - R1: 20 ativos → 10 jogos → R2: ainda 20 ativos (ninguém atingiu 3W/3L após 1 jogo)
 * - R2: 20 ativos → 10 jogos → R3: ainda 20 ativos
 * - R3: 20 ativos → 10 jogos → R4: entre 0-20 ativos (primeiros 3-0/0-3 saem)
 * - R4: X ativos (deve ser par) → X/2 jogos
 * - R5: Y ativos (deve ser par) → Y/2 jogos
 */
import { PrismaClient, MatchStatus } from "@prisma/client";
import { generateSwissPairings, WINS_TO_CLASSIFY, LOSSES_TO_ELIMINATE } from "../src/services/swiss-pairing.service";

const prisma = new PrismaClient();
const TID_SLUG = "ecl-swiss-test-2024";

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

async function applyResult(tid: string, matchId: string, winnerId: string, loserId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.match.update({ where: { id: matchId }, data: { winnerTeamId: winnerId, scoreA: 1, scoreB: 0, status: MatchStatus.COMPLETED } });
    const w = await tx.swissCampaign.findUnique({ where: { tournamentId_teamId: { tournamentId: tid, teamId: winnerId } } });
    if (w) await tx.swissCampaign.update({ where: { id: w.id }, data: {
      wins: w.wins + 1, roundsPlayed: w.roundsPlayed + 1, roundDiff: w.roundDiff + 1, opponentsIds: { push: loserId },
    }});
    const l = await tx.swissCampaign.findUnique({ where: { tournamentId_teamId: { tournamentId: tid, teamId: loserId } } });
    if (l) { const nl = l.losses + 1; await tx.swissCampaign.update({ where: { id: l.id }, data: {
      losses: nl, roundsPlayed: l.roundsPlayed + 1, roundDiff: l.roundDiff - 1, opponentsIds: { push: winnerId }, isEliminated: nl >= LOSSES_TO_ELIMINATE,
    }}); }
  });
}

async function runRound(tid: string, roundNum: number, stageId: string, byName: Map<string, string>) {
  const active = await prisma.swissCampaign.count({
    where: { tournamentId: tid, wins: { lt: WINS_TO_CLASSIFY }, losses: { lt: LOSSES_TO_ELIMINATE } },
  });
  if (active === 0) { console.log(`\nR${roundNum}: fase encerrada (0 times ativos)`); return false; }
  if (active % 2 !== 0) { console.log(`\n⚠️  R${roundNum}: ${active} times ativos (ímpar) — verificar regras`); return false; }

  console.log(`\n${"─".repeat(55)}\n📍 RODADA ${roundNum} (${active} times ativos)`);

  // Criar rodada
  const round = await prisma.swissRound.upsert({
    where: { tournamentId_roundNumber: { tournamentId: tid, roundNumber: roundNum } },
    create: { tournamentId: tid, roundNumber: roundNum, isComplete: false },
    update: {},
  });

  // Gerar TODOS os pares primeiro
  let pairs: { teamAId: string; teamBId: string }[];
  if (roundNum === 1) {
    pairs = R1_PAIRS.map(([a, b]) => ({ teamAId: byName.get(a!)!, teamBId: byName.get(b!)! }));
  } else {
    pairs = await generateSwissPairings(tid, roundNum);
  }
  console.log(`  Pares gerados: ${pairs.length}`);

  // Criar partidas no banco (ainda SCHEDULED)
  const matches: { id: string; teamAId: string; teamBId: string; teamA: any; teamB: any }[] = [];
  for (const p of pairs) {
    const m = await prisma.match.create({
      data: { tournamentId: tid, stageId, swissRoundId: round.id, teamAId: p.teamAId, teamBId: p.teamBId, seriesFormat: "BO1", status: MatchStatus.SCHEDULED },
      include: { teamA: { select: { name: true, tag: true } }, teamB: { select: { name: true, tag: true } } },
    });
    matches.push(m);
  }

  // Agora simular resultados
  for (const match of matches) {
    let winnerId: string, loserId: string;
    if (roundNum === 1) {
      const pIdx = pairs.findIndex((p) => p.teamAId === match.teamAId && p.teamBId === match.teamBId);
      const wName = R1_WINNERS[pIdx]!;
      winnerId = match.teamA.name === wName ? match.teamAId : match.teamBId;
      loserId  = match.teamA.name === wName ? match.teamBId : match.teamAId;
    } else {
      const seed = match.teamAId.charCodeAt(0) + match.teamBId.charCodeAt(0) + roundNum;
      winnerId = seed % 2 === 0 ? match.teamAId : match.teamBId;
      loserId  = seed % 2 === 0 ? match.teamBId : match.teamAId;
    }

    await applyResult(tid, match.id, winnerId, loserId);

    const wc = await prisma.swissCampaign.findUnique({ where: { tournamentId_teamId: { tournamentId: tid, teamId: winnerId } } });
    const lc = await prisma.swissCampaign.findUnique({ where: { tournamentId_teamId: { tournamentId: tid, teamId: loserId } } });
    const wTag = winnerId === match.teamAId ? match.teamA.tag : match.teamB.tag;
    const lTag = winnerId === match.teamAId ? match.teamB.tag : match.teamA.tag;
    const ws = wc && wc.wins >= WINS_TO_CLASSIFY ? " ✅" : "";
    const ls = lc && lc.losses >= LOSSES_TO_ELIMINATE ? " ❌" : "";
    console.log(`  ${wTag} VENCEU ${lTag}  (${wc?.wins}-${wc?.losses}${ws} | ${lc?.wins}-${lc?.losses}${ls})`);
  }

  await prisma.swissRound.update({ where: { id: round.id }, data: { isComplete: true } });
  console.log(`  ✅ Rodada ${roundNum} completa`);
  return true;
}

async function main() {
  const tournament = await prisma.tournament.findUnique({ where: { slug: TID_SLUG } });
  if (!tournament) throw new Error(`Torneio não encontrado`);
  const tid = tournament.id;

  // Reset
  console.log("🔄 Resetando...");
  await prisma.match.deleteMany({ where: { tournamentId: tid, swissRoundId: { not: null } } });
  await prisma.swissRound.deleteMany({ where: { tournamentId: tid } });
  await prisma.swissCampaign.deleteMany({ where: { tournamentId: tid } });
  await prisma.tournamentStage.deleteMany({ where: { tournamentId: tid, type: "SWISS" } });

  const regs = await prisma.tournamentRegistration.findMany({
    where: { tournamentId: tid, status: "APPROVED" },
    include: { team: { select: { id: true, name: true, tag: true } } },
  });
  if (regs.length !== 20) throw new Error(`Esperado 20, encontrado ${regs.length}`);

  const byName = new Map(regs.map((r) => [r.team.name, r.teamId]));
  const stage = await prisma.tournamentStage.create({
    data: { tournamentId: tid, name: "Fase Suíça", type: "SWISS", order: 1, seriesFormat: "BO1" },
  });
  await prisma.swissCampaign.createMany({
    data: regs.map((r) => ({ tournamentId: tid, teamId: r.teamId, wins: 0, losses: 0, roundsPlayed: 0, roundDiff: 0, opponentsIds: [], isEliminated: false })),
  });
  console.log(`✓ 20 times, stage criado\n`);

  for (let r = 1; r <= 5; r++) {
    const ok = await runRound(tid, r, stage.id, byName);
    if (!ok) break;
  }

  // Relatório
  console.log("\n" + "═".repeat(55));
  const camps = await prisma.swissCampaign.findMany({
    where: { tournamentId: tid }, include: { team: { select: { name: true, tag: true } } },
    orderBy: [{ wins: "desc" }, { losses: "asc" }],
  });

  const classified = camps.filter((c) => c.wins >= WINS_TO_CLASSIFY);
  const eliminated = camps.filter((c) => c.losses >= LOSSES_TO_ELIMINATE);
  const active = camps.filter((c) => c.wins < WINS_TO_CLASSIFY && c.losses < LOSSES_TO_ELIMINATE);
  const impossible = camps.filter((c) => c.wins > 3 || c.losses > 3);

  console.log(`\n🟢 CLASSIFICADOS (${classified.length}/8):`);
  classified.forEach((c) => console.log(`  ${c.team.name.padEnd(22)} ${c.wins}-${c.losses}`));
  console.log(`\n🔴 ELIMINADOS (${eliminated.length}/12):`);
  eliminated.forEach((c) => console.log(`  ${c.team.name.padEnd(22)} ${c.wins}-${c.losses}`));
  if (active.length) { console.log(`\n⚪ AINDA ATIVOS (${active.length}):`); active.forEach((c) => console.log(`  ${c.team.name}: ${c.wins}-${c.losses}`)); }

  const rounds = await prisma.swissRound.findMany({ where: { tournamentId: tid }, include: { matches: true }, orderBy: { roundNumber: "asc" } });
  let total = 0; rounds.forEach((r) => { total += r.matches.length; console.log(`R${r.roundNumber}: ${r.matches.length} partidas`); });
  console.log(`Total: ${total} partidas`);

  if (impossible.length > 0) {
    console.log(`\n❌ Campanhas inválidas: ${impossible.map((c) => `${c.team.tag}(${c.wins}-${c.losses})`).join(", ")}`);
  } else {
    console.log(`\n✅ Nenhuma campanha inválida (max 3W / 3L respeitado)`);
  }

  console.log(classified.length === 8 ? "\n✅ 8 classificados!" : `\n⚠️  ${classified.length} classificados (esperado 8)`);
}

main().catch((e) => { console.error("❌", e.message); }).finally(() => prisma.$disconnect());

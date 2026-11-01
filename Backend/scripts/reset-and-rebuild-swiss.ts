/**
 * Reset completo + reconstrução do Swiss Test
 * Regras: 20 times, 5 rodadas, 10 partidas/rodada, 50 total
 * TODOS os times jogam todas as 5 rodadas
 */
import { PrismaClient, MatchStatus } from "@prisma/client";
import { generateSwissPairings } from "../src/services/swiss-pairing.service";

const prisma = new PrismaClient();
const TOURNAMENT_SLUG = "ecl-swiss-test-2024";

// ─── Pares fixos da Rodada 1 (sorteio determinístico para teste) ───────────
const ROUND1_PAIRS = [
  ["Sharks Esports",     "Flamengo Esports"],
  ["Palmeiras Esports",  "9z Team"],
  ["SilentFury 3",       "Grêmio Esports"],
  ["Corinthians Esports","Santos Esports"],
  ["Vivo Keyd",          "MIBR"],
  ["BLOCKS",             "paiN Gaming"],
  ["Fluxo",              "Vasco Esports"],
  ["Los Grandes",        "TeamOne"],
  ["FURIA Esports",      "Athletico Esports"],
  ["LOUD",               "KaBuM! Esports"],
];

// ─── Resultados da Rodada 1 (determinísticos para teste) ──────────────────
const ROUND1_WINNERS = [
  "Flamengo Esports",
  "9z Team",
  "SilentFury 3",
  "Corinthians Esports",
  "MIBR",
  "BLOCKS",
  "Fluxo",
  "Los Grandes",
  "FURIA Esports",
  "LOUD",
];

async function main() {
  const tournament = await prisma.tournament.findUnique({
    where: { slug: TOURNAMENT_SLUG },
  });
  if (!tournament) throw new Error(`Torneio ${TOURNAMENT_SLUG} não encontrado`);

  const tid = tournament.id;
  console.log(`\n🏆 ${tournament.name} (${tid})\n`);

  // ── PASSO 1: Reset Swiss ───────────────────────────────────────────────────
  console.log("🔄 Resetando sistema Swiss...");

  await prisma.match.deleteMany({
    where: { tournamentId: tid, swissRoundId: { not: null } },
  });
  await prisma.swissRound.deleteMany({ where: { tournamentId: tid } });
  await prisma.swissCampaign.deleteMany({ where: { tournamentId: tid } });
  await prisma.tournamentStage.deleteMany({ where: { tournamentId: tid, type: "SWISS" } });

  console.log("  ✓ Dados anteriores removidos");

  // ── PASSO 2: Verificar times ───────────────────────────────────────────────
  const registrations = await prisma.tournamentRegistration.findMany({
    where: { tournamentId: tid, status: "APPROVED" },
    include: { team: { select: { id: true, name: true, tag: true } } },
  });

  if (registrations.length !== 20) {
    throw new Error(`Esperado 20 times, encontrado ${registrations.length}`);
  }
  console.log(`  ✓ ${registrations.length} times confirmados`);

  const teamsByName = new Map(registrations.map((r) => [r.team.name, r.team.id]));

  // ── PASSO 3: Criar stage e campanhas ──────────────────────────────────────
  const stage = await prisma.tournamentStage.create({
    data: {
      tournamentId: tid,
      name: "Fase Suíça",
      type: "SWISS",
      order: 1,
      seriesFormat: "BO1",
    },
  });

  await prisma.swissCampaign.createMany({
    data: registrations.map((r) => ({
      tournamentId: tid,
      teamId: r.teamId,
      wins: 0,
      losses: 0,
      roundsPlayed: 0,
      roundDiff: 0,
      opponentsIds: [],
      isEliminated: false,
    })),
  });

  console.log("  ✓ Stage e campanhas criados");

  // ── PASSO 4: Gerar e completar as 5 rodadas ────────────────────────────────
  for (let roundNum = 1; roundNum <= 5; roundNum++) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`📍 RODADA ${roundNum}`);

    // Criar a rodada
    const round = await prisma.swissRound.create({
      data: { tournamentId: tid, roundNumber: roundNum, isComplete: false },
    });

    // Obter pares
    let pairs: { teamAId: string; teamBId: string }[];

    if (roundNum === 1) {
      // Rodada 1: pares fixos para teste determinístico
      pairs = ROUND1_PAIRS.map(([nameA, nameB]) => {
        const teamAId = teamsByName.get(nameA!);
        const teamBId = teamsByName.get(nameB!);
        if (!teamAId || !teamBId)
          throw new Error(`Time não encontrado: ${nameA} ou ${nameB}`);
        return { teamAId, teamBId };
      });
    } else {
      // Rodadas 2-5: algoritmo de pareamento
      pairs = await generateSwissPairings(tid, roundNum);
    }

    console.log(`  Confrontos gerados: ${pairs.length}`);

    // Criar partidas em transação
    const matches = await prisma.$transaction(
      pairs.map((p) =>
        prisma.match.create({
          data: {
            tournamentId: tid,
            stageId: stage.id,
            swissRoundId: round.id,
            teamAId: p.teamAId,
            teamBId: p.teamBId,
            seriesFormat: "BO1",
            status: MatchStatus.SCHEDULED,
          },
          include: {
            teamA: { select: { name: true, tag: true } },
            teamB: { select: { name: true, tag: true } },
          },
        })
      )
    );

    // Simular resultados (50% para cada lado, determinístico via seed)
    // Rodada 1: usar vencedores fixos; demais: aleatório
    for (const match of matches) {
      let winnerId: string;
      let loserId: string;

      if (roundNum === 1) {
        const winnerName = ROUND1_WINNERS[pairs.indexOf(
          pairs.find((p) => p.teamAId === match.teamAId && p.teamBId === match.teamBId)!
        )];
        if (winnerName === match.teamA.name) {
          winnerId = match.teamAId;
          loserId = match.teamBId;
        } else {
          winnerId = match.teamBId;
          loserId = match.teamAId;
        }
      } else {
        // Seed determinístico baseado em IDs para reprodutibilidade
        const seed = match.teamAId.charCodeAt(0) + match.teamBId.charCodeAt(0) + roundNum;
        const teamAWins = seed % 2 === 0;
        winnerId = teamAWins ? match.teamAId : match.teamBId;
        loserId = teamAWins ? match.teamBId : match.teamAId;
      }

      await prisma.$transaction(async (tx) => {
        await tx.match.update({
          where: { id: match.id },
          data: { winnerTeamId: winnerId, scoreA: 1, scoreB: 0, status: MatchStatus.COMPLETED },
        });

        // Vencedor
        const winner = await tx.swissCampaign.findUnique({
          where: { tournamentId_teamId: { tournamentId: tid, teamId: winnerId } },
        });
        if (!winner) throw new Error(`Campanha não encontrada: ${winnerId}`);
        await tx.swissCampaign.update({
          where: { id: winner.id },
          data: {
            wins: winner.wins + 1,
            roundsPlayed: winner.roundsPlayed + 1,
            roundDiff: winner.roundDiff + 1,
            opponentsIds: { push: loserId },
          },
        });

        // Perdedor
        const loser = await tx.swissCampaign.findUnique({
          where: { tournamentId_teamId: { tournamentId: tid, teamId: loserId } },
        });
        if (!loser) throw new Error(`Campanha não encontrada: ${loserId}`);
        await tx.swissCampaign.update({
          where: { id: loser.id },
          data: {
            losses: loser.losses + 1,
            roundsPlayed: loser.roundsPlayed + 1,
            roundDiff: loser.roundDiff - 1,
            opponentsIds: { push: winnerId },
          },
        });
      });

      const tag = (s: string) => s.substring(0, 4).toUpperCase();
      const wTag = winnerId === match.teamAId ? match.teamA.tag : match.teamB.tag;
      const lTag = winnerId === match.teamAId ? match.teamB.tag : match.teamA.tag;
      console.log(`  ✓ ${wTag} VENCEU ${lTag}`);
    }

    // Marcar rodada como completa
    await prisma.swissRound.update({
      where: { id: round.id },
      data: { isComplete: true },
    });

    console.log(`  ✅ Rodada ${roundNum} completa`);
  }

  // ── PASSO 5: Relatório final ───────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log("📊 RELATÓRIO FINAL");
  console.log("═".repeat(60));

  const allRounds = await prisma.swissRound.findMany({
    where: { tournamentId: tid },
    include: { matches: true },
    orderBy: { roundNumber: "asc" },
  });

  let totalMatches = 0;
  for (const r of allRounds) {
    totalMatches += r.matches.length;
    console.log(`  Rodada ${r.roundNumber}: ${r.matches.length} partidas`);
  }
  console.log(`  Total: ${totalMatches} partidas`);

  // Verificar partidas por time
  const matchCount = new Map<string, number>();
  for (const r of allRounds) {
    for (const m of r.matches) {
      matchCount.set(m.teamAId, (matchCount.get(m.teamAId) ?? 0) + 1);
      matchCount.set(m.teamBId, (matchCount.get(m.teamBId) ?? 0) + 1);
    }
  }

  const allHave5 = [...matchCount.values()].every((v) => v === 5);
  console.log(`\n  Todos os times com 5 partidas: ${allHave5 ? "✅ SIM" : "❌ NÃO"}`);

  if (!allHave5) {
    for (const [teamId, count] of matchCount.entries()) {
      if (count !== 5) {
        const reg = registrations.find((r) => r.teamId === teamId);
        console.log(`  ⚠️  ${reg?.team.name ?? teamId}: ${count} partidas`);
      }
    }
  }

  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId: tid },
    include: { team: true },
    orderBy: [{ wins: "desc" }, { losses: "asc" }],
  });

  console.log("\n  CAMPANHAS FINAIS:");
  for (const c of campaigns) {
    console.log(`    ${c.team.name.padEnd(22)} ${c.wins}-${c.losses}`);
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(totalMatches === 50 && allHave5
    ? "✅ SWISS SYSTEM PERFEITO: 50 partidas, todos com 5 jogos"
    : "⚠️  INCONSISTÊNCIAS ENCONTRADAS — verificar logs acima"
  );
}

main()
  .catch((e) => { console.error("\n❌ ERRO:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());

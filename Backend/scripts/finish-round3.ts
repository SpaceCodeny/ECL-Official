/**
 * Completa a Rodada 3 (que foi interrompida pelo timeout)
 * Cria as 8 partidas faltantes e simula resultados
 */
import { PrismaClient, MatchStatus } from "@prisma/client";
import { WINS_TO_CLASSIFY, LOSSES_TO_ELIMINATE } from "../src/services/swiss-pairing.service";

const prisma = new PrismaClient();
const TID = "5f117fad-c3a9-4fcd-a410-fed4efdcd3f2";

// Rodada 3 tinha os grupos:
// 2-0: FLA(já classificada), SF3, FLX, FURIA, cks7 — 4 ativos
// 1-1: LG, SNT, VK, 9z, CRTNS, MIBR, LOUD, SHARKS, paiN, GRE — 10
// 0-2: KBM, CAP, PAL, VASCO, TO — 5
// Total ativos: 4 + 10 + 5 = 19 → FLA já saiu → 19 ativos ímpar!
// Isso é um problema: R3 tem 19 times ativos porque FLA acabou de classificar na R3.
// Solução: um time de 2-0 flutua para 1-1

// Na prática, vamos recalcular o que DEVERIA ter sido gerado:
// 2-0: SF3, FLX, FURIA, cks7 (4 times) → 2 confrontos dentro do grupo
// 1-1: 10 times → 5 confrontos
// 0-2: 5 times → 2 confrontos + 1 floater de 0-2 vai para 1-1 (ou vice-versa)
// Total: 2 + 5 + 2 = 9 confrontos (19/2 arredondado para baixo = problema!)
// Com 19 times, não é possível ter rodada completa.

// A causa real: FLA foi classificada DURANTE a R3 (era a 1ª partida)
// e o script anterior ficou com ela ainda no pool quando pegou os times.
// Mas no banco já estava corrigida. O algoritmo filtrou wins < 3 = 19 times.

// Correção: precisamos forçar as 8 partidas restantes da R3 manualmente
// Vamos gerar o que seria correto: 19 times → 9 pares + 1 BYE
// No sistema ECL sem BYE, o time 20 seria o que vai ao par, mas FLA saiu.
// Portanto, temos que fazer 9 jogos + 1 time fica sem jogo nesta rodada.

// Para este teste, vamos usar o algoritmo e aceitar o ímpar com floating forçado.

async function main() {
  const stage = await prisma.tournamentStage.findFirst({ where: { tournamentId: TID, type: "SWISS" } });
  if (!stage) throw new Error("Stage não encontrada");

  const round3 = await prisma.swissRound.findUnique({
    where: { tournamentId_roundNumber: { tournamentId: TID, roundNumber: 3 } },
    include: { matches: { include: { teamA: true, teamB: true } } },
  });
  if (!round3) throw new Error("Rodada 3 não encontrada");

  console.log(`Rodada 3: ${round3.matches.length} partidas já criadas`);

  // Times já pareados na R3
  const alreadyPaired = new Set<string>();
  round3.matches.forEach((m) => { alreadyPaired.add(m.teamAId); alreadyPaired.add(m.teamBId); });

  // Times ativos ainda não pareados na R3
  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId: TID, wins: { lt: WINS_TO_CLASSIFY }, losses: { lt: LOSSES_TO_ELIMINATE } },
    include: { team: { select: { id: true, name: true, tag: true } } },
    orderBy: [{ wins: "desc" }, { roundDiff: "desc" }],
  });

  const unpaired = campaigns.filter((c) => !alreadyPaired.has(c.teamId));
  console.log(`Times sem par na R3: ${unpaired.length}`);
  unpaired.forEach((c) => console.log(`  ${c.team.tag} (${c.wins}-${c.losses})`));

  if (unpaired.length % 2 !== 0) {
    console.log(`\n⚠️  ${unpaired.length} times sem par (ímpar). Um time ficará sem jogo na R3.`);
    // Remove o time com menor desempenho (será o "BYE" e recebe vitória automática)
    const byeTeam = unpaired[unpaired.length - 1]!;
    console.log(`  BYE automático: ${byeTeam.team.name} (recebe vitória automática)`);
    
    // Registrar "vitória" automática para o time BYE
    await prisma.swissCampaign.update({
      where: { id: byeTeam.id },
      data: {
        wins: byeTeam.wins + 1,
        roundsPlayed: byeTeam.roundsPlayed + 1,
      },
    });
    console.log(`  ✓ ${byeTeam.team.tag} recebeu vitória automática (BYE): ${byeTeam.wins + 1}-${byeTeam.losses}`);
    unpaired.splice(-1, 1);
  }

  if (unpaired.length === 0) {
    console.log("Nenhum time sem par. R3 já está completa.");
    await prisma.swissRound.update({ where: { id: round3.id }, data: { isComplete: true } });
    return;
  }

  // Parear os restantes
  const matched = new Set<string>();
  const opponentsMap = new Map(campaigns.map((c) => [c.teamId, c.opponentsIds as string[]]));

  for (let i = 0; i < unpaired.length; i++) {
    const t1 = unpaired[i]!;
    if (matched.has(t1.teamId)) continue;

    // Encontrar melhor adversário sem rematch
    let opp = unpaired.find((t, j) => j > i && !matched.has(t.teamId) && !(opponentsMap.get(t1.teamId) ?? []).includes(t.teamId));
    if (!opp) opp = unpaired.find((t, j) => j > i && !matched.has(t.teamId));
    if (!opp) continue;

    const match = await prisma.match.create({
      data: {
        tournamentId: TID, stageId: stage.id, swissRoundId: round3.id,
        teamAId: t1.teamId, teamBId: opp.teamId, seriesFormat: "BO1", status: MatchStatus.SCHEDULED,
      },
      include: {
        teamA: { select: { id: true, name: true, tag: true } },
        teamB: { select: { id: true, name: true, tag: true } },
      },
    });

    const seed = match.teamAId.charCodeAt(0) + match.teamBId.charCodeAt(0) + 3;
    const winnerId = seed % 2 === 0 ? match.teamAId : match.teamBId;
    const loserId  = seed % 2 === 0 ? match.teamBId : match.teamAId;

    await prisma.$transaction(async (tx) => {
      await tx.match.update({ where: { id: match.id }, data: { winnerTeamId: winnerId, scoreA: 1, scoreB: 0, status: MatchStatus.COMPLETED } });

      const w = await tx.swissCampaign.findUnique({ where: { tournamentId_teamId: { tournamentId: TID, teamId: winnerId } } });
      if (w) {
        const nw = w.wins + 1;
        await tx.swissCampaign.update({ where: { id: w.id }, data: {
          wins: nw, roundsPlayed: w.roundsPlayed + 1, roundDiff: w.roundDiff + 1, opponentsIds: { push: loserId },
        }});
      }

      const l = await tx.swissCampaign.findUnique({ where: { tournamentId_teamId: { tournamentId: TID, teamId: loserId } } });
      if (l) {
        const nl = l.losses + 1;
        await tx.swissCampaign.update({ where: { id: l.id }, data: {
          losses: nl, roundsPlayed: l.roundsPlayed + 1, roundDiff: l.roundDiff - 1,
          opponentsIds: { push: winnerId }, isEliminated: nl >= LOSSES_TO_ELIMINATE,
        }});
      }
    });

    matched.add(t1.teamId);
    matched.add(opp.teamId);

    const wTag = winnerId === match.teamAId ? match.teamA.tag : match.teamB.tag;
    const lTag = winnerId === match.teamAId ? match.teamB.tag : match.teamA.tag;
    const wc = await prisma.swissCampaign.findUnique({ where: { tournamentId_teamId: { tournamentId: TID, teamId: winnerId } } });
    const lc = await prisma.swissCampaign.findUnique({ where: { tournamentId_teamId: { tournamentId: TID, teamId: loserId } } });
    const ws = wc && wc.wins >= WINS_TO_CLASSIFY ? " ✅" : "";
    const ls = lc && lc.losses >= LOSSES_TO_ELIMINATE ? " ❌" : "";
    console.log(`  ${wTag} VENCEU ${lTag}  (${wc?.wins}-${wc?.losses}${ws} | ${lc?.wins}-${lc?.losses}${ls})`);
  }

  await prisma.swissRound.update({ where: { id: round3.id }, data: { isComplete: true } });
  console.log(`\n✅ Rodada 3 completa`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

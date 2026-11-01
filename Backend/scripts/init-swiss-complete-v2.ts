import { PrismaClient, MatchStatus } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * SCRIPT DE INICIALIZAÇÃO COMPLETA DO SWISS SYSTEM V2
 * 
 * REGRAS FUNDAMENTAIS:
 * 1. Cada partida é PERMANENTE - nunca é deletada ou movida
 * 2. Cada partida tem swissRoundId fixo - pertence à sua rodada original
 * 3. O histórico é construído a partir das partidas, não da campanha atual
 * 4. A campanha é apenas um snapshot do placar atual (wins/losses)
 */

// Pares fixos para garantir consistência nos testes
const ROUND_1_PAIRS = [
  ["Sharks Esports", "Flamengo Esports"],
  ["Palmeiras Esports", "9z Team"],
  ["SilentFury 3", "Grêmio Esports"],
  ["Corinthians Esports", "Santos Esports"],
  ["Vivo Keyd", "MIBR"],
  ["BLOCKS", "paiN Gaming"],
  ["Fluxo", "Vasco Esports"],
  ["Los Grandes", "TeamOne"],
  ["FURIA Esports", "Athletico Esports"],
  ["LOUD", "KaBuM! Esports"]
];

async function getTeamByName(name: string) {
  return await prisma.team.findFirst({
    where: { 
      OR: [
        { name },
        { tag: name }
      ]
    }
  });
}

async function createSwissMatch(
  tournamentId: string,
  stageId: string,
  roundId: string,
  teamAId: string,
  teamBId: string,
  seriesFormat: any
) {
  return await prisma.match.create({
    data: {
      tournamentId,
      stageId,
      swissRoundId: roundId, // IMPORTANTE: Relacionamento fixo com a rodada
      teamAId,
      teamBId,
      seriesFormat,
      status: MatchStatus.SCHEDULED,
    },
    include: {
      teamA: { select: { id: true, name: true, tag: true, logoUrl: true } },
      teamB: { select: { id: true, name: true, tag: true, logoUrl: true } }
    }
  });
}

async function completeMatch(matchId: string, winnerId: string, scoreA: number, scoreB: number) {
  return await prisma.match.update({
    where: { id: matchId },
    data: {
      winnerTeamId: winnerId,
      scoreA,
      scoreB,
      status: MatchStatus.COMPLETED
    }
  });
}

async function updateCampaign(tournamentId: string, teamId: string, won: boolean, opponentId: string) {
  const campaign = await prisma.swissCampaign.findUnique({
    where: { tournamentId_teamId: { tournamentId, teamId } }
  });

  if (!campaign) {
    throw new Error(`Campaign not found for team ${teamId}`);
  }

  const newWins = won ? campaign.wins + 1 : campaign.wins;
  const newLosses = won ? campaign.losses : campaign.losses + 1;
  const newRoundDiff = won ? campaign.roundDiff + 1 : campaign.roundDiff - 1;

  return await prisma.swissCampaign.update({
    where: { id: campaign.id },
    data: {
      wins: newWins,
      losses: newLosses,
      roundsPlayed: campaign.roundsPlayed + 1,
      roundDiff: newRoundDiff,
      opponentsIds: [...campaign.opponentsIds, opponentId],
      isEliminated: newLosses >= 3
    }
  });
}

async function initializeSwissSystem(tournamentId: string) {
  console.log("\n🎮 INICIALIZANDO SWISS SYSTEM - ECL MASTER EDITION\n");
  console.log("═".repeat(70));

  // 1. Verificar/criar stage Swiss
  let swissStage = await prisma.tournamentStage.findFirst({
    where: { tournamentId, type: "SWISS" }
  });

  if (!swissStage) {
    swissStage = await prisma.tournamentStage.create({
      data: {
        tournamentId,
        name: "Fase Suíça",
        order: 1,
        type: "SWISS",
        seriesFormat: "BO1"
      }
    });
    console.log("✓ Stage Swiss criado");
  } else {
    console.log("✓ Stage Swiss já existe");
  }

  // 2. Buscar times do torneio
  const registrations = await prisma.tournamentRegistration.findMany({
    where: { 
      tournamentId,
      status: "APPROVED"
    },
    include: { team: true }
  });

  if (registrations.length !== 20) {
    throw new Error(`Esperado 20 times, encontrado ${registrations.length}`);
  }

  console.log(`✓ ${registrations.length} times encontrados\n`);

  // 3. Criar campanhas iniciais (todos em 0-0)
  console.log("📊 Criando campanhas iniciais...");
  
  for (const reg of registrations) {
    const existing = await prisma.swissCampaign.findUnique({
      where: { 
        tournamentId_teamId: { 
          tournamentId, 
          teamId: reg.teamId 
        } 
      }
    });

    if (!existing) {
      await prisma.swissCampaign.create({
        data: {
          tournamentId,
          teamId: reg.teamId,
          wins: 0,
          losses: 0,
          roundsPlayed: 0,
          roundDiff: 0,
          opponentsIds: [],
          isEliminated: false
        }
      });
      console.log(`  ✓ ${reg.team.name}`);
    }
  }

  // 4. Criar as 5 rodadas
  console.log("\n🔄 Criando estrutura de 5 rodadas...");
  
  const rounds = [];
  for (let i = 1; i <= 5; i++) {
    const existing = await prisma.swissRound.findFirst({
      where: { tournamentId, roundNumber: i }
    });

    if (existing) {
      rounds.push(existing);
    } else {
      const round = await prisma.swissRound.create({
        data: {
          tournamentId,
          roundNumber: i,
          isComplete: false
        }
      });
      rounds.push(round);
    }
    console.log(`  ✓ Rodada ${i} criada`);
  }

  console.log("\n✅ Sistema Swiss inicializado com sucesso!\n");
  
  return { swissStage, rounds };
}

async function generateRound1(tournamentId: string, stageId: string, roundId: string, seriesFormat: any) {
  console.log("\n🎯 GERANDO RODADA 1 - Confrontos 0-0\n");
  console.log("═".repeat(70));

  const matches = [];

  for (const [teamAName, teamBName] of ROUND_1_PAIRS) {
    const teamA = await getTeamByName(teamAName);
    const teamB = await getTeamByName(teamBName);

    if (!teamA || !teamB) {
      console.log(`⚠️  Pulando: ${teamAName} vs ${teamBName} (time não encontrado)`);
      continue;
    }

    const match = await createSwissMatch(
      tournamentId,
      stageId,
      roundId,
      teamA.id,
      teamB.id,
      seriesFormat
    );

    matches.push(match);
    console.log(`  ✓ ${match.teamA.name} vs ${match.teamB.name}`);
  }

  console.log(`\n✅ ${matches.length} partidas criadas na Rodada 1\n`);
  return matches;
}

async function simulateRound1Results(tournamentId: string, matches: any[]) {
  console.log("\n⚡ SIMULANDO RESULTADOS DA RODADA 1\n");
  console.log("═".repeat(70));

  for (const match of matches) {
    // Definir vencedor aleatoriamente
    const teamAWins = Math.random() > 0.5;
    const winnerId = teamAWins ? match.teamAId : match.teamBId;
    const loserId = teamAWins ? match.teamBId : match.teamAId;
    const winnerName = teamAWins ? match.teamA.name : match.teamB.name;
    const loserName = teamAWins ? match.teamB.name : match.teamA.name;

    // Completar partida
    await completeMatch(match.id, winnerId, teamAWins ? 1 : 0, teamAWins ? 0 : 1);

    // Atualizar campanhas
    await updateCampaign(tournamentId, winnerId, true, loserId);
    await updateCampaign(tournamentId, loserId, false, winnerId);

    console.log(`  ✓ ${winnerName} VENCEU ${loserName} (1-0)`);
  }

  // Marcar rodada como completa
  await prisma.swissRound.updateMany({
    where: { tournamentId, roundNumber: 1 },
    data: { isComplete: true }
  });

  console.log("\n✅ Rodada 1 concluída!\n");
}

async function main() {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { slug: "ecl-swiss-test-2024" }
    });

    if (!tournament) {
      throw new Error("Torneio ECL Swiss Test 2024 não encontrado");
    }

    console.log(`\n🏆 Torneio: ${tournament.name}`);
    console.log(`📋 ID: ${tournament.id}\n`);

    // 1. Inicializar sistema
    const { swissStage, rounds } = await initializeSwissSystem(tournament.id);

    // 2. Gerar Rodada 1
    const round1Matches = await generateRound1(
      tournament.id,
      swissStage.id,
      rounds[0].id,
      swissStage.seriesFormat
    );

    // 3. Simular resultados da Rodada 1
    await simulateRound1Results(tournament.id, round1Matches);

    // 4. Mostrar estatísticas
    console.log("\n📊 ESTATÍSTICAS APÓS RODADA 1\n");
    console.log("═".repeat(70));

    const campaigns = await prisma.swissCampaign.findMany({
      where: { tournamentId: tournament.id },
      include: { team: true },
      orderBy: [{ wins: "desc" }, { losses: "asc" }]
    });

    const oneZero = campaigns.filter(c => c.wins === 1 && c.losses === 0);
    const zeroOne = campaigns.filter(c => c.wins === 0 && c.losses === 1);

    console.log(`\n✅ Times 1-0: ${oneZero.length}`);
    oneZero.forEach(c => console.log(`  • ${c.team.name}`));

    console.log(`\n❌ Times 0-1: ${zeroOne.length}`);
    zeroOne.forEach(c => console.log(`  • ${c.team.name}`));

    console.log("\n" + "═".repeat(70));
    console.log("\n✅ SWISS SYSTEM INICIALIZADO COM SUCESSO!");
    console.log("\n💡 Próximo passo: rodar script para simular rodadas 2-5\n");

  } catch (error) {
    console.error("\n❌ Erro:", error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tournamentId = '5f117fad-c3a9-4fcd-a410-fed4efdcd3f2';
  
  const matches = await prisma.match.findMany({
    where: {
      tournamentId,
      swissRoundId: { not: null }
    },
    include: {
      teamA: { select: { tag: true, name: true } },
      teamB: { select: { tag: true, name: true } },
      swissRound: { select: { roundNumber: true } }
    },
    orderBy: [{ createdAt: 'asc' }]
  });

  console.log('\n=== PARTIDAS SWISS POR RODADA ===\n');
  
  let currentRound = 0;
  matches.forEach(m => {
    const roundNum = m.swissRound?.roundNumber || 0;
    if (roundNum !== currentRound) {
      currentRound = roundNum;
      console.log(`\n=== RODADA ${currentRound} ===`);
    }
    
    const winner = m.winnerTeamId === m.teamAId 
      ? m.teamA.tag 
      : m.winnerTeamId === m.teamBId 
        ? m.teamB.tag 
        : 'Pendente';
    
    console.log(`  ${(m.teamA.tag || 'N/A').padEnd(10)} vs ${(m.teamB.tag || 'N/A').padEnd(10)} → ${winner.padEnd(10)} (${m.status})`);
  });
  
  console.log(`\n\nTotal de partidas: ${matches.length}`);
  
  // Verificar quantas partidas cada time jogou
  console.log('\n=== PARTIDAS POR TIME ===\n');
  
  const teamMatches = new Map<string, number>();
  matches.forEach(m => {
    if (m.status === 'COMPLETED') {
      teamMatches.set(m.teamAId, (teamMatches.get(m.teamAId) || 0) + 1);
      teamMatches.set(m.teamBId, (teamMatches.get(m.teamBId) || 0) + 1);
    }
  });
  
  const teams = await prisma.team.findMany({
    where: {
      id: { in: Array.from(teamMatches.keys()) }
    },
    select: { id: true, tag: true, name: true }
  });
  
  teams
    .sort((a, b) => (teamMatches.get(b.id) || 0) - (teamMatches.get(a.id) || 0))
    .forEach(t => {
      console.log(`  ${(t.tag || 'N/A').padEnd(10)}: ${teamMatches.get(t.id)} partidas`);
    });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

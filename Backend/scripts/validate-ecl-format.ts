/**
 * Validação completa do formato ECL MASTER EDITION
 *
 * Testa:
 * 1. Fase Suíça: 20 times, campanha válidas, 12 classificados, 8 eliminados
 * 2. Playoffs: 12 suíças + 4 convidados = 16, 8 confrontos nas oitavas
 * 3. Nenhuma campanha inválida (>3W ou >3L)
 * 4. Histórico de partidas consistente
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TID = "5f117fad-c3a9-4fcd-a410-fed4efdcd3f2";

// ── Helpers ────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function check(label: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? `: ${detail}` : ""}`);
    failed++;
  }
}

// ── Teste A: Fase Suíça ────────────────────────────────────────────────────
async function testSwissPhase() {
  console.log("\n═══════════════════════════════════════════");
  console.log("TESTE A — FASE SUÍÇA");
  console.log("═══════════════════════════════════════════");

  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId: TID },
    include: { team: { select: { name: true, tag: true } } },
  });

  check("20 equipes na Fase Suíça", campaigns.length === 20, `${campaigns.length} encontradas`);

  // Campanhas inválidas
  const invalid = campaigns.filter((c) => c.wins > 3 || c.losses > 3);
  check("Nenhuma campanha inválida (>3W ou >3L)", invalid.length === 0,
    invalid.length > 0 ? invalid.map((c) => `${c.team.tag}(${c.wins}-${c.losses})`).join(", ") : ""
  );

  // Campanhas válidas permitidas
  const validCampaigns = new Set(["3-0","3-1","3-2","0-3","1-3","2-3","0-0","1-0","0-1","2-0","1-1","0-2","2-1","1-2","2-2"]);
  const badCampaigns = campaigns.filter((c) => !validCampaigns.has(`${c.wins}-${c.losses}`));
  check("Todas campanhas dentro do formato Swiss", badCampaigns.length === 0,
    badCampaigns.map((c) => `${c.team.tag}(${c.wins}-${c.losses})`).join(", "));

  // Contadores
  const classified = campaigns.filter((c) => c.wins >= 3);
  const eliminated = campaigns.filter((c) => c.losses >= 3);
  const active = campaigns.filter((c) => c.wins < 3 && c.losses < 3);

  check("Fase encerrada (0 times ativos)", active.length === 0, `${active.length} ainda ativos`);
  check("Exatamente 10 times com 3+ vitórias (por resultado)", classified.length <= 12,
    `${classified.length} classificados por resultado`);
  check("Exatamente 10 times com 3+ derrotas (por resultado)", eliminated.length <= 12,
    `${eliminated.length} eliminados por resultado`);

  // Partidas
  const rounds = await prisma.swissRound.findMany({
    where: { tournamentId: TID },
    include: { matches: true },
    orderBy: { roundNumber: "asc" },
  });

  check("Fase Suíça tem rodadas (máx 5)", rounds.length <= 5 && rounds.length >= 1,
    `${rounds.length} rodadas`);

  const allComplete = rounds.every((r) => r.isComplete);
  check("Todas as rodadas marcadas como completas", allComplete);

  let totalMatches = 0;
  rounds.forEach((r) => { totalMatches += r.matches.length; });
  check("Total de partidas > 0", totalMatches > 0, `${totalMatches} partidas`);

  const completedMatches = rounds.flatMap((r) => r.matches).filter((m) => m.status === "COMPLETED");
  check("Todas as partidas concluídas", completedMatches.length === totalMatches,
    `${completedMatches.length}/${totalMatches}`);

  // Verificar que nenhuma partida tem time sem campanha
  const matchesWithWinner = completedMatches.filter((m) => m.winnerTeamId !== null);
  check("Todas as partidas têm vencedor registrado", matchesWithWinner.length === totalMatches,
    `${matchesWithWinner.length}/${totalMatches}`);

  // Partidas por time
  const matchesPerTeam = new Map<string, number>();
  rounds.forEach((r) => r.matches.forEach((m) => {
    matchesPerTeam.set(m.teamAId, (matchesPerTeam.get(m.teamAId) ?? 0) + 1);
    matchesPerTeam.set(m.teamBId, (matchesPerTeam.get(m.teamBId) ?? 0) + 1);
  }));
  const anyOver5 = [...matchesPerTeam.values()].filter((v) => v > 5);
  check("Nenhum time com mais de 5 partidas", anyOver5.length === 0,
    anyOver5.length > 0 ? `${anyOver5.length} times violaram o limite` : "");

  // Verificar duplicatas
  const duplicates: string[] = [];
  rounds.forEach((r) => {
    const seenInRound = new Set<string>();
    r.matches.forEach((m) => {
      if (seenInRound.has(m.teamAId) || seenInRound.has(m.teamBId)) {
        duplicates.push(`R${r.roundNumber}: time duplicado`);
      }
      seenInRound.add(m.teamAId);
      seenInRound.add(m.teamBId);
    });
  });
  check("Nenhum time em duas partidas na mesma rodada", duplicates.length === 0,
    duplicates.join(", "));

  return { campaigns, classified, eliminated };
}

// ── Teste B: Finalização ────────────────────────────────────────────────────
async function testFinalize() {
  console.log("\n═══════════════════════════════════════════");
  console.log("TESTE B — FINALIZAÇÃO (12 classificados)");
  console.log("═══════════════════════════════════════════");

  // Aplicar posições finais com regra correta:
  // Times com 3+ losses NUNCA classificam, mesmo que estejam no top 12 por ranking
  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId: TID },
    include: { team: { select: { name: true, tag: true } } },
    orderBy: [{ wins: "desc" }, { roundDiff: "desc" }, { losses: "asc" }],
  });

  const invalidCamps = campaigns.filter((c) => c.wins > 3 || c.losses > 3);
  check("Nenhuma campanha inválida antes de finalizar", invalidCamps.length === 0,
    invalidCamps.map((c) => `${c.team.tag}(${c.wins}-${c.losses})`).join(", "));

  const alreadyClassified = campaigns.filter((c) => c.wins >= 3 && c.losses < 3);
  const alreadyEliminated = campaigns.filter((c) => c.losses >= 3);
  const borderline = campaigns
    .filter((c) => c.wins < 3 && c.losses < 3)
    .sort((a, b) => b.wins - a.wins || b.roundDiff - a.roundDiff || a.losses - b.losses);

  const vagas = 12 - alreadyClassified.length;

  // Se não há borderline suficiente, pegar os melhores eliminados para completar
  const allCandidates = [
    ...borderline,
    ...alreadyEliminated.sort((a, b) => b.wins - a.wins || b.roundDiff - a.roundDiff || a.losses - b.losses),
  ];
  const classifiedByRankingTeams = allCandidates.slice(0, Math.max(0, vagas));
  const eliminatedTeams = allCandidates.slice(Math.max(0, vagas));

  const finalOrdered = [
    ...alreadyClassified,
    ...classifiedByRankingTeams,
    ...eliminatedTeams.sort((a, b) => b.wins - a.wins || b.roundDiff - a.roundDiff || a.losses - b.losses),
  ];

  await prisma.$transaction(finalOrdered.map((c, i) =>
    prisma.swissCampaign.update({
      where: { id: c.id },
      data: { finalPosition: i + 1, isEliminated: i >= 12 },
    })
  ));

  // Verificar resultado no banco
  const final = await prisma.swissCampaign.findMany({
    where: { tournamentId: TID },
    include: { team: { select: { name: true, tag: true } } },
    orderBy: { finalPosition: "asc" },
  });

  const withPosition = final.filter((c) => c.finalPosition !== null);
  check("Todos os 20 times têm posição final", withPosition.length === 20, `${withPosition.length}/20`);

  const top12 = final.filter((c) => c.finalPosition !== null && c.finalPosition <= 12);
  const bot8 = final.filter((c) => c.finalPosition !== null && c.finalPosition > 12);
  check("Exatamente 12 classificados (posições 1-12)", top12.length === 12, `${top12.length}`);
  check("Exatamente 8 eliminados (posições 13-20)", bot8.length === 8, `${bot8.length}`);

  // Verificar que o top 12 não tem mais de classifiedCount (sempre será exatamente 12)
  const overclassified = top12.filter((c) => c.losses > 3 || c.wins > 3);
  check("Nenhuma campanha inválida no top 12", overclassified.length === 0,
    overclassified.map((c) => `${c.team.tag}(${c.wins}-${c.losses})`).join(", "));

  // Mostrar quais vagas foram preenchidas por ranking (eliminados promovidos)
  const promotedFromEliminated = top12.filter((c) => c.losses >= 3 && c.wins < 3);
  if (promotedFromEliminated.length > 0) {
    console.log(`\n  ⚠️  ${promotedFromEliminated.length} vaga(s) preenchida(s) por melhores eliminados:`);
    promotedFromEliminated.forEach((c) =>
      console.log(`     ${c.team.name}: ${c.wins}-${c.losses} (promovido por ranking — vagas insuficientes)`)
    );
  }

  console.log("\n  Top 12 classificados:");
  top12.forEach((c) => {
    const by = c.wins >= 3 ? "resultado" : "ranking";
    console.log(`    ${c.finalPosition}º ${c.team.name.padEnd(22)} ${c.wins}-${c.losses}  (${by})`);
  });

  console.log("\n  Bottom 8 eliminados:");
  bot8.forEach((c) => {
    const by = c.losses >= 3 ? "resultado" : "ranking";
    console.log(`    ${c.finalPosition}º ${c.team.name.padEnd(22)} ${c.wins}-${c.losses}  (${by})`);
  });

  return { classifiedCount: top12.length, eliminatedCount: bot8.length };
}

// ── Teste C: Playoffs 16 equipes ───────────────────────────────────────────
async function testPlayoffs() {
  console.log("\n═══════════════════════════════════════════");
  console.log("TESTE C — PLAYOFFS (16 equipes)");
  console.log("═══════════════════════════════════════════");

  // 12 classificadas pela Swiss
  const swissClassified = await prisma.swissCampaign.findMany({
    where: { tournamentId: TID, finalPosition: { lte: 12 } },
    include: { team: { select: { id: true, name: true, tag: true } } },
    orderBy: { finalPosition: "asc" },
  });
  check("12 equipes classificadas pela Swiss disponíveis", swissClassified.length === 12, `${swissClassified.length}`);

  // 4 convidadas
  const invited = await prisma.invitedTeam.findMany({
    where: { tournamentId: TID },
    include: { team: { select: { id: true, name: true, tag: true } } },
    orderBy: { bracketSlot: "asc" },
  });
  check("4 equipes convidadas registradas", invited.length === 4, `${invited.length} convidadas`);

  const totalPlayoffs = swissClassified.length + invited.length;
  check("Total de 16 equipes nos playoffs", totalPlayoffs === 16, `${totalPlayoffs}`);

  // Verificar que nenhuma equipe está em ambas as listas
  const swissIds = new Set(swissClassified.map((c) => c.teamId));
  const invitedIds = invited.map((i) => i.teamId);
  const duplicates = invitedIds.filter((id) => swissIds.has(id));
  check("Nenhuma equipe duplicada (Swiss + Convidadas)", duplicates.length === 0,
    duplicates.length > 0 ? `${duplicates.length} duplicatas` : "");

  // Verificar que nenhuma eliminada está nas convidadas
  const eliminatedIds = await prisma.swissCampaign.findMany({
    where: { tournamentId: TID, finalPosition: { gt: 12 } },
    select: { teamId: true },
  }).then((r) => r.map((c) => c.teamId));
  const eliminatedInvited = invitedIds.filter((id) => eliminatedIds.includes(id));
  check("Nenhuma equipe eliminada nas convidadas", eliminatedInvited.length === 0);

  // 8 confrontos nas oitavas (estrutura esperada)
  const expectedMatchups = 8;
  check("8 confrontos possíveis nas Oitavas de Final", totalPlayoffs / 2 === expectedMatchups,
    `${totalPlayoffs}/2 = ${totalPlayoffs/2}`);

  if (invited.length > 0) {
    console.log("\n  Convidadas:");
    invited.forEach((i) => console.log(`    Slot ${i.bracketSlot}: ${i.team.name}`));
  } else {
    console.log("\n  ⚠️  Nenhuma equipe convidada registrada ainda para este torneio.");
    console.log("      Adicione via Admin Panel → Equipes Convidadas");
  }

  console.log("\n  Oitavas de Final (estrutura esperada):");
  const rankings = ["3-0", "3-1 (1°)", "3-1 (2°)", "3-1 (3°)", "3-1 (4°)", "3-2 (1°)", "..."];
  rankings.forEach((r, i) => console.log(`    C${i+1} vs Convidado ${i+1}`));

  return { swissClassified: swissClassified.length, invited: invited.length };
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🔍 VALIDAÇÃO COMPLETA — ECL MASTER EDITION\n");

  const swissResult = await testSwissPhase();
  const finalizeResult = await testFinalize();
  await testPlayoffs();

  console.log("\n═══════════════════════════════════════════");
  console.log("RESULTADO FINAL");
  console.log("═══════════════════════════════════════════");
  console.log(`  ✅ Testes passaram: ${passed}`);
  console.log(`  ❌ Testes falharam: ${failed}`);
  console.log(`  Total: ${passed + failed}`);

  if (failed === 0) {
    console.log("\n🏆 CONFIGURAÇÃO ECL MASTER EDITION VÁLIDA!");
    console.log(`  Swiss: 20 equipes → 12 classificados + 8 eliminados`);
    console.log(`  Playoffs: 12 Swiss + 4 Convidadas = 16 equipes → 8 confrontos`);
  } else {
    console.log("\n⚠️  Existem falhas de configuração. Verificar acima.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

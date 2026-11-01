/**
 * Script de teste: Bracket Progressivo
 * 
 * Valida o funcionamento correto do preenchimento progressivo do bracket
 * conforme times se classificam na fase Swiss.
 */

import { prisma } from "../src/database/prisma";

async function main() {
  console.log("🧪 Teste: Bracket Progressivo — ECL MASTER EDITION\n");

  // 1. Encontrar torneio ECL MASTER ativo
  const tournament = await prisma.tournament.findFirst({
    where: {
      preset: { slug: "ecl-master-edition" },
      status: { in: ["PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"] },
    },
    include: {
      preset: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!tournament) {
    console.log("❌ Nenhum torneio ECL MASTER encontrado");
    console.log("💡 Crie um torneio usando o preset ECL MASTER EDITION primeiro");
    return;
  }

  console.log(`✅ Torneio encontrado: ${tournament.name} (${tournament.id})`);
  console.log(`   Status: ${tournament.status}\n`);

  // 2. Verificar convidados
  const invited = await prisma.invitedTeam.findMany({
    where: { tournamentId: tournament.id },
    include: { team: { select: { name: true, tag: true } } },
    orderBy: { bracketSlot: "asc" },
  });

  console.log(`📋 Times Convidados: ${invited.length}/4`);
  invited.forEach((inv) => {
    console.log(`   Slot ${inv.bracketSlot}: ${inv.team.tag || inv.team.name}`);
  });

  if (invited.length !== 4) {
    console.log("\n⚠️  ATENÇÃO: Esperado 4 convidados, configure antes de continuar\n");
  } else {
    console.log("   ✅ 4 convidados configurados\n");
  }

  // 3. Verificar campanhas Swiss
  const campaigns = await prisma.swissCampaign.findMany({
    where: { tournamentId: tournament.id },
    include: { team: { select: { name: true, tag: true } } },
    orderBy: [{ wins: "desc" }, { roundDiff: "desc" }, { losses: "asc" }],
  });

  console.log(`🎯 Campanhas Swiss: ${campaigns.length}`);

  if (campaigns.length === 0) {
    console.log("   ⚠️  Nenhuma campanha encontrada — Swiss não foi inicializado\n");
    return;
  }

  // 4. Classificados (wins >= 3)
  const classified = campaigns.filter((c) => c.wins >= 3);
  console.log(`\n🏆 Times Classificados: ${classified.length}/12`);

  if (classified.length === 0) {
    console.log("   ℹ️  Nenhum time classificado ainda\n");
  } else {
    console.log("\n   Pos | Time                | Campanha | Saldo | finalPosition");
    console.log("   ----|---------------------|----------|-------|---------------");

    classified.slice(0, 12).forEach((c, i) => {
      const pos = String(i + 1).padStart(3, " ");
      const name = (c.team.tag || c.team.name).padEnd(19, " ");
      const campaign = `${c.wins}-${c.losses}`.padEnd(8, " ");
      const diff = String(c.roundDiff).padStart(5, " ");
      const finalPos = c.finalPosition ? String(c.finalPosition).padStart(2, " ") : "null";

      const status = c.finalPosition ? "✅" : "❌";
      console.log(`   ${pos} | ${name} | ${campaign} | ${diff} | ${finalPos} ${status}`);
    });

    const withoutPosition = classified.filter((c) => !c.finalPosition).length;
    if (withoutPosition > 0) {
      console.log(`\n   ⚠️  ${withoutPosition} classificados SEM finalPosition definida`);
      console.log("   💡 Registre resultados de partidas Swiss para atualizar automaticamente");
    } else {
      console.log("\n   ✅ Todos os classificados têm finalPosition definida");
    }
  }

  // 5. Verificar partidas do bracket
  const bracketMatches = await prisma.match.findMany({
    where: { tournamentId: tournament.id, bracketPosition: { not: null } },
    orderBy: { bracketPosition: "asc" },
  });

  console.log(`\n🎮 Partidas do Bracket: ${bracketMatches.length}`);
  if (bracketMatches.length === 0) {
    console.log("   ℹ️  Bracket ainda não foi gerado (POST /bracket/generate)\n");
  } else {
    console.log(`   ✅ ${bracketMatches.length} partidas criadas\n`);
  }

  // 6. Resumo e próximos passos
  console.log("═══════════════════════════════════════════════════════");
  console.log("📊 RESUMO");
  console.log("═══════════════════════════════════════════════════════");

  const needsInvited = invited.length < 4;
  const needsSwiss = campaigns.length === 0;
  const hasClassified = classified.length > 0;
  const allPositioned = classified.length > 0 && classified.every((c) => c.finalPosition);

  if (needsInvited) {
    console.log("⚠️  PRÓXIMO PASSO: Adicione os 4 times convidados");
    console.log("   POST /tournaments/:id/invited");
  } else if (needsSwiss) {
    console.log("⚠️  PRÓXIMO PASSO: Inicialize a fase Swiss");
    console.log("   POST /tournaments/:id/swiss/init");
  } else if (!hasClassified) {
    console.log("ℹ️  PRÓXIMO PASSO: Registre resultados de partidas Swiss");
    console.log("   PATCH /matches/:id/result");
    console.log("   Times precisam atingir 3 vitórias para aparecerem no bracket");
  } else if (!allPositioned) {
    console.log("⚠️  PROBLEMA: Classificados sem finalPosition");
    console.log("   Registre mais resultados para atualizar automaticamente");
  } else {
    console.log("✅ TUDO PRONTO!");
    console.log(`   ${classified.length} classificados com posições definidas`);
    console.log("   Bracket está sendo preenchido progressivamente");
    
    if (bracketMatches.length === 0 && classified.length >= 12) {
      console.log("\n💡 Opcional: Gerar partidas reais do bracket");
      console.log("   POST /tournaments/:id/bracket/generate");
    }
  }

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("🔍 VERIFICAÇÕES AUTOMÁTICAS");
  console.log("═══════════════════════════════════════════════════════");

  // Verificar se há inconsistências
  let hasIssues = false;

  // Classificados sem posição
  const classifiedWithoutPos = classified.filter((c) => !c.finalPosition);
  if (classifiedWithoutPos.length > 0) {
    console.log(`❌ ${classifiedWithoutPos.length} classificados sem finalPosition:`);
    classifiedWithoutPos.forEach((c) => {
      console.log(`   - ${c.team.name} (${c.wins}-${c.losses})`);
    });
    hasIssues = true;
  }

  // Verificar ordem das posições
  if (classified.length > 1 && allPositioned) {
    const positions = classified.map((c) => c.finalPosition!).sort((a, b) => a - b);
    const expectedPositions = Array.from({ length: classified.length }, (_, i) => i + 1);
    const positionsMatch = positions.every((p, i) => p === expectedPositions[i]);

    if (!positionsMatch) {
      console.log("❌ Posições não são sequenciais:");
      console.log(`   Esperado: ${expectedPositions.join(", ")}`);
      console.log(`   Atual:    ${positions.join(", ")}`);
      hasIssues = true;
    } else {
      console.log(`✅ Posições sequenciais de 1 a ${classified.length}`);
    }
  }

  // Verificar ordenação correta
  if (classified.length > 1) {
    let orderCorrect = true;
    for (let i = 0; i < classified.length - 1; i++) {
      const a = classified[i]!;
      const b = classified[i + 1]!;

      // Verificar critérios de desempate
      if (a.wins < b.wins) {
        orderCorrect = false;
        console.log(`❌ Ordenação incorreta: ${a.team.name} (${a.wins}W) está antes de ${b.team.name} (${b.wins}W)`);
        hasIssues = true;
        break;
      }
      if (a.wins === b.wins && a.roundDiff < b.roundDiff) {
        orderCorrect = false;
        console.log(`❌ Ordenação incorreta: ${a.team.name} (${a.roundDiff} saldo) está antes de ${b.team.name} (${b.roundDiff} saldo)`);
        hasIssues = true;
        break;
      }
      if (a.wins === b.wins && a.roundDiff === b.roundDiff && a.losses > b.losses) {
        orderCorrect = false;
        console.log(`❌ Ordenação incorreta: ${a.team.name} (${a.losses}L) está antes de ${b.team.name} (${b.losses}L)`);
        hasIssues = true;
        break;
      }
    }

    if (orderCorrect) {
      console.log("✅ Ordenação dos classificados está correta");
    }
  }

  if (!hasIssues && hasClassified) {
    console.log("✅ Nenhum problema detectado");
  }

  console.log("\n═══════════════════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("Erro:", e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

/**
 * Script de teste: Gerar partidas RO16 automaticamente
 * 
 * Verifica se já temos 12 classificados + 4 convidados e gera as partidas.
 * Em produção, isso acontece automaticamente após cada resultado Swiss.
 */

import { PrismaClient } from "@prisma/client";
import { autoGeneratePlayoffMatches } from "../src/services/swiss-classification.service";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Buscando torneios disponíveis...\n");

  const allTournaments = await prisma.tournament.findMany({
    where: { status: { not: "CANCELLED" } },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  console.log("📋 Torneios encontrados:");
  allTournaments.forEach((t, i) => console.log(`   ${i + 1}. ${t.name} (${t.slug})`));
  console.log();

  const tournament = allTournaments[0]; // Usar o mais recente

  if (!tournament) {
    console.error("❌ Nenhum torneio encontrado!");
    process.exit(1);
  }

  console.log(`✅ Torneio encontrado: ${tournament.name}`);
  console.log(`   Slug: ${tournament.slug}`);
  console.log(`   ID: ${tournament.id}\n`);

  // Verificar estado atual
  console.log("📊 Estado atual:");

  const invitedCount = await prisma.invitedTeam.count({
    where: { tournamentId: tournament.id },
  });
  console.log(`   - Times convidados: ${invitedCount}/4`);

  const classifiedCount = await prisma.swissCampaign.count({
    where: {
      tournamentId: tournament.id,
      finalPosition: { not: null },
    },
  });
  console.log(`   - Times classificados: ${classifiedCount}/12`);

  const existingMatches = await prisma.match.count({
    where: {
      tournamentId: tournament.id,
      bracketPosition: { not: null },
    },
  });
  console.log(`   - Partidas RO16 existentes: ${existingMatches}/8\n`);

  // Tentar gerar as partidas
  console.log("🚀 Tentando gerar partidas automaticamente...\n");

  const generated = await autoGeneratePlayoffMatches(tournament.id);

  if (generated) {
    console.log("\n✅ SUCESSO! Partidas RO16 foram criadas automaticamente!");
    
    // Mostrar as partidas criadas
    const matches = await prisma.match.findMany({
      where: {
        tournamentId: tournament.id,
        bracketPosition: { startsWith: "RO16" },
      },
      include: {
        teamA: { select: { name: true, tag: true } },
        teamB: { select: { name: true, tag: true } },
      },
      orderBy: { bracketPosition: "asc" },
    });

    console.log("\n📋 Partidas criadas:");
    matches.forEach((m) => {
      console.log(`   ${m.bracketPosition}: ${m.teamA.name} vs ${m.teamB.name}`);
    });
  } else {
    console.log("\n⏳ Aguardando condições:");
    if (invitedCount < 4) {
      console.log(`   - Faltam ${4 - invitedCount} times convidados`);
    }
    if (classifiedCount < 12) {
      console.log(`   - Faltam ${12 - classifiedCount} times classificados`);
    }
    if (existingMatches > 0) {
      console.log(`   - Partidas já existem (${existingMatches})`);
    }
  }
}

main()
  .catch((error) => {
    console.error("❌ Erro:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

/**
 * Script para verificar o status de um torneio e suas inscrições
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkTournamentStatus() {
  try {
    console.log("🔍 Buscando torneios...\n");

    // Busca todos os torneios com preset
    const tournaments = await prisma.tournament.findMany({
      where: {
        presetId: { not: null },
      },
      include: {
        preset: true,
        registrations: {
          include: {
            team: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (tournaments.length === 0) {
      console.log("❌ Nenhum torneio encontrado");
      return;
    }

    for (const tournament of tournaments) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📋 Torneio: ${tournament.name}`);
      console.log(`   ID: ${tournament.id}`);
      console.log(`   Preset: ${tournament.preset?.name || "N/A"}`);
      console.log(`   Status: ${tournament.status}`);
      
      const presetConfig = tournament.presetConfig as any;
      const swissConfig = presetConfig?.swiss;
      
      if (swissConfig) {
        console.log(`\n   📊 Configuração Suíça:`);
        console.log(`      Times esperados: ${swissConfig.teamsCount}`);
        console.log(`      Rodadas: ${swissConfig.rounds}`);
        console.log(`      Classificados: ${swissConfig.classifiedCount}`);
      }

      console.log(`\n   👥 Inscrições (${tournament.registrations.length}):`);
      
      const approved = tournament.registrations.filter((r) => r.status === "APPROVED");
      const pending = tournament.registrations.filter((r) => r.status === "PENDING");
      const rejected = tournament.registrations.filter((r) => r.status === "REJECTED");
      
      console.log(`      ✅ Aprovadas: ${approved.length}`);
      console.log(`      ⏳ Pendentes: ${pending.length}`);
      console.log(`      ❌ Rejeitadas: ${rejected.length}`);

      if (approved.length > 0) {
        console.log(`\n      Times aprovados:`);
        approved.forEach((reg, i) => {
          console.log(`      ${i + 1}. ${reg.team.name} (@${reg.team.slug})`);
        });
      }

      // Verifica times convidados
      const invitedTeams = await prisma.invitedTeam.findMany({
        where: { tournamentId: tournament.id },
        include: {
          team: {
            select: { name: true, slug: true },
          },
        },
      });

      if (invitedTeams.length > 0) {
        console.log(`\n   🎯 Times Convidados (${invitedTeams.length}):`);
        invitedTeams.forEach((inv) => {
          console.log(`      • ${inv.team.name} - Slot ${inv.bracketSlot}`);
        });
      }

      const swissTeamsCount = approved.length - invitedTeams.length;
      console.log(`\n   🔄 Times na Fase Suíça: ${swissTeamsCount}`);
      
      if (swissConfig && swissTeamsCount !== swissConfig.teamsCount) {
        console.log(`      ⚠️  ATENÇÃO: Esperados ${swissConfig.teamsCount}, mas há ${swissTeamsCount}`);
      }

      // Busca campanhas suíças separadamente
      const swissCampaigns = await prisma.swissCampaign.findMany({
        where: { tournamentId: tournament.id },
      });

      if (swissCampaigns.length > 0) {
        console.log(`\n   ✔️  Fase Suíça Inicializada (${swissCampaigns.length} campanhas)`);
      } else {
        console.log(`\n   ❌ Fase Suíça NÃO Inicializada`);
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  } catch (error) {
    console.error("❌ Erro:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkTournamentStatus();

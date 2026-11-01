/**
 * Script para criar um torneio Swiss de teste com os 20 times
 * 
 * Uso:
 *   npx tsx scripts/create-swiss-tournament.ts
 */

import { PrismaClient, TournamentFormat, TournamentStatus, SeriesFormat, RegistrationStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function createSwissTournament() {
  console.log("🏆 Criando torneio de teste Swiss System...\n");

  // Buscar admin
  const admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
  });

  if (!admin) {
    throw new Error("Nenhum admin encontrado. Execute o seed principal primeiro.");
  }

  // Buscar preset ECL Master Edition
  const preset = await prisma.tournamentPreset.findFirst({
    where: { slug: "ecl-master-edition" },
  });

  if (!preset) {
    throw new Error("Preset ECL Master Edition não encontrado. Execute o seed primeiro.");
  }

  // Verificar se já existe
  const existing = await prisma.tournament.findUnique({
    where: { slug: "ecl-swiss-test-2024" },
  });

  if (existing) {
    console.log("✓ Torneio de teste já existe:", existing.name);
    return existing;
  }

  // Criar torneio
  const tournament = await prisma.tournament.create({
    data: {
      slug: "ecl-swiss-test-2024",
      name: "ECL Swiss Test 2024",
      season: "Teste Swiss System",
      description: "Torneio de teste para o sistema Swiss com 20 equipes competindo em 5 rodadas.",
      format: TournamentFormat.GROUP_STAGE_PLAYOFFS,
      seriesFormat: SeriesFormat.BO1,
      status: TournamentStatus.REGISTRATION_OPEN,
      maxTeams: 24, // 20 na Swiss + 4 convidadas
      autoApprove: true,
      startDate: new Date(Date.now() + 7 * 86400000), // 7 dias no futuro
      registrationDeadline: new Date(Date.now() + 5 * 86400000), // 5 dias
      prizePool: "R$ 10.000 em prêmios",
      rules: `# Regulamento ECL Swiss Test 2024

## Formato do Torneio

### Fase Suíça (20 equipes)
- 5 rodadas no sistema Swiss
- Formato BO1 (Melhor de 1)
- 12 melhores equipes classificam para playoffs

### Equipes Convidadas
- 4 equipes recebem vaga direta para as oitavas
- Não participam da fase suíça

### Playoffs (16 equipes)
- Oitavas: BO3
- Quartas: BO3
- Semi: BO3
- Final: BO5

## Regra Especial
- Time que terminar 3-0 na fase suíça enfrentará o Convidado #1 nas oitavas

## Sistema de Classificação
1. Vitórias
2. Saldo de rounds
3. Confronto direto
4. Força dos oponentes`,
      organizerId: admin.id,
      presetId: preset.id,
    },
  });

  console.log("✓ Torneio criado:", tournament.name);
  console.log("  ID:", tournament.id);
  console.log("  Slug:", tournament.slug);
  console.log("  Status:", tournament.status);

  return tournament;
}

async function registerTeams(tournamentId: string) {
  console.log("\n📝 Inscrevendo 20 times no torneio...\n");

  const teams = await prisma.team.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  if (teams.length < 20) {
    console.log(`⚠️  Apenas ${teams.length} times encontrados. Execute seed-swiss-teams.ts primeiro.`);
  }

  let registered = 0;
  for (const team of teams) {
    try {
      const existing = await prisma.tournamentRegistration.findFirst({
        where: {
          tournamentId,
          teamId: team.id,
        },
      });

      if (existing) {
        console.log(`  ✓ Já inscrito: ${team.name}`);
        continue;
      }

      await prisma.tournamentRegistration.create({
        data: {
          tournamentId,
          teamId: team.id,
          status: RegistrationStatus.APPROVED,
          submittedAt: new Date(),
        },
      });

      registered++;
      console.log(`  ✓ Inscrito: ${team.name} (${team.tag})`);
    } catch (error) {
      console.error(`  ✗ Erro ao inscrever ${team.name}:`, error);
    }
  }

  console.log(`\n🎉 ${registered} times inscritos com sucesso!`);
}

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  CRIAR TORNEIO SWISS DE TESTE                         ");
  console.log("═══════════════════════════════════════════════════════\n");

  const tournament = await createSwissTournament();
  await registerTeams(tournament.id);

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  ✅ SETUP CONCLUÍDO                                    ");
  console.log("═══════════════════════════════════════════════════════");
  console.log("\n📋 Próximos passos:");
  console.log("   1. Acesse o admin e vá para o torneio");
  console.log("   2. Adicione 4 equipes convidadas");
  console.log("   3. Vá para a aba 'Swiss System'");
  console.log("   4. Clique em 'Inicializar Fase Suíça'");
  console.log("   5. Clique em 'Gerar Rodada 1'");
  console.log("\n🔗 Link: http://localhost:3000/tournaments/ecl-swiss-test-2024");
  console.log("\n");
}

main()
  .catch((error) => {
    console.error("❌ Erro fatal:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

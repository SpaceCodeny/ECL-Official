/**
 * Script completo para setup do sistema Swiss de uma vez
 * 
 * Executa:
 * 1. Cria 20 times fictícios
 * 2. Cria torneio Swiss de teste
 * 3. Inscreve os times
 * 
 * Uso:
 *   npx tsx scripts/setup-swiss-complete.ts
 */

import { PrismaClient, UserRole, UserStatus, TournamentFormat, TournamentStatus, SeriesFormat, RegistrationStatus } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const SWISS_TEAMS = [
  { name: "FURIA Esports", tag: "FURIA", slug: "furia-esports" },
  { name: "paiN Gaming", tag: "paiN", slug: "pain-gaming" },
  { name: "MIBR", tag: "MIBR", slug: "mibr" },
  { name: "SilentFury 3", tag: "SF3", slug: "silentfury-3" },
  { name: "9z Team", tag: "9z", slug: "9z-team" },
  { name: "BLOCKS", tag: "BLOCKS", slug: "blocks" },
  { name: "LOUD", tag: "LOUD", slug: "loud" },
  { name: "Fluxo", tag: "FLX", slug: "fluxo" },
  { name: "Los Grandes", tag: "LG", slug: "los-grandes" },
  { name: "Sharks Esports", tag: "SHARKS", slug: "sharks-esports" },
  { name: "TeamOne", tag: "TO", slug: "teamone" },
  { name: "KaBuM! Esports", tag: "KBM", slug: "kabum-esports" },
  { name: "Vivo Keyd", tag: "VK", slug: "vivo-keyd" },
  { name: "Corinthians Esports", tag: "CRTNS", slug: "corinthians-esports" },
  { name: "Flamengo Esports", tag: "FLA", slug: "flamengo-esports" },
  { name: "Santos Esports", tag: "SNT", slug: "santos-esports" },
  { name: "Palmeiras Esports", tag: "PAL", slug: "palmeiras-esports" },
  { name: "Vasco Esports", tag: "VASCO", slug: "vasco-esports" },
  { name: "Athletico Esports", tag: "CAP", slug: "athletico-esports" },
  { name: "Grêmio Esports", tag: "GRE", slug: "gremio-esports" },
];

async function step1_CreateTeams() {
  console.log("\n🎮 PASSO 1: Criando 20 times fictícios\n");
  console.log("─────────────────────────────────────────────────────\n");

  const password = await argon2.hash("Swiss@12345", { type: argon2.argon2id });
  const createdTeams: string[] = [];

  for (const team of SWISS_TEAMS) {
    const captainEmail = `${team.slug}-captain@ecl.test`;
    const captainUsername = `${team.slug.replace(/-/g, "_")}_cap`;

    let existingTeam = await prisma.team.findUnique({ where: { slug: team.slug } });
    if (existingTeam) {
      createdTeams.push(existingTeam.id);
      console.log(`  ✓ ${team.name} (já existe)`);
      continue;
    }

    let user = await prisma.user.findUnique({ where: { email: captainEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: captainEmail,
          username: captainUsername,
          displayName: `${team.name} Captain`,
          passwordHash: password,
          role: UserRole.PLAYER,
          status: UserStatus.ACTIVE,
          emailVerified: new Date(),
        },
      });
    }

    let profile = await prisma.playerProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      profile = await prisma.playerProfile.create({ data: { userId: user.id } });
    }

    const createdTeam = await prisma.team.create({
      data: {
        name: team.name,
        slug: team.slug,
        tag: team.tag,
        captainId: profile.id,
        isActive: true,
        logoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(team.tag)}&background=FF6B00&color=fff&size=256`,
        memberships: { create: { playerId: profile.id, role: "CAPTAIN" } },
      },
    });

    await prisma.user.update({ where: { id: user.id }, data: { role: UserRole.TEAM_CAPTAIN } });
    createdTeams.push(createdTeam.id);
    console.log(`  ✓ ${team.name} (${team.tag})`);
  }

  console.log(`\n  ✅ ${createdTeams.length} times prontos!`);
  return createdTeams;
}

async function step2_CreateTournament() {
  console.log("\n🏆 PASSO 2: Criando torneio Swiss de teste\n");
  console.log("─────────────────────────────────────────────────────\n");

  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (!admin) throw new Error("Admin não encontrado. Execute seed principal primeiro.");

  const preset = await prisma.tournamentPreset.findFirst({ where: { slug: "ecl-master-edition" } });
  if (!preset) throw new Error("Preset ECL Master Edition não encontrado.");

  let tournament = await prisma.tournament.findUnique({ where: { slug: "ecl-swiss-test-2024" } });
  if (tournament) {
    console.log(`  ✓ Torneio já existe: ${tournament.name}\n`);
    return tournament;
  }

  tournament = await prisma.tournament.create({
    data: {
      slug: "ecl-swiss-test-2024",
      name: "ECL Swiss Test 2024",
      season: "Teste Swiss System",
      description: "Torneio de teste para o sistema Swiss com 20 equipes competindo em 5 rodadas.",
      format: TournamentFormat.GROUP_STAGE_PLAYOFFS,
      seriesFormat: SeriesFormat.BO1,
      status: TournamentStatus.REGISTRATION_OPEN,
      maxTeams: 24,
      autoApprove: true,
      startDate: new Date(Date.now() + 7 * 86400000),
      registrationDeadline: new Date(Date.now() + 5 * 86400000),
      prizePool: "R$ 10.000 em prêmios",
      rules: "Formato ECL Master Edition com fase suíça de 5 rodadas + playoffs.",
      organizerId: admin.id,
      presetId: preset.id,
    },
  });

  console.log(`  ✓ Torneio criado: ${tournament.name}`);
  console.log(`  ✓ Slug: ${tournament.slug}\n`);
  return tournament;
}

async function step3_RegisterTeams(tournamentId: string, teamIds: string[]) {
  console.log("\n📝 PASSO 3: Inscrevendo times no torneio\n");
  console.log("─────────────────────────────────────────────────────\n");

  let registered = 0;
  for (const teamId of teamIds) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) continue;

    const existing = await prisma.tournamentRegistration.findFirst({
      where: { tournamentId, teamId },
    });

    if (existing) {
      console.log(`  ✓ ${team.name} (já inscrito)`);
      continue;
    }

    await prisma.tournamentRegistration.create({
      data: {
        tournamentId,
        teamId,
        status: RegistrationStatus.APPROVED,
        submittedAt: new Date(),
      },
    });

    registered++;
    console.log(`  ✓ ${team.name}`);
  }

  console.log(`\n  ✅ ${registered + (teamIds.length - registered)} times inscritos!`);
}

async function main() {
  console.log("\n");
  console.log("═══════════════════════════════════════════════════════");
  console.log("  SETUP COMPLETO - SISTEMA SWISS ECL                   ");
  console.log("═══════════════════════════════════════════════════════");

  const teamIds = await step1_CreateTeams();
  const tournament = await step2_CreateTournament();
  await step3_RegisterTeams(tournament.id, teamIds);

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  ✅ SETUP CONCLUÍDO COM SUCESSO!                       ");
  console.log("═══════════════════════════════════════════════════════");
  
  console.log("\n📊 RESUMO:");
  console.log(`  • 20 times criados e inscritos`);
  console.log(`  • Torneio: ${tournament.name}`);
  console.log(`  • Status: ${tournament.status}`);
  
  console.log("\n📋 PRÓXIMOS PASSOS NO ADMIN:");
  console.log("  1. Acesse: /tournaments/ecl-swiss-test-2024");
  console.log("  2. Vá para aba 'Convidados'");
  console.log("  3. Adicione 4 equipes convidadas (ex: furia-esports, pain-gaming, mibr, silentfury-3)");
  console.log("  4. Vá para aba 'Swiss System'");
  console.log("  5. Clique em 'Inicializar Fase Suíça'");
  console.log("  6. Clique em 'Gerar Rodada 1'");
  console.log("  7. Repita até completar 5 rodadas");
  console.log("  8. Clique em 'Finalizar Fase Suíça'");
  
  console.log("\n🔐 CREDENCIAIS DOS CAPITÃES:");
  console.log("  Email: [slug]-captain@ecl.test");
  console.log("  Senha: Swiss@12345");
  console.log("  Exemplo: furia-esports-captain@ecl.test");
  
  console.log("\n🔗 LINKS:");
  console.log(`  Frontend: http://localhost:3000/tournaments/${tournament.slug}`);
  console.log(`  Admin: http://localhost:3000/admin/tournaments`);
  console.log("\n");
}

main()
  .catch((error) => {
    console.error("\n❌ ERRO FATAL:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

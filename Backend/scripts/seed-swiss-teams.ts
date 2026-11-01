/**
 * Script para criar 20 times fictícios e testá-los no sistema Swiss
 * 
 * Uso:
 *   npx tsx scripts/seed-swiss-teams.ts
 */

import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

// 20 times fictícios inspirados em equipes de esports
const SWISS_TEAMS = [
  { name: "FURIA Esports", tag: "FURIA", slug: "furia-esports" },
  { name: "paiN Gaming", tag: "paiN", slug: "pain-gaming" },
  { name: "MIBR", tag: "MIBR", slug: "mibr" },
  { name: "Imperial Esports", tag: "IMP", slug: "imperial-esports" },
  { name: "9z Team", tag: "9z", slug: "9z-team" },
  { name: "RED Canids", tag: "RED", slug: "red-canids" },
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

async function createTeamsWithCaptains() {
  const password = await argon2.hash("Swiss@12345", { type: argon2.argon2id });
  const createdTeams: string[] = [];

  console.log("🎮 Criando 20 times fictícios para teste do Swiss System...\n");

  for (let i = 0; i < SWISS_TEAMS.length; i++) {
    const team = SWISS_TEAMS[i]!;
    const captainEmail = `${team.slug}-captain@ecl.test`;
    const captainUsername = `${team.slug.replace(/-/g, "_")}_cap`;

    try {
      // Verifica se o time já existe
      let existingTeam = await prisma.team.findUnique({
        where: { slug: team.slug },
      });

      if (existingTeam) {
        console.log(`✓ Time já existe: ${team.name} (${team.tag})`);
        createdTeams.push(existingTeam.id);
        continue;
      }

      // Cria usuário do capitão
      let user = await prisma.user.findUnique({
        where: { email: captainEmail },
      });

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

      // Cria perfil de jogador
      let profile = await prisma.playerProfile.findUnique({
        where: { userId: user.id },
      });

      if (!profile) {
        profile = await prisma.playerProfile.create({
          data: { userId: user.id },
        });
      }

      // Cria o time
      const createdTeam = await prisma.team.create({
        data: {
          name: team.name,
          slug: team.slug,
          tag: team.tag,
          captainId: profile.id,
          isActive: true,
          logoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(team.tag)}&background=FF6B00&color=fff&size=256`,
          memberships: {
            create: {
              playerId: profile.id,
              role: "CAPTAIN",
            },
          },
        },
      });

      // Eleva usuário para TEAM_CAPTAIN
      await prisma.user.update({
        where: { id: user.id },
        data: { role: UserRole.TEAM_CAPTAIN },
      });

      createdTeams.push(createdTeam.id);
      console.log(`✓ Criado: ${team.name} (${team.tag})`);
    } catch (error) {
      console.error(`✗ Erro ao criar ${team.name}:`, error);
    }
  }

  console.log(`\n🎉 ${createdTeams.length} times criados/verificados com sucesso!`);
  return createdTeams;
}

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  SEED: 20 Times para Sistema Swiss - ECL              ");
  console.log("═══════════════════════════════════════════════════════\n");

  const teamIds = await createTeamsWithCaptains();

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  ✅ SEED CONCLUÍDO                                     ");
  console.log("═══════════════════════════════════════════════════════");
  console.log("\n📋 Próximos passos:");
  console.log("   1. Crie um torneio com preset ECL Master Edition");
  console.log("   2. Inscreva estes times no torneio");
  console.log("   3. Aprove as inscrições");
  console.log("   4. Adicione 4 equipes convidadas");
  console.log("   5. Inicialize a fase suíça");
  console.log("   6. Gere as rodadas");
  console.log("\n💡 Emails dos capitães:");
  console.log("   Format: [slug]-captain@ecl.test");
  console.log("   Senha: Swiss@12345");
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

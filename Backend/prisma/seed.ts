/**
 * Seed de desenvolvimento — Elite Champions League
 * Idempotente: pode ser executado múltiplas vezes.
 * DADOS FICTÍCIOS — claramente marcados como demonstração.
 *
 * NÃO usar credenciais fixas em produção.
 */
import {
  PrismaClient,
  UserRole,
  UserStatus,
  TournamentFormat,
  TournamentStatus,
  SeriesFormat,
  RegistrationStatus,
  MatchStatus,
  AnnouncementType,
} from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

// ─── Dados fictícios ──────────────────────────────────────────────────────────

const DEMO_TEAMS = [
  { name: "Phantom Squad", tag: "PHN", slug: "phantom-squad" },
  { name: "Crimson Wolves", tag: "CRW", slug: "crimson-wolves" },
  { name: "Nova Vanguard", tag: "NOVA", slug: "nova-vanguard" },
  { name: "Iron Titans", tag: "IRON", slug: "iron-titans" },
  { name: "Apex Force BR", tag: "APX", slug: "apex-force-br" },
  { name: "Silent Storm", tag: "STM", slug: "silent-storm" },
];

const DEMO_PLAYERS = [
  { username: "phantom_cap", email: "phantom@ecl.demo", displayName: "Phantom Captain" },
  { username: "crimson_cap", email: "crimson@ecl.demo", displayName: "Crimson Captain" },
  { username: "nova_cap", email: "nova@ecl.demo", displayName: "Nova Captain" },
  { username: "iron_cap", email: "iron@ecl.demo", displayName: "Iron Captain" },
  { username: "apex_cap", email: "apex@ecl.demo", displayName: "Apex Captain" },
  { username: "silent_cap", email: "silent@ecl.demo", displayName: "Silent Captain" },
];

async function seedAdmin() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@ecl.local";
  const username = process.env.ADMIN_BOOTSTRAP_USERNAME ?? "ecl_admin";
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "ChangeMe!Admin2025";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`[seed] Admin já existe (${email}) — pulando.`);
    return existing;
  }

  const hash = await argon2.hash(password, { type: argon2.argon2id });
  const admin = await prisma.user.create({
    data: {
      email, username, passwordHash: hash, displayName: "ECL Administrator",
      role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIVE, emailVerified: new Date(),
    },
  });
  console.log(`[seed] Admin criado: ${email}`);
  return admin;
}

async function seedDemoPlayers() {
  const password = await argon2.hash("Demo@12345", { type: argon2.argon2id });
  const players: { userId: string; profileId: string }[] = [];

  for (const p of DEMO_PLAYERS) {
    let user = await prisma.user.findUnique({ where: { email: p.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          ...p, passwordHash: password, role: UserRole.PLAYER,
          status: UserStatus.ACTIVE, emailVerified: new Date(),
        },
      });
    }
    let profile = await prisma.playerProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      profile = await prisma.playerProfile.create({ data: { userId: user.id } });
    }
    players.push({ userId: user.id, profileId: profile.id });
  }

  console.log(`[seed] ${players.length} jogadores de demo criados.`);
  return players;
}

async function seedDemoTeams(players: { userId: string; profileId: string }[]) {
  const teamIds: string[] = [];

  for (let i = 0; i < DEMO_TEAMS.length; i++) {
    const t = DEMO_TEAMS[i]!;
    const player = players[i]!;

    let team = await prisma.team.findUnique({ where: { slug: t.slug } });
    if (!team) {
      team = await prisma.team.create({
        data: {
          name: t.name, slug: t.slug, tag: t.tag,
          captainId: player.profileId, isActive: true,
          memberships: { create: { playerId: player.profileId, role: "CAPTAIN" } },
        },
      });

      // Eleva para TEAM_CAPTAIN
      await prisma.user.update({ where: { id: player.userId }, data: { role: UserRole.TEAM_CAPTAIN } });
    }
    teamIds.push(team.id);
  }

  console.log(`[seed] ${teamIds.length} equipes de demo criadas.`);
  return teamIds;
}

async function seedDemoTournament(organizerId: string, teamIds: string[]) {
  const slug = "ecl-demo-season-1";
  let tournament = await prisma.tournament.findUnique({ where: { slug } });

  if (!tournament) {
    tournament = await prisma.tournament.create({
      data: {
        slug, name: "ECL Demo Season 1", season: "Temporada 1 — Demo",
        description: "Campeonato de demonstração da Elite Champions League. Dados fictícios.",
        format: TournamentFormat.GROUP_STAGE_PLAYOFFS,
        seriesFormat: SeriesFormat.BO3,
        status: TournamentStatus.IN_PROGRESS,
        maxTeams: 8, autoApprove: true,
        startDate: new Date(Date.now() - 7 * 86400000),
        organizerId,
      },
    });

    // Inscreve as 6 equipes
    for (const teamId of teamIds) {
      await prisma.tournamentRegistration.create({
        data: { tournamentId: tournament.id, teamId, status: RegistrationStatus.APPROVED },
      });
    }

    // Cria fase de grupos
    const stage = await prisma.tournamentStage.create({
      data: {
        tournamentId: tournament.id,
        name: "Fase de Grupos",
        order: 1, type: "GROUP", seriesFormat: SeriesFormat.BO3,
      },
    });

    // Grupo A com equipes 0-2 e Grupo B com equipes 3-5
    for (const [groupName, teamSlice] of [
      ["Grupo A", teamIds.slice(0, 3)] as [string, string[]],
      ["Grupo B", teamIds.slice(3, 6)] as [string, string[]],
    ]) {
      const group = await prisma.group.create({
        data: { stageId: stage.id, name: groupName, order: groupName === "Grupo A" ? 1 : 2 },
      });

      // Cria standings zerados
      for (const teamId of teamSlice) {
        await prisma.standing.create({ data: { groupId: group.id, teamId } });
      }

      // Uma partida de demo com resultado
      if (teamSlice[0] && teamSlice[1]) {
        await prisma.match.create({
          data: {
            tournamentId: tournament.id, stageId: stage.id, groupId: group.id,
            teamAId: teamSlice[0], teamBId: teamSlice[1],
            scheduledAt: new Date(Date.now() - 3 * 86400000),
            status: MatchStatus.COMPLETED,
            seriesFormat: SeriesFormat.BO3,
            scoreA: 2, scoreB: 1, winnerTeamId: teamSlice[0],
          },
        });
        // Atualiza standings
        await prisma.standing.updateMany({ where: { groupId: group.id, teamId: teamSlice[0] }, data: { played: 1, wins: 1, losses: 0, mapsWon: 2, mapsLost: 1, points: 3 } });
        await prisma.standing.updateMany({ where: { groupId: group.id, teamId: teamSlice[1] }, data: { played: 1, wins: 0, losses: 1, mapsWon: 1, mapsLost: 2, points: 0 } });
      }

      // Partida agendada (futura)
      if (teamSlice[0] && teamSlice[2]) {
        await prisma.match.create({
          data: {
            tournamentId: tournament.id, stageId: stage.id, groupId: group.id,
            teamAId: teamSlice[0], teamBId: teamSlice[2],
            scheduledAt: new Date(Date.now() + 2 * 86400000),
            status: MatchStatus.SCHEDULED,
            seriesFormat: SeriesFormat.BO3,
          },
        });
      }
    }

    console.log(`[seed] Campeonato de demo criado: ${tournament.name}`);
  } else {
    console.log(`[seed] Campeonato de demo já existe — pulando.`);
  }
}

async function seedAnnouncements(organizerId: string) {
  const count = await prisma.announcement.count();
  if (count > 0) { console.log("[seed] Anúncios já existem — pulando."); return; }

  await prisma.announcement.createMany({
    data: [
      { title: "Bem-vindo à ECL!", summary: "A plataforma oficial de torneios de Standoff 2 foi lançada.", type: AnnouncementType.ANNOUNCEMENT },
      { title: "ECL Demo Season 1 em andamento", summary: "O primeiro campeonato de demonstração já está em andamento. Confira as partidas e classificações.", type: AnnouncementType.GENERAL },
      { title: "Inscrições abertas para a próxima temporada", summary: "Em breve abriremos inscrições para a Temporada 2. Prepare sua equipe!", type: AnnouncementType.REGISTRATION_OPEN },
    ],
  });
  console.log("[seed] Anúncios criados.");
}

async function main() {
  console.log("[seed] Iniciando seed da Elite Champions League...");
  const admin = await seedAdmin();
  const players = await seedDemoPlayers();
  const teamIds = await seedDemoTeams(players);
  await seedDemoTournament(admin.id, teamIds);
  await seedAnnouncements(admin.id);
  console.log("[seed] Concluído.");
}

main()
  .catch((e) => { console.error("[seed] Erro:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());

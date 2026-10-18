/**
 * DADOS DE DEMONSTRAÇÃO — Elite Champions League
 *
 * Estes dados são fictícios e usados APENAS como fallback visual quando a API
 * ainda não está disponível (fases iniciais). Eles são claramente identificados
 * por `isDemo: true` / badges de "Demonstração" na interface.
 *
 * Quando o backend e o seed estiverem ativos, a interface exibe dados reais.
 */
import type { FeaturedTournament, RankingEntry, Announcement, OrganizationStats } from "@/types/domain";
import type { Match } from "@/types/match";
import type { TournamentListItem } from "@/types/tournament";

export const demoFeaturedTournament: FeaturedTournament = {
  id: "demo-featured",
  slug: "ecl-demo-season",
  name: "ECL Demonstration Season",
  season: "Temporada 0 — Demo",
  status: "REGISTRATION_OPEN",
  startDate: new Date(Date.now() + 7 * 86400000).toISOString(),
  format: "GROUP_STAGE_PLAYOFFS",
  registeredTeams: 12,
  maxTeams: 16,
  prizePool: null,
  bannerUrl: null,
  description: "Campeonato de demonstração da Elite Champions League — conteúdo fictício para prévia visual.",
};

export const demoMatches: Match[] = [
  {
    id: "demo-m1",
    tournamentId: "demo",
    tournamentName: "ECL Demonstration Season",
    tournamentSlug: "ecl-demo-season",
    stage: "Fase de Grupos",
    round: "Rodada 1",
    teamA: { id: "t1", name: "Phantom Squad", tag: "PHN", logoUrl: null, score: null },
    teamB: { id: "t2", name: "Crimson Wolves", tag: "CRW", logoUrl: null, score: null },
    scheduledAt: new Date(Date.now() + 2 * 3600000).toISOString(),
    status: "SCHEDULED",
    seriesFormat: "BO3",
    map: null,
    winnerTeamId: null,
    aggregateScoreA: null,
    aggregateScoreB: null,
  },
  {
    id: "demo-m2",
    tournamentId: "demo",
    tournamentName: "ECL Demonstration Season",
    tournamentSlug: "ecl-demo-season",
    stage: "Fase de Grupos",
    round: "Rodada 1",
    teamA: { id: "t3", name: "Nova Vanguard", tag: "NOVA", logoUrl: null, score: 1 },
    teamB: { id: "t4", name: "Iron Titans", tag: "IRON", logoUrl: null, score: 0 },
    scheduledAt: new Date().toISOString(),
    status: "LIVE",
    seriesFormat: "BO3",
    map: "Sandstone",
    winnerTeamId: null,
    aggregateScoreA: 1,
    aggregateScoreB: 0,
  },
  {
    id: "demo-m3",
    tournamentId: "demo",
    tournamentName: "ECL Demonstration Season",
    tournamentSlug: "ecl-demo-season",
    stage: "Fase de Grupos",
    round: "Rodada 1",
    teamA: { id: "t5", name: "Apex Legends BR", tag: "APX", logoUrl: null, score: 2 },
    teamB: { id: "t6", name: "Silent Storm", tag: "STM", logoUrl: null, score: 1 },
    scheduledAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    status: "COMPLETED",
    seriesFormat: "BO3",
    map: null,
    winnerTeamId: "t5",
    aggregateScoreA: 2,
    aggregateScoreB: 1,
  },
];

export const demoTournaments: TournamentListItem[] = [
  {
    id: "demo-t1",
    slug: "ecl-demo-season",
    name: "ECL Demonstration Season",
    season: "Temporada 0 — Demo",
    status: "REGISTRATION_OPEN",
    format: "GROUP_STAGE_PLAYOFFS",
    startDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    registeredTeams: 12,
    maxTeams: 16,
    bannerUrl: null,
    prizePool: null,
  },
  {
    id: "demo-t2",
    slug: "ecl-demo-cup",
    name: "ECL Demo Cup",
    season: "Temporada 0 — Demo",
    status: "IN_PROGRESS",
    format: "SINGLE_ELIMINATION",
    startDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    registeredTeams: 8,
    maxTeams: 8,
    bannerUrl: null,
    prizePool: null,
  },
  {
    id: "demo-t3",
    slug: "ecl-demo-classic",
    name: "ECL Demo Classic",
    season: "Temporada 0 — Demo",
    status: "COMPLETED",
    format: "ROUND_ROBIN",
    startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
    registeredTeams: 6,
    maxTeams: 6,
    bannerUrl: null,
    prizePool: null,
  },
];

export const demoRanking: RankingEntry[] = [
  { position: 1, previousPosition: 2, team: { id: "t5", slug: "apex-legends-br", name: "Apex Legends BR", tag: "APX", logoUrl: null }, points: 1820, wins: 14, losses: 3, matchesPlayed: 17, titles: 2 },
  { position: 2, previousPosition: 1, team: { id: "t1", slug: "phantom-squad", name: "Phantom Squad", tag: "PHN", logoUrl: null }, points: 1640, wins: 12, losses: 5, matchesPlayed: 17, titles: 1 },
  { position: 3, previousPosition: 3, team: { id: "t3", slug: "nova-vanguard", name: "Nova Vanguard", tag: "NOVA", logoUrl: null }, points: 1390, wins: 10, losses: 7, matchesPlayed: 17, titles: 0 },
  { position: 4, previousPosition: 4, team: { id: "t2", slug: "crimson-wolves", name: "Crimson Wolves", tag: "CRW", logoUrl: null }, points: 1180, wins: 9, losses: 8, matchesPlayed: 17, titles: 0 },
  { position: 5, previousPosition: 6, team: { id: "t4", slug: "iron-titans", name: "Iron Titans", tag: "IRON", logoUrl: null }, points: 960, wins: 7, losses: 10, matchesPlayed: 17, titles: 0 },
];

export const demoAnnouncements: Announcement[] = [
  {
    id: "demo-a1",
    title: "Abertura de inscrições — ECL Demonstration Season",
    summary: "As inscrições para a temporada de demonstração estão abertas. Conteúdo fictício para prévia visual da plataforma.",
    type: "REGISTRATION_OPEN",
    publishedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    coverUrl: null,
  },
  {
    id: "demo-a2",
    title: "Resultados da rodada de abertura",
    summary: "Confira os resultados fictícios da primeira rodada do campeonato de demonstração.",
    type: "RESULT",
    publishedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    coverUrl: null,
  },
  {
    id: "demo-a3",
    title: "Comunicado oficial da organização",
    summary: "A Elite Champions League apresenta sua plataforma competitiva. Demonstração visual.",
    type: "ANNOUNCEMENT",
    publishedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    coverUrl: null,
  },
];

export const demoStats: OrganizationStats = {
  tournamentsHeld: 3,
  teamsRegistered: 16,
  matchesPlayed: 51,
  playersRegistered: 48,
  isDemo: true,
};

/** Re-exporta o helper centralizado (mantido aqui para conveniência de import). */
export { hasNoData } from "@/lib/utils";

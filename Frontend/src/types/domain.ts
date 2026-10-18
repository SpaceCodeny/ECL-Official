/**
 * Tipos de domínio — Equipes, Ranking, Anúncios e Estatísticas.
 */

export interface TeamSummary {
  id: string;
  slug: string;
  name: string;
  tag: string | null;
  logoUrl: string | null;
}

export interface RankingEntry {
  position: number;
  previousPosition: number | null;
  team: TeamSummary;
  points: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  titles: number;
}

export type AnnouncementType =
  | "GENERAL"
  | "REGISTRATION_OPEN"
  | "RESULT"
  | "SCHEDULE"
  | "ANNOUNCEMENT";

export interface Announcement {
  id: string;
  title: string;
  summary: string;
  type: AnnouncementType;
  publishedAt: string;
  coverUrl: string | null;
}

export interface OrganizationStats {
  tournamentsHeld: number;
  teamsRegistered: number;
  matchesPlayed: number;
  playersRegistered: number;
  isDemo: boolean;
}

export interface FeaturedTournament {
  id: string;
  slug: string;
  name: string;
  season: string;
  status: string;
  startDate: string | null;
  format: string;
  registeredTeams: number;
  maxTeams: number;
  prizePool: string | null;
  bannerUrl: string | null;
  description: string | null;
}

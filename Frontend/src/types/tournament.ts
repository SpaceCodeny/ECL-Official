/**
 * Tipos de domínio — Campeonatos.
 * Espelham os enums do backend (Prisma) e a API REST.
 */

export type TournamentStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type TournamentFormat =
  | "SINGLE_ELIMINATION"
  | "DOUBLE_ELIMINATION"
  | "ROUND_ROBIN"
  | "GROUP_STAGE_PLAYOFFS";

export type SeriesFormat = "BO1" | "BO3" | "BO5";

export interface Tournament {
  id: string;
  slug: string;
  name: string;
  season: string;
  description: string | null;
  bannerUrl: string | null;
  status: TournamentStatus;
  format: TournamentFormat;
  seriesFormat: SeriesFormat;
  startDate: string | null;
  endDate: string | null;
  registrationDeadline: string | null;
  maxTeams: number;
  registeredTeams: number;
  prizePool: string | null;
  organizer: string | null;
  rules: string | null;
  createdAt: string;
}

export interface TournamentListItem {
  id: string;
  slug: string;
  name: string;
  season: string;
  status: TournamentStatus;
  format: TournamentFormat;
  startDate: string | null;
  registeredTeams: number;
  maxTeams: number;
  bannerUrl: string | null;
  prizePool: string | null;
}

export interface Tournament extends TournamentListItem {
  description: string | null;
  endDate: string | null;
  registrationDeadline: string | null;
  seriesFormat: SeriesFormat;
  autoApprove: boolean;
  rules: string | null;
  organizerId: string;
  createdAt: string;
}

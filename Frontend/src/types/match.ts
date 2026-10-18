import type { SeriesFormat } from "./tournament";

/**
 * Tipos de domínio — Partidas.
 */

export type MatchStatus =
  | "SCHEDULED"
  | "READY"
  | "LIVE"
  | "AWAITING_RESULT"
  | "COMPLETED"
  | "DISPUTED"
  | "CANCELLED";

export interface MatchTeam {
  id: string;
  name: string;
  tag: string | null;
  logoUrl: string | null;
  score: number | null;
}

export interface Match {
  id: string;
  tournamentId: string;
  tournamentName: string;
  tournamentSlug: string;
  stage: string;
  round: string | null;
  teamA: MatchTeam;
  teamB: MatchTeam;
  scheduledAt: string | null;
  status: MatchStatus;
  seriesFormat: SeriesFormat;
  map: string | null;
  winnerTeamId: string | null;
  aggregateScoreA: number | null;
  aggregateScoreB: number | null;
}

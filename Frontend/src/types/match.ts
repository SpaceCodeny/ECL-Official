import type { SeriesFormat } from "./tournament";

/**
 * Tipos de domínio — Partidas.
 * Espelha o retorno real do backend (MatchesService.list / findById).
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
  slug?: string;
  name: string;
  tag: string | null;
  logoUrl: string | null;
}

export interface MatchStage {
  name: string;
  order?: number;
  tournament: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface Match {
  id: string;
  tournamentId: string;
  round: string | null;
  scheduledAt: string | null;
  status: MatchStatus;
  seriesFormat: SeriesFormat;
  winnerTeamId: string | null;
  /** Placar agregado da série (campo scoreA/scoreB no banco). */
  scoreA?: number | null;
  scoreB?: number | null;
  notes?: string | null;
  /** O backend retorna stage como objeto com nome e torneio. */
  stage: string | MatchStage;
  teamA: MatchTeam;
  teamB: MatchTeam;
}

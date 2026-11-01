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
  type?: string; // GROUP | BRACKET | ROUND_ROBIN | SWISS
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
  /** Para playoffs: posição no bracket (ex: "QF1", "SF1", "FINAL") */
  bracketPosition?: string | null;
  /** ID da rodada suíça (preenchido quando a partida pertence a uma SwissRound) */
  swissRoundId?: string | null;
  /** Objeto da rodada suíça com o número canônico */
  swissRound?: { id: string; roundNumber: number } | null;
  /** O backend retorna stage como objeto com nome e torneio. */
  stage: string | MatchStage;
  teamA: MatchTeam;
  teamB: MatchTeam;
}

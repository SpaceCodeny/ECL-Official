/**
 * Tipos para o sistema de presets de campeonatos
 */

export type PresetPhaseType = "SWISS" | "BRACKET" | "GROUP" | "ROUND_ROBIN";

export interface PresetPhase {
  name: string;
  type: PresetPhaseType;
  order: number;
  defaultSeriesFormat: "BO1" | "BO3" | "BO5";
  teamsCount?: number;
  roundsCount?: number;
  advancingTeams?: number;
}

export interface PresetSwissConfig {
  teamsCount: number;
  roundsCount: number;
  classifiedCount: number;
  allowTiebreakers: boolean;
  tiebreakCriteria: string[];
}

export interface PresetBracketConfig {
  teamsCount: number;
  format: "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION";
  invitedTeams?: number;
  specialRules?: {
    /** Regra especial: time 3-0 enfrenta convidado específico */
    perfect3_0_vs_invited?: {
      enabled: boolean;
      invitedSlot: number; // 1-4
    };
  };
}

export interface PresetConfig {
  version: string;
  phases: PresetPhase[];
  swiss?: PresetSwissConfig;
  bracket?: PresetBracketConfig;
  totalTeams: number;
  classification: {
    type: "ROUNDS_THEN_RANKING" | "ELIMINATION";
    criteria: string[];
  };
}

export interface TournamentPreset {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  version: string;
  isActive: boolean;
  config: PresetConfig;
  createdAt: string;
  updatedAt: string;
}

export interface PresetSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  totalTeams: number;
  hasSwissPhase: boolean;
  hasBracketPhase: boolean;
  invitedTeamsCount: number;
}

// ── Swiss System ─────────────────────────────────────────────────────────────

export interface SwissCampaign {
  id: string;
  tournamentId: string;
  teamId: string;
  wins: number;
  losses: number;
  roundsPlayed: number;
  roundDiff: number;
  opponentsIds: string[];
  isEliminated: boolean;
  finalPosition: number | null;
  team: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    tag: string | null;
  };
}

export interface SwissRound {
  id: string;
  tournamentId: string;
  roundNumber: number;
  startDate: string | null;
  endDate: string | null;
  isComplete: boolean;
  matches: Array<{
    id: string;
    teamAId: string;
    teamBId: string;
    scoreA: number | null;
    scoreB: number | null;
    status: string;
    winnerTeamId: string | null;
  }>;
}

export interface SwissStandings {
  campaigns: SwissCampaign[];
  currentRound: number;
  totalRounds: number;
  classifiedCount: number;
}

// ── Invited Teams ────────────────────────────────────────────────────────────

export interface InvitedTeam {
  id: string;
  tournamentId: string;
  teamId: string;
  bracketSlot: number;
  reservedOpponent: string | null;
  team: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    tag: string | null;
  };
}

// ── Bracket ──────────────────────────────────────────────────────────────────

export type BracketPhase = "RO16" | "QF" | "SF" | "FINAL" | "THIRD_PLACE";

export interface BracketMatch {
  id: string;
  phase: BracketPhase;
  position: string; // "RO16-1", "QF-1", "SF-1", "FINAL"
  teamAId: string | null;
  teamBId: string | null;
  teamA: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    tag: string | null;
  } | null;
  teamB: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    tag: string | null;
  } | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerTeamId: string | null;
  status: string;
  scheduledAt: string | null;
}

export interface BracketTree {
  ro16: BracketMatch[];
  quarterfinals: BracketMatch[];
  semifinals: BracketMatch[];
  final: BracketMatch | null;
  thirdPlace: BracketMatch | null;
}

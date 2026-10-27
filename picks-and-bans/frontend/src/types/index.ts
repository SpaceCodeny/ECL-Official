export const MAPS = [
  "Breeze",
  "Dune",
  "Hanami",
  "Prision",
  "Province",
  "Rust",
  "Sandstone",
] as const;

export type MapName = (typeof MAPS)[number];

export type ActionType = "BAN" | "PICK";

// team pode ser "A", "B" ou "DECIDER" (usado no mapa decider)
export type TeamSide = "A" | "B" | "DECIDER";

export type SeriesFormat = "BO1" | "BO3" | "BO5";

export type SessionStatus = "WAITING" | "IN_PROGRESS" | "COMPLETED" | "TERMINATED";

export interface MapAction {
  map: string; // string genérico para compatibilidade com mapas customizados
  team: TeamSide;
  action: ActionType;
  order: number;
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  logoUrl?: string | null;
  leader?: string | null;
}

export interface PickBanSession {
  id: string;
  teamA: Team;
  teamB: Team;
  actions: MapAction[];
  currentTurn: "A" | "B";
  currentAction: ActionType;
  seriesFormat: SeriesFormat;
  status: SessionStatus;
  createdAt: string;
  completedAt?: string | null;
  createdBy?: string;
  createdById?: string;
  lastUpdate?: number;
}

export const SEQUENCES: Record<SeriesFormat, Array<{ team: "A" | "B"; action: ActionType }>> = {
  // BO1: 6 bans → decider
  BO1: [
    { team: "A", action: "BAN" },
    { team: "B", action: "BAN" },
    { team: "A", action: "BAN" },
    { team: "B", action: "BAN" },
    { team: "A", action: "BAN" },
    { team: "B", action: "BAN" },
  ],
  // BO3: 2 bans, 2 picks, 2 bans → decider
  BO3: [
    { team: "A", action: "BAN" },
    { team: "B", action: "BAN" },
    { team: "A", action: "PICK" },
    { team: "B", action: "PICK" },
    { team: "B", action: "BAN" },
    { team: "A", action: "BAN" },
  ],
  // BO5: 2 picks, 2 bans, 2 picks → decider
  BO5: [
    { team: "A", action: "PICK" },
    { team: "B", action: "PICK" },
    { team: "A", action: "BAN" },
    { team: "B", action: "BAN" },
    { team: "A", action: "PICK" },
    { team: "B", action: "PICK" },
  ],
};

// Mantido para compatibilidade retroativa
export const PICK_BAN_SEQUENCE = SEQUENCES.BO3;

export const MAPS = [
  "Breeze",
  "Dune",
  "Hanami",
  "Prision",
  "Province",
  "Rust",
  "Sakura",
  "Sandstone",
] as const;

export type MapName = (typeof MAPS)[number];

export type ActionType = "BAN" | "PICK";

export interface MapAction {
  map: MapName;
  team: "A" | "B";
  action: ActionType;
  order: number;
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  logoUrl?: string;
  leader?: string | null;
}

export interface PickBanSession {
  id: string;
  teamA: Team;
  teamB: Team;
  actions: MapAction[];
  currentTurn: "A" | "B";
  currentAction: ActionType;
  status: "WAITING" | "IN_PROGRESS" | "COMPLETED";
  createdAt: string;
  completedAt?: string;
}

export const PICK_BAN_SEQUENCE: Array<{ team: "A" | "B"; action: ActionType }> = [
  { team: "A", action: "BAN" },
  { team: "B", action: "BAN" },
  { team: "A", action: "PICK" },
  { team: "B", action: "PICK" },
  { team: "B", action: "BAN" },
  { team: "A", action: "BAN" },
];

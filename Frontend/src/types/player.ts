export type PlayerStatus = "ACTIVE" | "BENCH";

export interface PlayerTeamSummary {
  id: string;
  name: string;
  slug: string;
  tag: string | null;
  logoUrl: string | null;
}

export interface PlayerMembership {
  id: string;
  role: string;
  joinedAt: string;
  team: PlayerTeamSummary;
}

export interface PlayerProfile {
  id: string;
  standoffId: string | null;
  bio: string | null;
  country: string | null;
  status: PlayerStatus;
  memberships: PlayerMembership[];
}

export interface PlayerListItem {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  createdAt: string;
  playerProfile: PlayerProfile | null;
}

export interface TransferHistoryEntry {
  id: string;
  fromTeamId: string | null;
  fromTeamName: string | null;
  toTeamId: string | null;
  toTeamName: string | null;
  description: string;
  transferredBy: string;
  createdAt: string;
}

export interface PlayerDetail extends PlayerListItem {
  transferHistory: TransferHistoryEntry[];
}

export interface TransferConflict {
  code: "PLAYER_IN_TEAM";
  currentTeam: { id: string; name: string; tag: string | null };
  message: string;
}

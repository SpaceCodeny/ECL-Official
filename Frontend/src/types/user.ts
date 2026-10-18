export type UserRole =
  | "SUPER_ADMIN"
  | "ADMINISTRATOR"
  | "TOURNAMENT_ORGANIZER"
  | "REFEREE"
  | "TEAM_CAPTAIN"
  | "PLAYER"
  | "VISITOR";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION" | "DELETED";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
}

// Hierarquia de permissões (ordem crescente = mais privilegiado no final).
export const ROLE_HIERARCHY: UserRole[] = [
  "VISITOR",
  "PLAYER",
  "TEAM_CAPTAIN",
  "REFEREE",
  "TOURNAMENT_ORGANIZER",
  "ADMINISTRATOR",
  "SUPER_ADMIN",
];

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}

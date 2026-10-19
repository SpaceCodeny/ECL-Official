import { api } from "@/lib/api-client";
import type { Paginated } from "@/types/common";

export interface Team {
  id: string;
  name: string;
  slug: string;
  tag: string | null;
  logoUrl: string | null;
  description: string | null;
  captainId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamWithMembers extends Team {
  memberships: Array<{
    id: string;
    role: string;
    joinedAt: Date;
    player: {
      id: string;
      user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
      };
    };
  }>;
}

export interface CreateTeamDto {
  name: string;
  tag?: string;
  description?: string;
  logoUrl?: string;
}

export interface UpdateTeamDto {
  name?: string;
  tag?: string;
  description?: string;
  logoUrl?: string;
  captainId?: string;
  isActive?: boolean;
}

export interface AddMemberDto {
  playerId: string;
  role?: "CAPTAIN" | "PLAYER" | "SUBSTITUTE";
}

export const teamsService = {
  // Listar times
  getTeams: (params: { page?: number; limit?: number; search?: string } = {}) =>
    api.get<Paginated<Team>>("/teams", params),

  // Buscar time por slug
  getTeam: (slug: string) =>
    api.get<TeamWithMembers>(`/teams/${slug}`),

  // Criar time
  createTeam: (data: CreateTeamDto) =>
    api.post<Team>("/teams", data),

  // Atualizar time
  updateTeam: (id: string, data: UpdateTeamDto) =>
    api.patch<Team>(`/teams/${id}`, data),

  // Deletar time (admin)
  deleteTeam: (id: string) =>
    api.delete<void>(`/teams/${id}`),

  // Adicionar membro
  addMember: (teamId: string, data: AddMemberDto) =>
    api.post<void>(`/teams/${teamId}/members`, data),

  // Remover membro
  removeMember: (teamId: string, playerId: string) =>
    api.delete<void>(`/teams/${teamId}/members/${playerId}`),
};

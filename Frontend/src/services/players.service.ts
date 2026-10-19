import { api } from "@/lib/api-client";
import type { PlayerListItem, PlayerDetail } from "@/types/player";

export interface CreatePlayerPayload {
  username: string;
  email: string;
  password: string;
  displayName: string;
  standoffId?: string;
  bio?: string;
  country?: string;
}

export const playersService = {
  list: (params?: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) => api.get<{ data: PlayerListItem[]; total: number; page: number; totalPages: number }>(
    "/admin/players",
    params,
  ),

  detail: (userId: string) =>
    api.get<PlayerDetail>(`/admin/players/${userId}`),

  create: (payload: CreatePlayerPayload) =>
    api.post<PlayerListItem>("/admin/players", payload, true),

  transfer: (userId: string, toTeamId: string | null, force = false) =>
    api.post<{ message: string }>(`/admin/players/${userId}/transfer`, { toTeamId, force }, true),
};

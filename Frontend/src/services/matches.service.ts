import { api } from "@/lib/api-client";
import type { Paginated } from "@/types/common";
import type { Match } from "@/types/match";

export interface MatchWithDetails extends Match {
  maps?: Array<{
    id: string;
    mapName: string;
    order: number;
    scoreA: number | null;
    scoreB: number | null;
    winnerId: string | null;
    played: boolean;
  }>;
  disputes?: Array<{
    id: string;
    raisedById: string;
    reason: string;
    status: string;
    createdAt: Date;
  }>;
}

export const matchesService = {
  /** Próximas partidas (agendadas e ao vivo) */
  getUpcoming: (limit = 6) =>
    api.get<Paginated<Match>>("/matches", { limit, status: "SCHEDULED,LIVE" }),

  /** Partidas recentes (finalizadas) */
  getRecent: (limit = 6) =>
    api.get<Paginated<Match>>("/matches", { limit, status: "COMPLETED" }),

  /** Listar matches com filtros */
  getMatches: (params: {
    page?: number;
    limit?: number;
    tournamentId?: string;
    teamId?: string;
    status?: string;
  } = {}) =>
    api.get<Paginated<Match>>("/matches", params),

  /** Buscar match por ID com detalhes */
  getMatch: (id: string) =>
    api.get<MatchWithDetails>(`/matches/${id}`),

  /** Criar match (admin) */
  createMatch: (data: any) =>
    api.post<Match>("/matches", data),

  /** Atualizar match (admin) */
  updateMatch: (id: string, data: any) =>
    api.patch<Match>(`/matches/${id}`, data),

  /** Registrar resultado (admin) */
  submitResult: (id: string, data: any) =>
    api.post<Match>(`/matches/${id}/result`, data),
};

/** Próximas partidas (agendadas e ao vivo) para a homepage. */
export async function getUpcomingMatches(limit = 6): Promise<Paginated<Match>> {
  return matchesService.getUpcoming(limit);
}

/** Partidas recentes (finalizadas). */
export async function getRecentMatches(limit = 6): Promise<Paginated<Match>> {
  return matchesService.getRecent(limit);
}

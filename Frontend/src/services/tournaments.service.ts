import { api } from "@/lib/api-client";
import type { Paginated } from "@/types/common";
import type { TournamentListItem, Tournament } from "@/types/tournament";
import type { FeaturedTournament } from "@/types/domain";

export async function getFeaturedTournament(): Promise<FeaturedTournament | null> {
  try {
    // Backend não tem rota /featured, vamos pegar o primeiro torneio ativo
    const response = await api.get<Paginated<TournamentListItem>>("/tournaments", { 
      status: "IN_PROGRESS,REGISTRATION_OPEN", 
      limit: 1 
    });
    
    if (response.data && response.data.length > 0) {
      const tournament = response.data[0];
      // Converter para formato FeaturedTournament se necessário
      return tournament as any as FeaturedTournament;
    }
    return null;
  } catch (error) {
    console.error("Error fetching featured tournament:", error);
    return null;
  }
}

export async function getTournaments(
  query: { status?: string; search?: string; limit?: number; page?: number } = {},
): Promise<Paginated<TournamentListItem>> {
  return api.get<Paginated<TournamentListItem>>("/tournaments", { pageSize: 12, page: 1, ...query });
}

export async function getTournamentBySlug(slug: string): Promise<Tournament> {
  return api.get<Tournament>(`/tournaments/${slug}`);
}

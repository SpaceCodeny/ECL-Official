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
  const response = await api.get<Paginated<any>>("/tournaments", { pageSize: 12, page: 1, ...query });
  
  // Transformar _count.registrations em registeredTeams
  if (response.data) {
    response.data = response.data.map((tournament: any) => ({
      ...tournament,
      registeredTeams: tournament._count?.registrations ?? 0,
    }));
  }
  
  return response as Paginated<TournamentListItem>;
}

export async function getTournamentBySlug(slug: string): Promise<Tournament> {
  const tournament = await api.get<any>(`/tournaments/${slug}`);
  
  // Transformar _count.registrations em registeredTeams
  return {
    ...tournament,
    registeredTeams: tournament._count?.registrations ?? 0,
  } as Tournament;
}

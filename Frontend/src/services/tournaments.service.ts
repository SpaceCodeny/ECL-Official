import { api } from "@/lib/api-client";
import type { Paginated } from "@/types/common";
import type { TournamentListItem, Tournament } from "@/types/tournament";
import type { FeaturedTournament } from "@/types/domain";

export async function getFeaturedTournament(): Promise<FeaturedTournament | null> {
  return api.get<FeaturedTournament | null>("/tournaments/featured");
}

export async function getTournaments(
  query: { status?: string; search?: string; limit?: number; page?: number } = {},
): Promise<Paginated<TournamentListItem>> {
  return api.get<Paginated<TournamentListItem>>("/tournaments", { pageSize: 12, page: 1, ...query });
}

export async function getTournamentBySlug(slug: string): Promise<Tournament> {
  return api.get<Tournament>(`/tournaments/${slug}`);
}

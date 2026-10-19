import { api } from "@/lib/api-client";
import type { RankingEntry } from "@/types/domain";

/** Ranking de equipes para a homepage. */
export async function getTeamRanking(limit = 5): Promise<RankingEntry[]> {
  const response = await api.get<{ data: RankingEntry[]; season: string | null }>("/rankings", { limit });
  return response.data || [];
}

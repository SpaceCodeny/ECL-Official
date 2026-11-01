import { api } from "@/lib/api-client";
import type { RankingEntry } from "@/types/domain";

/** Ranking de equipes para a homepage. */
export async function getTeamRanking(limit?: number): Promise<RankingEntry[]> {
  const params = limit ? { limit } : {};
  const response = await api.get<{ data: RankingEntry[]; season: string | null }>("/rankings", params);
  return response.data || [];
}

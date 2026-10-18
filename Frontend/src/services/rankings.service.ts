import { api } from "@/lib/api-client";
import type { RankingEntry } from "@/types/domain";

/** Ranking de equipes para a homepage. */
export async function getTeamRanking(limit = 5): Promise<RankingEntry[]> {
  return api.get<RankingEntry[]>("/rankings/teams", { limit });
}

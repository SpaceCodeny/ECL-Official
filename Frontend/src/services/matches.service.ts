import { api } from "@/lib/api-client";
import type { Paginated } from "@/types/common";
import type { Match } from "@/types/match";

/** Próximas partidas (agendadas e ao vivo) para a homepage. */
export async function getUpcomingMatches(limit = 6): Promise<Paginated<Match>> {
  return api.get<Paginated<Match>>("/matches", { limit, status: "SCHEDULED,LIVE" });
}

/** Partidas recentes (finalizadas). */
export async function getRecentMatches(limit = 6): Promise<Paginated<Match>> {
  return api.get<Paginated<Match>>("/matches", { limit, status: "COMPLETED" });
}

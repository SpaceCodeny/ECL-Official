"use client";

import { useQuery } from "@tanstack/react-query";
import { getTournaments, getFeaturedTournament } from "@/services/tournaments.service";
import { getUpcomingMatches } from "@/services/matches.service";
import { getTeamRanking } from "@/services/rankings.service";
import { getAnnouncements } from "@/services/announcements.service";
import { getOrganizationStats } from "@/services/stats.service";

export const homeKeys = {
  featured: ["home", "featured-tournament"] as const,
  upcomingMatches: ["home", "upcoming-matches"] as const,
  tournaments: ["home", "tournaments"] as const,
  ranking: ["home", "ranking"] as const,
  announcements: ["home", "announcements"] as const,
  stats: ["home", "stats"] as const,
};

export function useFeaturedTournament() {
  return useQuery({ queryKey: homeKeys.featured, queryFn: getFeaturedTournament });
}

export function useUpcomingMatches(limit = 6) {
  return useQuery({ queryKey: homeKeys.upcomingMatches, queryFn: () => getUpcomingMatches(limit) });
}

export function useHomeTournaments() {
  return useQuery({ queryKey: homeKeys.tournaments, queryFn: () => getTournaments({ limit: 8 }) });
}

export function useTeamRanking(limit = 5) {
  return useQuery({ queryKey: homeKeys.ranking, queryFn: () => getTeamRanking(limit) });
}

export function useAnnouncements(limit = 3) {
  return useQuery({ queryKey: homeKeys.announcements, queryFn: () => getAnnouncements(limit) });
}

export function useOrganizationStats() {
  return useQuery({ queryKey: homeKeys.stats, queryFn: getOrganizationStats });
}

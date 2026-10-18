import { api } from "@/lib/api-client";
import type { Paginated } from "@/types/common";
import type { Announcement } from "@/types/domain";

/** Comunicados/notícias mais recentes. */
export async function getAnnouncements(limit = 3): Promise<Paginated<Announcement>> {
  return api.get<Paginated<Announcement>>("/announcements", { limit });
}

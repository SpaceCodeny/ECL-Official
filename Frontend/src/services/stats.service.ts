import { api } from "@/lib/api-client";
import type { OrganizationStats } from "@/types/domain";

/** Estatísticas gerais da organização (calculadas no backend). */
export async function getOrganizationStats(): Promise<OrganizationStats> {
  return api.get<OrganizationStats>("/stats/overview");
}

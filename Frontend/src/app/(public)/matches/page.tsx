import type { Metadata } from "next";
import { SectionHeader } from "@/components/ui/section-header";
import { matchesService } from "@/services/matches.service";
import { MatchesListClient } from "./matches-list-client";

export const metadata: Metadata = { title: "Partidas" };

export default async function MatchesPage() {
  // Carregar todas as partidas inicialmente
  const initialData = await matchesService.getMatches({ limit: 50 });

  // Transformar para o formato esperado pelo componente
  const formattedData = {
    data: initialData.data || [],
    pagination: {
      page: initialData.page || 1,
      limit: initialData.pageSize || 50,
      total: initialData.total || 0,
      pages: initialData.totalPages || 1,
    },
  };

  return (
    <div className="container-ecl py-8 sm:py-12">
      <SectionHeader title="Partidas" description="Partidas agendadas, ao vivo e finalizadas." />
      <MatchesListClient initialData={formattedData} />
    </div>
  );
}

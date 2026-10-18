"use client";

import { SectionHeader } from "@/components/ui/section-header";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoBadge } from "@/components/ui/demo-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useHomeTournaments } from "@/hooks/use-home";
import { hasNoData } from "@/lib/utils";
import { demoTournaments } from "@/lib/demo-data";
import { Trophy } from "lucide-react";
import type { TournamentListItem } from "@/types/tournament";

export function TournamentsSection() {
  const { data, isLoading, isError, refetch } = useHomeTournaments();

  const useDemo = !isLoading && !isError && hasNoData(data);
  const tournaments: TournamentListItem[] = useDemo ? demoTournaments : (data?.data ?? []);

  return (
    <section className="border-t border-border">
      <div className="container-ecl py-16">
        <div className="mb-6 flex items-end gap-4">
          <SectionHeader
            title="Campeonatos"
            description="Abertos, em andamento e encerrados"
            href="/tournaments"
          />
          {useDemo ? <DemoBadge /> : null}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : tournaments.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Nenhum campeonato"
            description="Os campeonatos criados aparecem aqui."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tournaments.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

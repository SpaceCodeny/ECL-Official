"use client";

import { SectionHeader } from "@/components/ui/section-header";
import { MatchCard } from "@/components/matches/match-card";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoBadge } from "@/components/ui/demo-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useUpcomingMatches } from "@/hooks/use-home";
import { hasNoData } from "@/lib/utils";
import { demoMatches } from "@/lib/demo-data";
import { CalendarDays } from "lucide-react";
import type { Match } from "@/types/match";

export function UpcomingMatchesSection() {
  const { data, isLoading, isError, refetch } = useUpcomingMatches();

  const useDemo = !isLoading && !isError && hasNoData(data);
  const matches: Match[] = useDemo ? demoMatches : (data?.data ?? []);

  return (
    <section className="border-t border-border">
      <div className="container-ecl py-12 sm:py-16">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-end gap-2 sm:gap-4">
          <SectionHeader
            title="Próximas Partidas"
            description="Ao vivo e agendadas"
            href="/matches"
          />
          {useDemo ? <DemoBadge /> : null}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 sm:h-40 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : matches.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nenhuma partida agendada"
            description="As próximas partidas aparecerão aqui quando forem criadas."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

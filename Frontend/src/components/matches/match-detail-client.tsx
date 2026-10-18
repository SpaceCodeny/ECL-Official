"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Map as MapIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { MatchStatusBadge } from "./match-status-badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { api } from "@/lib/api-client";
import { seriesFormatLabel } from "@/lib/labels";
import { formatDateTime, cn } from "@/lib/utils";
import type { Match } from "@/types/match";

interface MatchDetail {
  id: string;
  tournamentId: string;
  tournamentName: string;
  tournamentSlug: string;
  stage: string | { name: string; tournament: { id: string; name: string; slug: string } };
  round: string | null;
  teamA: { id: string; name: string; tag: string | null; logoUrl: string | null; score: number | null };
  teamB: { id: string; name: string; tag: string | null; logoUrl: string | null; score: number | null };
  scheduledAt: string | null;
  status: import("@/types/match").MatchStatus;
  seriesFormat: import("@/types/tournament").SeriesFormat;
  map: string | null;
  winnerTeamId: string | null;
  aggregateScoreA: number | null;
  aggregateScoreB: number | null;
  maps?: {
    id: string; mapName: string; order: number;
    scoreA: number | null; scoreB: number | null;
    winnerId: string | null; played: boolean;
  }[];
}

export function MatchDetailClient({ matchId }: { matchId: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => api.get<MatchDetail>(`/matches/${matchId}`),
  });

  if (isLoading) return <LoadingState label="Carregando partida…" className="min-h-[60vh]" />;
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} className="min-h-[60vh]" />;

  const match = data;
  const isCompleted = match.status === "COMPLETED";
  const winnerA = isCompleted && match.winnerTeamId === match.teamA.id;
  const winnerB = isCompleted && match.winnerTeamId === match.teamB.id;

  return (
    <div className="container-ecl py-10">
      <Link
        href={`/tournaments/${match.tournamentSlug}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-paper"
      >
        <ArrowLeft className="h-4 w-4" />
        {match.tournamentName}
      </Link>

      <div className="card-ecl p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="text-sm text-muted">
            {typeof match.stage === "string" ? match.stage : match.stage?.name ?? ""}
            {match.round ? ` · ${match.round}` : ""}
          </div>
          <MatchStatusBadge status={match.status} />
        </div>

        {/* Placar principal */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 flex-col items-center gap-3">
            <Avatar name={match.teamA.name} src={match.teamA.logoUrl} size="lg" />
            <p className={cn("font-display text-lg font-bold uppercase tracking-tight", winnerA ? "text-gold" : "text-paper")}>
              {match.teamA.name}
            </p>
            {match.teamA.tag && <p className="text-xs text-muted">{match.teamA.tag}</p>}
          </div>

          <div className="flex flex-col items-center gap-2">
            {isCompleted ? (
              <span className="font-display text-4xl font-bold text-paper">
                {match.aggregateScoreA ?? 0} : {match.aggregateScoreB ?? 0}
              </span>
            ) : (
              <span className="font-display text-xl uppercase tracking-widest text-muted">VS</span>
            )}
            <span className="rounded bg-surface px-2 py-0.5 text-xs uppercase tracking-wide text-muted">
              {seriesFormatLabel[match.seriesFormat]}
            </span>
          </div>

          <div className="flex flex-1 flex-col items-center gap-3">
            <Avatar name={match.teamB.name} src={match.teamB.logoUrl} size="lg" />
            <p className={cn("font-display text-lg font-bold uppercase tracking-tight", winnerB ? "text-gold" : "text-paper")}>
              {match.teamB.name}
            </p>
            {match.teamB.tag && <p className="text-xs text-muted">{match.teamB.tag}</p>}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted">
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gold/70" />
            {match.scheduledAt ? formatDateTime(match.scheduledAt) : "Horário a definir"}
          </span>
          {match.map && (
            <span className="flex items-center gap-2">
              <MapIcon className="h-4 w-4 text-gold/70" />
              {match.map}
            </span>
          )}
        </div>

        {/* Resultados por mapa */}
        {match.maps && match.maps.length > 0 && (
          <div className="mt-8 border-t border-border pt-6">
            <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-gold">
              Resultado por mapa
            </h3>
            <div className="space-y-2">
              {match.maps.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-md bg-ink/40 px-4 py-2.5 text-sm">
                  <span className="text-muted">Mapa {m.order}: {m.mapName}</span>
                  <span className="font-display font-bold text-paper">
                    {m.scoreA ?? 0} : {m.scoreB ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { MatchStatusBadge } from "./match-status-badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { api } from "@/lib/api-client";
import { seriesFormatLabel } from "@/lib/labels";
import { formatDateTime, cn } from "@/lib/utils";
import type { MatchStatus } from "@/types/match";
import type { SeriesFormat } from "@/types/tournament";

/** Interface fiel ao retorno do backend (findById). */
interface MatchDetail {
  id: string;
  tournamentId: string;
  round: string | null;
  scheduledAt: string | null;
  status: MatchStatus;
  seriesFormat: SeriesFormat;
  winnerTeamId: string | null;
  /** Placar agregado da série */
  scoreA: number | null;
  scoreB: number | null;
  notes: string | null;
  stage: {
    name: string;
    order: number;
    tournament: { id: string; name: string; slug: string };
  };
  group: { name: string } | null;
  teamA: { id: string; slug: string; name: string; tag: string | null; logoUrl: string | null };
  teamB: { id: string; slug: string; name: string; tag: string | null; logoUrl: string | null };
  winner: { id: string; name: string } | null;
  maps: {
    id: string;
    mapName: string;
    order: number;
    scoreA: number | null;
    scoreB: number | null;
    winnerId: string | null;
    played: boolean;
  }[];
}

export function MatchDetailClient({ matchId }: { matchId: string }) {
  const { data: match, isLoading, isError, refetch } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => api.get<MatchDetail>(`/matches/${matchId}`),
  });

  if (isLoading) return <LoadingState label="Carregando partida…" className="min-h-[60vh]" />;
  if (isError || !match) return <ErrorState onRetry={() => void refetch()} className="min-h-[60vh]" />;

  const isCompleted = match.status === "COMPLETED";
  const winnerA = isCompleted && match.winnerTeamId === match.teamA.id;
  const winnerB = isCompleted && match.winnerTeamId === match.teamB.id;

  const tournamentSlug = match.stage.tournament.slug;
  const tournamentName = match.stage.tournament.name;
  const stageName = match.stage.name;

  return (
    <div className="container-ecl py-10">
      <Link
        href={`/tournaments/${tournamentSlug}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-paper"
      >
        <ArrowLeft className="h-4 w-4" />
        {tournamentName}
      </Link>

      <div className="card-ecl p-6 sm:p-8">
        {/* Cabeçalho: fase + status */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="text-sm text-muted">
            {stageName}
            {match.group ? ` · ${match.group.name}` : ""}
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
                {match.scoreA ?? 0} : {match.scoreB ?? 0}
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

        {/* Data e observações */}
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted">
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gold/70" />
            {match.scheduledAt ? formatDateTime(match.scheduledAt) : "Horário a definir"}
          </span>
          {match.notes && (
            <span className="text-muted/70">{match.notes}</span>
          )}
        </div>

        {/* Resultado por mapa */}
        {match.maps.length > 0 && (
          <div className="mt-8 border-t border-border pt-6">
            <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-gold">
              Resultado por mapa
            </h3>
            <div className="space-y-2">
              {match.maps.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-md bg-ink/40 px-4 py-2.5 text-sm">
                  <span className="text-muted">
                    {m.order}. {m.mapName}
                  </span>
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

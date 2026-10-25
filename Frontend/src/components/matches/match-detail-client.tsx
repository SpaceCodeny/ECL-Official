"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { MatchStatusBadge } from "./match-status-badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { MapPool } from "./map-pool";
import { api } from "@/lib/api-client";
import { seriesFormatLabel } from "@/lib/labels";
import { formatDateTime, cn } from "@/lib/utils";
import type { MatchStatus } from "@/types/match";
import type { SeriesFormat } from "@/types/tournament";

interface MatchDetail {
  id: string;
  tournamentId: string;
  round: string | null;
  scheduledAt: string | null;
  status: MatchStatus;
  seriesFormat: SeriesFormat;
  winnerTeamId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  notes: string | null;
  stage: {
    name: string;
    order: number;
    tournament?: { id: string; name: string; slug: string };
  };
  group: { name: string } | null;
  teamA: { id: string; slug: string; name: string; tag: string | null; logoUrl: string | null };
  teamB: { id: string; slug: string; name: string; tag: string | null; logoUrl: string | null };
  winner: { id: string; name: string } | null;
  maps: {
    id: string;
    mapName: string;
    order: number;
    action?: string | null;
    actionTeamId?: string | null;
    scoreA: number | null;
    scoreB: number | null;
    winnerId: string | null;
    played: boolean;
  }[];
}

export function MatchDetailClient({ matchId }: { matchId: string }) {
  const isLiveStatus = (status: string) =>
    status === "LIVE" || status === "AWAITING_RESULT";

  const { data: match, isLoading, isError, refetch } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => api.get<MatchDetail>(`/matches/${matchId}`),
    // Polling a cada 10s quando ao vivo para atualizar placar automaticamente
    refetchInterval: (query) => {
      const data = query.state.data;
      return data && isLiveStatus(data.status) ? 10_000 : false;
    },
    refetchIntervalInBackground: false,
  });

  if (isLoading) return <LoadingState label="Carregando partida…" className="min-h-[60vh]" />;
  if (isError || !match) return <ErrorState onRetry={() => void refetch()} className="min-h-[60vh]" />;

  const isCompleted = match.status === "COMPLETED";
  const isLive = isLiveStatus(match.status);
  const winnerA = isCompleted && match.winnerTeamId === match.teamA.id;
  const winnerB = isCompleted && match.winnerTeamId === match.teamB.id;

  const tournamentSlug = match.stage?.tournament?.slug ?? "";
  const tournamentName = match.stage?.tournament?.name ?? "Torneio";
  const stageName = match.stage?.name ?? "";

  return (
    <div className="container-ecl py-6 sm:py-10">
      <Link
        href={`/tournaments/${tournamentSlug}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-paper"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="truncate">{tournamentName}</span>
      </Link>

      <div className="card-ecl overflow-hidden">
        {/* ── Cabeçalho: fase + status ────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 border-b border-border bg-ink/40 px-4 py-3 sm:px-6">
          <div className="min-w-0 text-xs text-muted sm:text-sm">
            <span className="block truncate">
              {stageName}
              {match.group ? ` · ${match.group.name}` : ""}
              {match.round ? ` · ${match.round}` : ""}
            </span>
          </div>
          <div className="shrink-0">
            {isLive ? (
              <span className="flex items-center gap-1.5 rounded bg-red-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                AO VIVO
              </span>
            ) : (
              <MatchStatusBadge status={match.status} />
            )}
          </div>
        </div>

        {/* ── Placar principal ────────────────────────────────────── */}
        <div className="px-4 py-6 sm:px-8 sm:py-8">
          <div className="flex items-center justify-between gap-2 sm:gap-6">
            {/* Time A */}
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:gap-3">
              <Avatar
                name={match.teamA.name}
                src={match.teamA.logoUrl}
                size="lg"
                className="h-14 w-14 shrink-0 sm:h-20 sm:w-20"
              />
              <div className="w-full text-center">
                <p className={cn(
                  "font-display text-sm font-bold uppercase leading-tight tracking-tight sm:text-lg",
                  winnerA ? "text-gold" : "text-paper",
                )}>
                  <span className="block break-words hyphens-auto">{match.teamA.name}</span>
                </p>
                {match.teamA.tag && (
                  <p className="mt-0.5 text-[10px] text-muted sm:text-xs">{match.teamA.tag}</p>
                )}
              </div>
            </div>

            {/* Placar central */}
            <div className="flex shrink-0 flex-col items-center gap-1 px-1 sm:px-4">
              {/* Mostra placar quando: completed OU live com placar definido */}
              {(isCompleted || (isLive && match.scoreA !== null && match.scoreB !== null)) ? (
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className={cn(
                    "font-display font-bold tabular-nums",
                    isLive ? "text-2xl sm:text-3xl" : "text-3xl sm:text-5xl",
                    match.scoreA !== null && match.scoreB !== null && match.scoreA > match.scoreB
                      ? "text-emerald-400"
                      : "text-red-400",
                  )}>
                    {match.scoreA ?? 0}
                  </span>
                  <span className={cn(
                    "font-display font-bold",
                    isLive ? "text-2xl text-red-300/50 sm:text-3xl" : "text-3xl text-muted sm:text-5xl",
                  )}>:</span>
                  <span className={cn(
                    "font-display font-bold tabular-nums",
                    isLive ? "text-2xl sm:text-3xl" : "text-3xl sm:text-5xl",
                    match.scoreA !== null && match.scoreB !== null && match.scoreB > match.scoreA
                      ? "text-emerald-400"
                      : "text-red-400",
                  )}>
                    {match.scoreB ?? 0}
                  </span>
                </div>
              ) : isLive ? (
                <span className="font-display text-xl font-bold uppercase tracking-widest text-red-400 sm:text-2xl">
                  AO VIVO
                </span>
              ) : (
                <span className="font-display text-lg font-bold uppercase tracking-widest text-muted sm:text-2xl">
                  VS
                </span>
              )}
              <span className="rounded bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted sm:text-xs">
                {seriesFormatLabel[match.seriesFormat]}
              </span>
            </div>

            {/* Time B */}
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:gap-3">
              <Avatar
                name={match.teamB.name}
                src={match.teamB.logoUrl}
                size="lg"
                className="h-14 w-14 shrink-0 sm:h-20 sm:w-20"
              />
              <div className="w-full text-center">
                <p className={cn(
                  "font-display text-sm font-bold uppercase leading-tight tracking-tight sm:text-lg",
                  winnerB ? "text-gold" : "text-paper",
                )}>
                  <span className="block break-words hyphens-auto">{match.teamB.name}</span>
                </p>
                {match.teamB.tag && (
                  <p className="mt-0.5 text-[10px] text-muted sm:text-xs">{match.teamB.tag}</p>
                )}
              </div>
            </div>
          </div>

          {/* Data e observações */}
          <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs text-muted sm:gap-4 sm:text-sm">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-gold/70" />
              {match.scheduledAt ? formatDateTime(match.scheduledAt) : "Horário a definir"}
            </span>
            {match.notes && <span className="text-muted/70">{match.notes}</span>}
          </div>
        </div>

        {/* ── Resultado por Mapa (rounds) ──────────────────────────── */}
        {match.maps.some((m) => m.played && m.scoreA !== null && m.scoreB !== null) && (
          <div className="border-t border-border px-4 py-5 sm:px-6">
            <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-paper sm:text-base">
              Resultado por Mapa
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {match.maps
                .filter((m) => m.played && m.scoreA !== null && m.scoreB !== null)
                .sort((a, b) => a.order - b.order)
                .map((m, idx) => (
                  <div
                    key={m.id}
                    className="rounded-lg border border-border/60 bg-ink/30 p-3 transition-colors hover:border-border"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/images/maps/${m.mapName.toLowerCase().replace("prison", "prision")}.png`}
                        alt={m.mapName}
                        className="h-8 w-12 rounded object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-xs font-bold uppercase text-paper">
                          {m.mapName}
                        </p>
                        <p className="text-[10px] text-muted">Mapa {idx + 1}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className={cn(
                          "font-display text-xl font-bold tabular-nums",
                          m.scoreA! > m.scoreB! ? "text-emerald-400" : "text-red-400",
                        )}
                      >
                        {m.scoreA}
                      </span>
                      <span className="font-display text-lg text-muted">:</span>
                      <span
                        className={cn(
                          "font-display text-xl font-bold tabular-nums",
                          m.scoreB! > m.scoreA! ? "text-emerald-400" : "text-red-400",
                        )}
                      >
                        {m.scoreB}
                      </span>
                    </div>
                    <p className="mt-1 text-center text-[10px] text-muted">
                      {m.winnerId === match.teamA.id ? match.teamA.name : match.teamB.name}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── Map Pool ────────────────────────────────────────────── */}
        <div className="border-t border-border px-4 py-5 sm:px-6">
          <MapPool
            maps={match.maps}
            seriesFormat={match.seriesFormat}
            matchStatus={match.status}
            teamAId={match.teamA.id}
            teamBId={match.teamB.id}
            teamAName={match.teamA.name}
            teamBName={match.teamB.name}
            currentScoreA={match.scoreA}
            currentScoreB={match.scoreB}
          />
        </div>
      </div>
    </div>
  );
}

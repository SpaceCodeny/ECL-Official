"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Radio, CalendarDays, ChevronRight } from "lucide-react";
import { useUpcomingMatches } from "@/hooks/use-home";
import { Avatar } from "@/components/ui/avatar";
import { hasNoData, formatDateTime, cn } from "@/lib/utils";
import { demoMatches } from "@/lib/demo-data";
import type { Match } from "@/types/match";

// ─── Ordenação: LIVE primeiro, depois por data crescente ─────────────────────

function sortMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const aLive = a.status === "LIVE" ? 0 : 1;
    const bLive = b.status === "LIVE" ? 0 : 1;
    if (aLive !== bLive) return aLive - bLive;
    const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity;
    const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity;
    return aTime - bTime;
  });
}

// ─── Card compacto de cada partida no ticker ──────────────────────────────────

function TickerCard({ match }: { match: Match }) {
  const isLive = match.status === "LIVE";
  const hasScore = (match.scoreA ?? null) !== null && (match.scoreB ?? null) !== null;

  const stageName =
    typeof match.stage === "string"
      ? match.stage
      : (match.stage as { name?: string })?.name ?? "";

  const tournamentName =
    typeof match.stage === "object" && match.stage !== null
      ? (match.stage as { tournament?: { name: string } }).tournament?.name ?? ""
      : "";

  return (
    <Link
      href={`/matches/${match.id}`}
      className={cn(
        "group relative mx-2 flex shrink-0 items-center gap-3 rounded-xl border px-4 py-3 transition-all hover:border-gold/50 hover:shadow-md hover:shadow-gold/5",
        isLive
          ? "border-red-500/40 bg-red-500/5"
          : "border-border bg-surface/60",
      )}
      style={{ minWidth: "280px", maxWidth: "320px" }}
    >
      {/* Badge AO VIVO */}
      {isLive && (
        <span className="absolute -top-2 left-3 flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
          <Radio className="h-2.5 w-2.5 animate-pulse" />
          Ao Vivo
        </span>
      )}

      {/* Equipe A */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Avatar name={match.teamA.name} src={match.teamA.logoUrl} size="sm" className="h-8 w-8 shrink-0" />
        <span className={cn(
          "truncate font-display text-xs font-bold uppercase tracking-tight",
          hasScore && (match.scoreA ?? 0) > (match.scoreB ?? 0) ? "text-gold" : "text-paper",
        )}>
          {match.teamA.name}
        </span>
      </div>

      {/* Placar ou VS */}
      <div className="flex shrink-0 flex-col items-center">
        {hasScore ? (
          <span className="font-display text-base font-bold text-paper">
            {match.scoreA} <span className="text-muted">·</span> {match.scoreB}
          </span>
        ) : (
          <span className="font-display text-xs font-bold uppercase tracking-widest text-muted/60">VS</span>
        )}
        <span className="text-[9px] uppercase tracking-widest text-muted/50">{match.seriesFormat}</span>
      </div>

      {/* Equipe B */}
      <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-2">
        <Avatar name={match.teamB.name} src={match.teamB.logoUrl} size="sm" className="h-8 w-8 shrink-0" />
        <span className={cn(
          "truncate text-right font-display text-xs font-bold uppercase tracking-tight",
          hasScore && (match.scoreB ?? 0) > (match.scoreA ?? 0) ? "text-gold" : "text-paper",
        )}>
          {match.teamB.name}
        </span>
      </div>

      {/* Data */}
      {!isLive && match.scheduledAt && (
        <span className="absolute bottom-1.5 right-3 flex items-center gap-1 text-[9px] text-muted/60">
          <CalendarDays className="h-2.5 w-2.5" />
          {formatDateTime(match.scheduledAt)}
        </span>
      )}

      {/* Hover arrow */}
      <ChevronRight className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted/20 transition-all group-hover:text-gold/60" aria-hidden />
    </Link>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function MatchesTicker() {
  const { data, isLoading } = useUpcomingMatches(20);

  const useDemo = !isLoading && hasNoData(data);
  const raw: Match[] = useDemo ? demoMatches : (data?.data ?? []);
  const matches = sortMatches(raw.filter((m) => m.status === "LIVE" || m.status === "SCHEDULED" || m.status === "READY"));

  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const posRef = useRef(0);

  // Velocidade em px/frame (aprox 60fps → ~0.5px/frame = 30px/s)
  const SPEED = 0.6;

  useEffect(() => {
    const track = trackRef.current;
    if (!track || matches.length === 0) return;

    function tick() {
      if (!track) return;
      if (!paused) {
        posRef.current += SPEED;
        const half = track.scrollWidth / 2;
        if (posRef.current >= half) posRef.current = 0;
        track.style.transform = `translateX(-${posRef.current}px)`;
      }
      animFrameRef.current = requestAnimationFrame(tick);
    }

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, [paused, matches.length]);

  if (isLoading) {
    return (
      <div className="flex h-16 items-center border-b border-border bg-navy/60">
        <div className="flex gap-3 px-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-11 w-72 animate-pulse rounded-xl bg-surfaceHover" />
          ))}
        </div>
      </div>
    );
  }

  if (matches.length === 0) return null;

  // Duplica os itens para criar o efeito infinito contínuo
  const doubled = [...matches, ...matches];

  return (
    <div
      className="relative overflow-hidden border-b border-border bg-navy/60 backdrop-blur-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      aria-label="Partidas ao vivo e próximas"
    >
      {/* Fade lateral esquerdo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-navy/60 to-transparent"
      />
      {/* Fade lateral direito */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-navy/60 to-transparent"
      />

      {/* Label fixo à esquerda */}
      <div className="absolute inset-y-0 left-0 z-20 flex items-center">
        <span className="flex items-center gap-1.5 bg-navy/60 pl-4 pr-3 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-gold/80">
          <Radio className="h-3 w-3" />
          Partidas
        </span>
      </div>

      {/* Track rolante */}
      <div className="py-2.5 pl-28">
        <div
          ref={trackRef}
          className="flex will-change-transform"
          style={{ width: "max-content" }}
        >
          {doubled.map((match, i) => (
            <TickerCard key={`${match.id}-${i}`} match={match} />
          ))}
        </div>
      </div>
    </div>
  );
}

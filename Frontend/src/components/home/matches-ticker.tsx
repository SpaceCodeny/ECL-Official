"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Radio, CalendarDays } from "lucide-react";
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

  return (
    <Link
      href={`/matches/${match.id}`}
      className={cn(
        "group relative mx-1.5 flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 transition-all",
        isLive
          ? "border-2 border-red-500/60 bg-red-500/10 shadow-lg shadow-red-500/20 hover:border-red-500/80"
          : "border-2 border-gold/40 bg-white/5 shadow-md shadow-gold/10 hover:border-gold/60 hover:shadow-gold/20",
      )}
      style={{ minWidth: "260px", maxWidth: "300px" }}
    >
      {/* Equipe A */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Avatar name={match.teamA.name} src={match.teamA.logoUrl} size="sm" className="h-7 w-7 shrink-0" />
        <span className="truncate font-display text-[11px] font-bold uppercase tracking-tight text-paper">
          {match.teamA.name}
        </span>
      </div>

      {/* Meio: placar ou VS + formato */}
      <div className="flex shrink-0 flex-col items-center gap-0.5">
        {hasScore ? (
          <span className="font-display text-sm font-bold text-paper">
            {match.scoreA} <span className="text-white/30">·</span> {match.scoreB}
          </span>
        ) : (
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-white/40">VS</span>
        )}
        <span className="rounded bg-white/10 px-1 py-px text-[9px] font-medium uppercase tracking-wide text-white/50">
          {match.seriesFormat}
        </span>
      </div>

      {/* Equipe B */}
      <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-2">
        <Avatar name={match.teamB.name} src={match.teamB.logoUrl} size="sm" className="h-7 w-7 shrink-0" />
        <span className="truncate text-right font-display text-[11px] font-bold uppercase tracking-tight text-paper">
          {match.teamB.name}
        </span>
      </div>

      {/* Badge AO VIVO ou data */}
      {isLive ? (
        <span className="ml-1 flex shrink-0 items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          AO VIVO
        </span>
      ) : match.scheduledAt ? (
        <span className="ml-1 flex shrink-0 flex-col items-end text-[9px] leading-tight text-white/40">
          <CalendarDays className="mb-0.5 h-3 w-3" />
          {formatDateTime(match.scheduledAt)}
        </span>
      ) : null}
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
      className="relative overflow-hidden border-b border-white/10 bg-black/60 backdrop-blur-md"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      aria-label="Partidas ao vivo e próximas"
    >
      {/* Fade lateral esquerdo */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-black/80 to-transparent" />
      {/* Fade lateral direito */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-black/80 to-transparent" />

      {/* Label "PARTIDAS" fixo à esquerda com fundo sólido */}
      <div className="absolute inset-y-0 left-0 z-20 flex items-center bg-black/60 backdrop-blur-md pr-4">
        <span className="flex items-center gap-1.5 pl-4 pr-3 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-gold/90">
          <Radio className="h-3 w-3 text-gold" />
          Partidas
        </span>
      </div>

      {/* Track rolante */}
      <div className="py-2 pl-28">
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

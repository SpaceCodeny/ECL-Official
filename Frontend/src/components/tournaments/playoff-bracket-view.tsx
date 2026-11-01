"use client";

import Link from "next/link";
import { Trophy, Star, Crown, GitBranch, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface PlayoffTeam {
  id: string;
  name: string;
  tag: string | null;
  logoUrl: string | null;
  slug: string;
}

export interface PlayoffMatch {
  id: string;
  bracketPosition: string;
  status: string;
  seriesFormat: string;
  scoreA: number | null;
  scoreB: number | null;
  winnerTeamId: string | null;
  teamA: PlayoffTeam | null;
  teamB: PlayoffTeam | null;
  teamALabel: string | null;
  teamBLabel: string | null;
  isInvitedA: boolean;
  isInvitedB: boolean;
  scheduledAt: string | null;
}

export interface PlayoffBracketData {
  isGenerated: boolean;
  swissFinalized: boolean;
  invitedTeams: Array<{ id: string; bracketSlot: number; team: PlayoffTeam }>;
  ro16: PlayoffMatch[];
  qf: PlayoffMatch[];
  sf: PlayoffMatch[];
  final: PlayoffMatch[];
}

// ── Utilitários ────────────────────────────────────────────────────────────────

function formatSeries(fmt: string) {
  if (fmt === "BO1") return "MD1";
  if (fmt === "BO3") return "MD3";
  if (fmt === "BO5") return "MD5";
  return fmt;
}

// ── TeamSlot — um lado do confronto ───────────────────────────────────────────

function TeamSlot({
  team,
  label,
  score,
  isWinner,
  isInvited,
  flip,
}: {
  team: PlayoffTeam | null;
  label: string | null;
  score: number | null;
  isWinner: boolean;
  isInvited: boolean;
  flip?: boolean;
}) {
  const isPlaceholder = !team;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 transition-colors",
        isWinner && "bg-gold/10",
        flip && "flex-row-reverse",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "h-6 w-6 shrink-0 rounded-full border overflow-hidden flex items-center justify-center",
          isPlaceholder
            ? "border-dashed border-border/40 bg-transparent"
            : isInvited
            ? "border-[#b8973a]/60 bg-[#1a1200]"
            : "border-border/60 bg-surface",
        )}
      >
        {team?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logoUrl} alt={team.name} className="h-full w-full object-contain p-0.5" />
        ) : team ? (
          <span className="text-[9px] font-bold text-muted">
            {team.name.slice(0, 2).toUpperCase()}
          </span>
        ) : null}
      </div>

      {/* Nome ou placeholder */}
      <span
        className={cn(
          "flex-1 truncate text-[11px] font-semibold",
          isPlaceholder
            ? "italic text-muted/40"
            : isWinner
            ? "text-gold"
            : "text-paper/90",
          flip && "text-right",
        )}
      >
        {isPlaceholder ? (label ?? "A definir") : (team.tag || team.name)}
      </span>

      {/* Badge convidado */}
      {isInvited && !isPlaceholder && (
        <Star className="h-2.5 w-2.5 shrink-0 fill-gold text-gold" />
      )}

      {/* Score */}
      {score !== null && (
        <span
          className={cn(
            "shrink-0 min-w-[1.25rem] text-center font-display text-sm font-bold",
            isWinner ? "text-gold" : "text-muted",
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}

// ── MatchCard — card individual de um confronto ────────────────────────────────

function MatchCard({ match, compact = false }: { match: PlayoffMatch; compact?: boolean }) {
  const isCompleted = match.status === "COMPLETED";
  const isLive = match.status === "LIVE" || match.status === "AWAITING_RESULT";
  const hasScore = match.scoreA !== null && match.scoreB !== null;
  const winnerA = isCompleted && match.winnerTeamId === match.teamA?.id;
  const winnerB = isCompleted && match.winnerTeamId === match.teamB?.id;
  const isVirtual = match.id.startsWith("virtual-");

  const inner = (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-surface shadow-sm transition-all",
        compact ? "w-44" : "w-52",
        isLive
          ? "border-red-500/50 shadow-red-500/10"
          : "border-border",
        !isVirtual && "hover:border-gold/40 hover:shadow-gold/10",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 bg-ink/50 px-2.5 py-1">
        <span
          className={cn(
            "text-[9px] font-bold uppercase tracking-widest",
            isLive ? "text-red-400" : isCompleted ? "text-emerald-400/70" : "text-muted/50",
          )}
        >
          {isLive ? "● Ao Vivo" : isCompleted ? "Finalizado" : "Aguardando"}
        </span>
        <span className="text-[9px] text-muted/40">{formatSeries(match.seriesFormat)}</span>
      </div>

      {/* Time A */}
      <TeamSlot
        team={match.teamA}
        label={match.teamALabel}
        score={hasScore ? match.scoreA : null}
        isWinner={winnerA}
        isInvited={match.isInvitedA}
      />

      {/* Separador */}
      <div className="h-px bg-border/40" />

      {/* Time B */}
      <TeamSlot
        team={match.teamB}
        label={match.teamBLabel}
        score={hasScore ? match.scoreB : null}
        isWinner={winnerB}
        isInvited={match.isInvitedB}
      />
    </div>
  );

  if (isVirtual || (!match.teamA && !match.teamB)) return <div>{inner}</div>;

  return (
    <Link href={`/matches/${match.id}`} className="block">
      {inner}
    </Link>
  );
}

// ── Conectores SVG entre fases ─────────────────────────────────────────────────

const CARD_W = 208; // w-52
const CARD_H = 82;  // header(26) + row(28) + divider(1) + row(28) = ~83px
const COL_GAP = 48;

function computeLayout(counts: number[]) {
  const BASE_VERTICAL = CARD_H + 20;
  const firstPositions: number[] = [];
  for (let i = 0; i < counts[0]!; i++) {
    firstPositions.push(i * BASE_VERTICAL + CARD_H / 2);
  }

  const positions: number[][] = [firstPositions];
  for (let si = 1; si < counts.length; si++) {
    const prev = positions[si - 1]!;
    const cur: number[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      const a = prev[i]!;
      const b = prev[i + 1] ?? a;
      cur.push((a + b) / 2);
    }
    positions.push(cur);
  }

  const allY = positions.flat();
  const totalHeight = Math.max(...allY) + CARD_H / 2 + 16;
  const colX = counts.map((_, si) => si * (CARD_W + COL_GAP));

  return { positions, totalHeight, colX };
}

// ── Rótulos das fases ──────────────────────────────────────────────────────────

const PHASE_LABELS = [
  "Oitavas de Final",
  "Quartas de Final",
  "Semifinais",
  "Grande Final",
];

// ── Componente principal ───────────────────────────────────────────────────────

export function PlayoffBracketView({ data }: { data: PlayoffBracketData }) {
  // Fases em ordem: RO16 (8 partidas), QF (4), SF (2), FINAL (1)
  const phases = [data.ro16, data.qf, data.sf, data.final];
  const counts = phases.map((p) => p.length);

  const { positions, totalHeight, colX } = computeLayout(counts);
  const totalWidth = (colX[colX.length - 1] ?? 0) + CARD_W;

  // Linhas de conexão
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let si = 0; si < phases.length - 1; si++) {
    const curPos = positions[si]!;
    const nextPos = positions[si + 1]!;
    const xRight = colX[si]! + CARD_W;
    const xLeft = colX[si + 1]!;
    const xMid = xRight + COL_GAP / 2;

    for (let i = 0; i < curPos.length; i += 2) {
      const yTop = curPos[i]!;
      const yBot = curPos[i + 1] ?? yTop;
      const yNext = nextPos[Math.floor(i / 2)]!;

      if (curPos[i + 1] !== undefined) {
        lines.push({ x1: xRight, y1: yTop, x2: xMid, y2: yTop });
        lines.push({ x1: xRight, y1: yBot, x2: xMid, y2: yBot });
        lines.push({ x1: xMid, y1: yTop, x2: xMid, y2: yBot });
        lines.push({ x1: xMid, y1: yNext, x2: xLeft, y2: yNext });
      } else {
        lines.push({ x1: xRight, y1: yTop, x2: xLeft, y2: yTop });
      }
    }
  }

  return (
    <div className="space-y-8">
      {/* Status do bracket */}
      <div className="flex flex-wrap items-center gap-3">
        {data.swissFinalized ? (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <Crown className="h-3 w-3" />
            Swiss finalizado — Times definidos
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border border-[#1a3a6e] bg-[#0d1e3d]/60 px-3 py-1 text-xs font-semibold text-[#4d7ecf]">
            <Shield className="h-3 w-3" />
            Swiss em andamento — Posições parciais
          </span>
        )}
        {data.isGenerated && (
          <span className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
            <GitBranch className="h-3 w-3" />
            Partidas confirmadas
          </span>
        )}
        <span className="ml-auto rounded-full border border-[#b8973a] bg-[#2a1f06]/60 px-3 py-1 text-xs font-semibold text-gold">
          <Star className="inline h-3 w-3 fill-gold mr-1" />
          {data.invitedTeams.length} convidados
        </span>
      </div>

      {/* Bracket SVG */}
      <div className="overflow-x-auto pb-4 -mx-4 sm:mx-0">
        <div className="min-w-fit px-4 sm:px-0">
          <div className="relative" style={{ width: totalWidth, height: totalHeight }}>
            {/* Linhas de conexão */}
            <svg
              className="pointer-events-none absolute inset-0"
              width={totalWidth}
              height={totalHeight}
              aria-hidden
            >
              {lines.map((l, i) => (
                <line
                  key={i}
                  x1={l.x1} y1={l.y1}
                  x2={l.x2} y2={l.y2}
                  stroke="rgba(212,175,55,0.2)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              ))}
            </svg>

            {/* Cards de cada fase */}
            {phases.map((phase, si) =>
              phase.map((match, mi) => {
                const cy = positions[si]?.[mi] ?? 0;
                const top = cy - CARD_H / 2;
                return (
                  <div
                    key={match.id}
                    className="absolute"
                    style={{ left: colX[si], top, width: CARD_W }}
                  >
                    <MatchCard match={match} />
                  </div>
                );
              })
            )}
          </div>

          {/* Labels das fases */}
          <div className="mt-5 flex" style={{ width: totalWidth }}>
            {phases.map((_, si) => (
              <div
                key={si}
                className="text-center text-[10px] font-bold uppercase tracking-widest text-muted/50"
                style={{ width: CARD_W + (si < phases.length - 1 ? COL_GAP : 0) }}
              >
                {PHASE_LABELS[si]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 pt-2 border-t border-border/30 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <Star className="h-3 w-3 fill-gold text-gold" />
          Equipe convidada (classificação direta)
        </span>
        <span className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full border border-dashed border-border/60" />
          Vaga a preencher
        </span>
      </div>
    </div>
  );
}

// ── Painel admin de convidados (dentro da aba Playoffs) ────────────────────────

export function InvitedTeamsPanel({
  invitedTeams,
  tournamentId,
  isAdmin,
  onUpdate,
}: {
  invitedTeams: PlayoffBracketData["invitedTeams"];
  tournamentId: string;
  isAdmin: boolean;
  onUpdate?: () => void;
}) {
  const slotLabels = ["Chave A", "Chave B", "Chave C", "Chave D"];
  const slots = [1, 2, 3, 4];

  return (
    <div className="rounded-xl border border-[#b8973a]/30 bg-gradient-to-b from-[#2a1f06]/40 to-transparent p-5">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-gold" />
        <h3 className="font-display text-sm font-bold uppercase tracking-widest text-gold">
          Times Convidados — Classificação Direta
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {slots.map((slot) => {
          const entry = invitedTeams.find((i) => i.bracketSlot === slot);
          return (
            <div
              key={slot}
              className={cn(
                "rounded-xl border p-3 text-center",
                entry
                  ? "border-[#b8973a]/50 bg-[#1a1200]/60"
                  : "border-dashed border-border/40 bg-surface/20",
              )}
            >
              <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-gold/50">
                {slotLabels[slot - 1]}
              </p>
              {entry ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-10 w-10 overflow-hidden rounded-full border border-[#b8973a]/60 bg-[#1a1200]">
                    {entry.team.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.team.logoUrl}
                        alt={entry.team.name}
                        className="h-full w-full object-contain p-0.5"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-gold">
                        {entry.team.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-tight text-paper line-clamp-2">
                    {entry.team.name}
                  </p>
                  {entry.team.tag && (
                    <p className="text-[9px] text-gold/50 uppercase">{entry.team.tag}</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-1">
                  <div className="h-10 w-10 rounded-full border-2 border-dashed border-border/30" />
                  <p className="text-[11px] italic text-muted/40">Vaga aberta</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

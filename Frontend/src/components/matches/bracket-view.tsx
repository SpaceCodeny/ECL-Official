"use client";

import Link from "next/link";
import { GitBranch, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { BracketStageData } from "@/components/tournaments/tournament-detail-client";

// ─── Tabela de Fase de Grupos ──────────────────────────────────────────────────

function GroupStandingsTable({ group }: { group: { id: string; name: string; standings: { team: { id: string; name: string; slug: string; logoUrl: string | null; tag: string | null }; played: number; wins: number; losses: number; mapsWon: number; mapsLost: number; points: number }[] } }) {
  return (
    <div className="card-ecl overflow-hidden">
      <div className="border-b border-border bg-gold/5 px-4 py-2.5">
        <h3 className="font-display text-sm font-bold uppercase tracking-widest text-gold">
          {group.name}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted sm:text-xs">
              <th className="py-2.5 pl-3 text-left w-7">#</th>
              <th className="py-2.5 pl-2 text-left">Equipe</th>
              <th className="py-2.5 px-2 text-center">J</th>
              <th className="py-2.5 px-2 text-center">V</th>
              <th className="py-2.5 px-2 text-center">D</th>
              <th className="hidden py-2.5 px-2 text-center sm:table-cell">Maps</th>
              <th className="py-2.5 pr-3 text-right font-bold text-gold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {group.standings.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-xs text-muted">
                  Nenhum dado de classificação ainda.
                </td>
              </tr>
            ) : group.standings.map((row, i) => (
              <tr
                key={row.team.id}
                className={cn(
                  "border-b border-border/50 last:border-0 transition-colors hover:bg-surfaceHover",
                  i < 2 && "bg-gold/5",
                )}
              >
                <td className="py-2.5 pl-3 font-display text-xs font-bold text-muted">{i + 1}</td>
                <td className="py-2.5 pl-2">
                  <Link href={`/teams/${row.team.slug}`} className="flex items-center gap-2 hover:text-gold">
                    <Avatar name={row.team.name} src={row.team.logoUrl} size="sm" className="h-6 w-6 text-[9px]" />
                    <span className="font-display font-semibold uppercase tracking-tight truncate max-w-[100px] sm:max-w-none">{row.team.name}</span>
                    {i < 2 && <span className="hidden rounded bg-gold/20 px-1 py-px text-[9px] font-bold text-gold sm:inline">CLASSIF.</span>}
                  </Link>
                </td>
                <td className="py-2.5 px-2 text-center text-muted">{row.played}</td>
                <td className="py-2.5 px-2 text-center text-emerald-400">{row.wins}</td>
                <td className="py-2.5 px-2 text-center text-red-400">{row.losses}</td>
                <td className="hidden py-2.5 px-2 text-center text-muted sm:table-cell">{row.mapsWon}/{row.mapsLost}</td>
                <td className="py-2.5 pr-3 text-right font-display text-sm font-bold text-gold">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Card de confronto no bracket ─────────────────────────────────────────────

function BracketMatchCard({ match }: { match: BracketStageData["matches"][0] }) {
  const isCompleted = match.status === "COMPLETED";
  const isLive = match.status === "LIVE" || match.status === "AWAITING_RESULT";
  const hasScore = match.scoreA !== null && match.scoreB !== null;
  const tbd = !match.teamA || !match.teamB;

  const winnerA = isCompleted && match.winnerTeamId === match.teamA?.id;
  const winnerB = isCompleted && match.winnerTeamId === match.teamB?.id;

  function TeamSlot({ team, score, winner, side }: { team: BracketStageData["matches"][0]["teamA"]; score: number | null; winner: boolean; side: "top" | "bot" }) {
    return (
      <div className={cn(
        "flex items-center justify-between gap-2 px-3 py-2.5",
        winner && "bg-gold/10",
        side === "top" ? "border-b border-border/40" : "",
      )}>
        <div className="flex min-w-0 items-center gap-2">
          {team ? (
            <Avatar name={team.name} src={team.logoUrl} size="sm" className="h-6 w-6 shrink-0 text-[9px]" />
          ) : (
            <div className="h-6 w-6 shrink-0 rounded-full border border-dashed border-border/60" />
          )}
          <span className={cn(
            "truncate text-xs font-semibold",
            !team && "italic text-muted/50",
            team && winner ? "text-gold" : "text-paper/80",
          )}>
            {team ? team.name : "A definir"}
          </span>
        </div>
        {hasScore && score !== null ? (
          <span className={cn("shrink-0 min-w-[1.25rem] text-center font-display text-sm font-bold", winner ? "text-gold" : "text-muted")}>
            {score}
          </span>
        ) : null}
      </div>
    );
  }

  const inner = (
    <div className={cn(
      "w-48 overflow-hidden rounded-lg border bg-surface shadow-sm transition-all",
      isLive ? "border-red-500/60 shadow-red-500/10" : "border-border",
      !tbd && "hover:border-gold/40 hover:shadow-gold/10",
    )}>
      {/* Status pill */}
      <div className="flex items-center justify-between border-b border-border/60 bg-ink/60 px-3 py-1">
        {isLive ? (
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            Ao Vivo
          </span>
        ) : (
          <span className="text-[9px] text-muted/60 uppercase tracking-wide">
            {match.status === "COMPLETED" ? "Finalizado" : match.status === "SCHEDULED" ? "Agendado" : match.status}
          </span>
        )}
        <span className="text-[9px] text-muted/40">{match.seriesFormat}</span>
      </div>
      <TeamSlot team={match.teamA} score={match.scoreA} winner={winnerA} side="top" />
      <TeamSlot team={match.teamB} score={match.scoreB} winner={winnerB} side="bot" />
    </div>
  );

  if (tbd) return <div className="cursor-default">{inner}</div>;

  return (
    <Link href={`/matches/${match.id}`} className="block">
      {inner}
    </Link>
  );
}

// ─── Bracket eliminatório — renderização SVG matemática ──────────────────────

// Dimensões fixas do card (px)
const CARD_W = 200;
const CARD_H = 92; // header(26) + row(33) + row(33) = 92
const COL_GAP = 56; // espaço horizontal entre colunas
const CONNECTOR_W = COL_GAP; // comprimento das linhas horizontais

/**
 * Calcula as posições Y (centro) de cada card por fase.
 * Fase 0: N cards espaçados por GAP_0
 * Fase 1: N/2 cards, cada um centralizado entre o par da fase anterior
 * E assim por diante.
 */
function computeLayout(stages: BracketStageData[]): {
  positions: number[][]; // positions[stageIdx][matchIdx] = centerY
  totalHeight: number;
  colX: number[];        // x esquerdo de cada coluna
} {
  if (stages.length === 0) return { positions: [], totalHeight: 0, colX: [] };

  const firstCount = stages[0]?.matches.length ?? 1;
  // Espaço inicial entre cards — garante no mínimo 16px de gap
  const BASE_VERTICAL = CARD_H + 16;

  // Posições Y do centro de cada card na primeira fase
  const firstPositions: number[] = [];
  for (let i = 0; i < firstCount; i++) {
    firstPositions.push(i * BASE_VERTICAL + CARD_H / 2);
  }

  const positions: number[][] = [firstPositions];

  // Cada fase seguinte: centro entre cada par da fase anterior
  for (let si = 1; si < stages.length; si++) {
    const prev = positions[si - 1]!;
    const cur: number[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      const a = prev[i]!;
      const b = prev[i + 1] ?? a;
      cur.push((a + b) / 2);
    }
    positions.push(cur);
  }

  // Altura total necessária
  const allY = positions.flat();
  const totalHeight = Math.max(...allY) + CARD_H / 2 + 8;

  // X de cada coluna
  const colX: number[] = [];
  for (let si = 0; si < stages.length; si++) {
    colX.push(si * (CARD_W + COL_GAP));
  }

  return { positions, totalHeight, colX };
}

function EliminationBracket({ stages }: { stages: BracketStageData[] }) {
  if (stages.length === 0) return null;

  const { positions, totalHeight, colX } = computeLayout(stages);
  const totalWidth = (colX[colX.length - 1] ?? 0) + CARD_W;

  // Gera todas as linhas de conexão entre fases
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let si = 0; si < stages.length - 1; si++) {
    const curPositions = positions[si]!;
    const nextPositions = positions[si + 1]!;
    const xRight = colX[si]! + CARD_W;      // lado direito da coluna atual
    const xLeft = colX[si + 1]!;            // lado esquerdo da próxima coluna
    const xMid = xRight + CONNECTOR_W / 2;  // meio do conector

    // Cada par (i, i+1) se conecta ao próximo match (i/2)
    for (let i = 0; i < curPositions.length; i += 2) {
      const yTop = curPositions[i]!;
      const yBot = curPositions[i + 1] ?? yTop;
      const yNext = nextPositions[Math.floor(i / 2)]!;

      if (curPositions[i + 1] !== undefined) {
        // Linha horizontal do card top → meio
        lines.push({ x1: xRight, y1: yTop, x2: xMid, y2: yTop });
        // Linha horizontal do card bot → meio
        lines.push({ x1: xRight, y1: yBot, x2: xMid, y2: yBot });
        // Linha vertical ligando top e bot no meio
        lines.push({ x1: xMid, y1: yTop, x2: xMid, y2: yBot });
        // Linha horizontal do meio → próxima fase
        lines.push({ x1: xMid, y1: yNext, x2: xLeft, y2: yNext });
      } else {
        // Fase final: só um card — linha reta
        lines.push({ x1: xRight, y1: yTop, x2: xLeft, y2: yTop });
      }
    }
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div
        className="relative"
        style={{ width: totalWidth, height: totalHeight, minWidth: totalWidth }}
      >
        {/* SVG único com todas as linhas — fica atrás dos cards */}
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
              stroke="rgba(212,175,55,0.25)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* Cards posicionados absolutamente */}
        {stages.map((stage, si) => (
          <div key={stage.id}>
            {/* Label da fase */}
            <div
              className="absolute text-center"
              style={{ left: colX[si], top: 0, width: CARD_W }}
            >
              {/* apenas mostrar se for a primeira linha */}
            </div>

            {stage.matches.map((match, mi) => {
              const cy = positions[si]?.[mi] ?? 0;
              const top = cy - CARD_H / 2;

              return (
                <div
                  key={match.id}
                  className="absolute"
                  style={{ left: colX[si], top, width: CARD_W }}
                >
                  <BracketMatchCard match={match} />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Labels das fases abaixo do bracket */}
      <div className="mt-4 flex" style={{ width: totalWidth, minWidth: totalWidth }}>
        {stages.map((stage, si) => (
          <div
            key={stage.id}
            className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted/60 sm:text-xs"
            style={{ width: CARD_W + (si < stages.length - 1 ? COL_GAP : 0), paddingLeft: 0 }}
          >
            {stage.name}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function BracketView({ stages }: { stages?: BracketStageData[] }) {
  const allStages = stages ?? [];

  const groupStages = allStages.filter((s) => s.type === "GROUP");
  const elimStages = allStages.filter((s) => s.type !== "GROUP").sort((a, b) => a.order - b.order);

  // Nenhuma dado ainda
  if (allStages.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title="Chaveamento não gerado"
        description="O chaveamento estará disponível quando o campeonato entrar na fase eliminatória."
      />
    );
  }

  return (
    <div className="space-y-10">
      {/* ── 1. Fase de Grupos ────────────────────────────────────── */}
      {groupStages.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
            <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-tight text-gold sm:text-xl">
              <Users className="h-5 w-5" />
              Fase de Grupos
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          </div>

          {groupStages.map((stage) => (
            <div key={stage.id}>
              {stage.groups.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {stage.groups.map((group) => (
                    <GroupStandingsTable key={group.id} group={group} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">Grupos ainda não definidos.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 2. Chaveamento Eliminatório ──────────────────────────── */}
      {elimStages.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
            <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-tight text-gold sm:text-xl">
              <GitBranch className="h-5 w-5" />
              Chaveamento Mata-Mata
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          </div>

          <EliminationBracket stages={elimStages} />
        </div>
      )}

      {/* Nenhum conteúdo renderizável */}
      {groupStages.length === 0 && elimStages.length === 0 && (
        <EmptyState
          icon={GitBranch}
          title="Chaveamento não gerado"
          description="O chaveamento estará disponível quando o campeonato entrar na fase eliminatória."
        />
      )}
    </div>
  );
}

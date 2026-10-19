"use client";

import Link from "next/link";
import { GitBranch } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatDate, cn } from "@/lib/utils";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface BracketTeam {
  id: string;
  name: string;
  tag: string | null;
  logoUrl: string | null;
}

interface BracketMatch {
  id: string;
  teamA: BracketTeam | null;
  teamB: BracketTeam | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerTeamId: string | null;
  status: string;
  scheduledAt?: string | null;
  seriesFormat?: string;
}

interface BracketStage {
  id: string;
  name: string;
  order: number;
  type: string;
  matches: BracketMatch[];
}

interface BracketViewProps {
  stages?: BracketStage[];
}

// ─── Labels de status ─────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "AGD",
  READY: "AGD",
  LIVE: "AO VIVO",
  AWAITING_RESULT: "AG. RESULT.",
  COMPLETED: "FIM",
  CANCELLED: "CANCEL.",
};

const statusVariant = (s: string): "live" | "success" | "warning" | "neutral" => {
  if (s === "LIVE") return "live";
  if (s === "COMPLETED") return "success";
  if (s === "AWAITING_RESULT" || s === "READY") return "warning";
  return "neutral";
};

// ─── Slot individual de uma partida ───────────────────────────────────────────

function BracketSlot({
  match,
  isLast,
  connectNext,
}: {
  match: BracketMatch;
  isLast: boolean;
  connectNext: boolean;
}) {
  const isCompleted = match.status === "COMPLETED";
  const hasScore = match.scoreA !== null && match.scoreB !== null;

  function TeamRow({
    team,
    score,
    winner,
    tbd,
  }: {
    team: BracketTeam | null;
    score: number | null;
    winner: boolean;
    tbd?: boolean;
  }) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2.5 transition-colors",
          winner && "bg-gold/10",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {team ? (
            <Avatar name={team.name} src={team.logoUrl} size="sm" className="h-6 w-6 text-[10px]" />
          ) : (
            <div className="h-6 w-6 rounded-full border border-dashed border-border" />
          )}
          <span
            className={cn(
              "truncate text-xs font-semibold",
              tbd && "italic text-muted/60",
              !tbd && winner ? "text-gold" : "text-paper",
              !tbd && !winner && "text-paper/80",
            )}
          >
            {team ? team.name : "A definir"}
          </span>
        </div>
        {hasScore && score !== null ? (
          <span
            className={cn(
              "shrink-0 min-w-[1.5rem] text-center font-display text-sm font-bold",
              winner ? "text-gold" : "text-muted",
            )}
          >
            {score}
          </span>
        ) : null}
      </div>
    );
  }

  const winnerA = isCompleted && match.winnerTeamId === match.teamA?.id;
  const winnerB = isCompleted && match.winnerTeamId === match.teamB?.id;
  const tbd = !match.teamA || !match.teamB;

  return (
    /* Wrapper de posicionamento — inclui a linha conectora direita */
    <div className={cn("relative flex items-center", !isLast && "mb-0")}>
      {/* Card do confronto */}
      <Link
        href={`/matches/${match.id}`}
        className="group w-52 overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-all hover:border-gold/40 hover:shadow-gold/10"
        tabIndex={tbd ? -1 : 0}
        onClick={tbd ? (e) => e.preventDefault() : undefined}
      >
        {/* Header: data + status */}
        <div className="flex items-center justify-between border-b border-border/60 bg-ink/60 px-3 py-1.5">
          <span className="text-[10px] font-medium text-muted/80">
            {match.scheduledAt ? formatDate(match.scheduledAt) : "—"}
          </span>
          <Badge variant={statusVariant(match.status)} className="px-1.5 py-0 text-[9px]">
            {STATUS_LABEL[match.status] ?? match.status}
          </Badge>
        </div>

        {/* Times */}
        <TeamRow team={match.teamA} score={match.scoreA} winner={winnerA} tbd={!match.teamA} />
        <div className="mx-3 border-t border-border/40" />
        <TeamRow team={match.teamB} score={match.scoreB} winner={winnerB} tbd={!match.teamB} />
      </Link>

      {/* Linha horizontal saindo do card para a direita */}
      {connectNext && (
        <div className="h-px w-8 shrink-0 bg-border" aria-hidden />
      )}
    </div>
  );
}

// ─── Coluna de uma fase ───────────────────────────────────────────────────────

/**
 * Organiza os slots em pares com linhas conectoras verticais entre cada par,
 * e linha horizontal à esquerda entrando em cada slot a partir do par anterior.
 *
 * Layout por fase:
 *
 *  ┌──────┐──           ┌──────┐──
 *  │ M1   │  ├──── ──── │ M5   │
 *  └──────┘──           └──────┘
 *  ┌──────┐──
 *  │ M2   │  ┘
 *  └──────┘
 */
function BracketColumn({
  stage,
  isLast,
}: {
  stage: BracketStage;
  isLast: boolean;
}) {
  const matches = stage.matches;

  // Agrupa em pares para desenhar os conectores entre confrontos que levam ao mesmo
  // confronto na próxima fase. Pares: [M0,M1], [M2,M3], ...
  const pairs: BracketMatch[][] = [];
  for (let i = 0; i < matches.length; i += 2) {
    pairs.push(matches.slice(i, i + 2));
  }
  // Se ímpar (ex: grande final), trata como par único
  if (matches.length === 1) {
    pairs.push([matches[0]!]);
  }

  return (
    <div className="flex flex-col">
      {/* Nome da fase */}
      <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-muted/80">
        {stage.name}
      </p>

      {/* Pares de confrontos */}
      <div className="flex flex-col gap-0">
        {pairs.map((pair, pi) => {
          const topMatch = pair[0];
          const botMatch = pair[1];

          if (!topMatch) return null;

          // Fase final: só um jogo
          if (!botMatch) {
            return (
              <div key={`pair-${pi}`} className="flex items-center">
                {/* Linha de entrada (vindo da fase anterior) */}
                {!isLast && (
                  <div className="h-px w-8 shrink-0 bg-border" aria-hidden />
                )}
                <BracketSlot
                  match={topMatch}
                  isLast
                  connectNext={false}
                />
              </div>
            );
          }

          return (
            <div key={`pair-${pi}`} className="relative mb-8 flex flex-col">
              {/* Slot superior */}
              <div className="flex items-center">
                {/* Linha horizontal entrando (da fase anterior) */}
                {pi === 0 || true ? null : null}
                <div className="flex items-center">
                  <BracketSlot
                    match={topMatch}
                    isLast={false}
                    connectNext={!isLast}
                  />
                </div>
              </div>

              {/* Conector vertical entre os dois slots do par */}
              {!isLast && (
                <div
                  className="absolute right-0 top-[calc(50%-1rem)] h-[calc(50%+1rem+2.4rem)] w-px bg-border"
                  aria-hidden
                  style={{ right: "-0px" }}
                />
              )}

              {/* Slot inferior */}
              <div className="mt-4 flex items-center">
                <BracketSlot
                  match={botMatch}
                  isLast
                  connectNext={!isLast}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function BracketView({ stages }: BracketViewProps) {
  // Filtra apenas fases do tipo bracket (não grupos)
  const bracketStages = (stages ?? [])
    .filter((s) => s.type !== "GROUP")
    .sort((a, b) => a.order - b.order);

  if (!bracketStages.length) {
    return (
      <EmptyState
        icon={GitBranch}
        title="Chaveamento não gerado"
        description="O chaveamento estará disponível quando o campeonato entrar na fase eliminatória."
      />
    );
  }

  // Determina o número total de fases para calcular o espaçamento vertical
  // entre pares: fases iniciais têm mais jogos, então o gap entre pares cresce
  // conforme avança (metade dos jogos a cada fase).
  const maxMatches = Math.max(...bracketStages.map((s) => s.matches.length), 1);

  return (
    <div className="overflow-x-auto pb-4">
      {/* Grade horizontal de fases */}
      <div
        className="flex min-w-max items-start gap-0"
        role="region"
        aria-label="Chaveamento do campeonato"
      >
        {bracketStages.map((stage, stageIdx) => {
          const isLast = stageIdx === bracketStages.length - 1;
          const matchCount = stage.matches.length;

          // Cada fase tem verticalmente mais espaço entre pares que a anterior.
          // O fator de escala: cada fase eliminatória dobra o espaço entre pares.
          const pairGap = Math.pow(2, stageIdx) * 4; // rem

          return (
            <div
              key={stage.id}
              className="flex flex-col items-center"
              style={{
                // Centraliza verticalmente cada fase em relação à fase anterior
                marginTop: stageIdx === 0 ? "0" : `${(Math.pow(2, stageIdx - 1) * 4) / 2}rem`,
              }}
            >
              {/* Nome da fase */}
              <p className="mb-4 w-60 text-center text-xs font-semibold uppercase tracking-widest text-muted/80">
                {stage.name}
              </p>

              {/* Confrontos da fase */}
              <div
                className="flex flex-col"
                style={{ gap: `${pairGap}rem` }}
              >
                {pairMatches(stage.matches).map((pair, pi) => {
                  const top = pair[0];
                  const bot = pair[1];

                  if (!top) return null;

                  // Grande final ou semifinal com apenas um slot
                  if (!bot) {
                    return (
                      <div key={`pair-${pi}`} className="relative flex items-center">
                        {/* Linha entrando da esquerda */}
                        {stageIdx > 0 && (
                          <div className="h-px w-8 shrink-0 bg-border" aria-hidden />
                        )}
                        <BracketSlot match={top} isLast connectNext={false} />
                      </div>
                    );
                  }

                  return (
                    <BracketPair
                      key={`pair-${pi}`}
                      top={top}
                      bot={bot}
                      isLastStage={isLast}
                      showEntryLine={stageIdx > 0}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

/** Agrupa matches em pares (cada par alimenta um confronto na fase seguinte). */
function pairMatches(matches: BracketMatch[]): (BracketMatch | undefined)[][] {
  const pairs: (BracketMatch | undefined)[][] = [];
  for (let i = 0; i < matches.length; i += 2) {
    pairs.push([matches[i], matches[i + 1]]);
  }
  if (matches.length === 1) return [[matches[0], undefined]];
  return pairs;
}

// ─── Par de confrontos com conectores ─────────────────────────────────────────

function BracketPair({
  top,
  bot,
  isLastStage,
  showEntryLine,
}: {
  top: BracketMatch;
  bot: BracketMatch;
  isLastStage: boolean;
  showEntryLine: boolean;
}) {
  // Altura do slot de confronto (header 28px + 2 times × 38px + borders ≈ 110px)
  const SLOT_H = 110;
  // Gap entre os dois slots do par
  const GAP = 16;
  // Ponto vertical central de cada slot
  const topCenter = SLOT_H / 2;
  const botCenter = SLOT_H + GAP + SLOT_H / 2;
  // Meio do par (onde a linha vertical encontra a horizontal de saída)
  const midY = (topCenter + botCenter) / 2;

  return (
    <div className="relative flex flex-col" style={{ gap: `${GAP}px` }}>
      {/* Slot superior */}
      <div className="flex items-center">
        {showEntryLine && (
          <div className="h-px w-8 shrink-0 bg-border" aria-hidden />
        )}
        <BracketSlot match={top} isLast={false} connectNext={!isLastStage} />
      </div>

      {/* Slot inferior */}
      <div className="flex items-center">
        {showEntryLine && (
          <div className="h-px w-8 shrink-0 bg-border" aria-hidden />
        )}
        <BracketSlot match={bot} isLast connectNext={!isLastStage} />
      </div>

      {/* Conector vertical + horizontal de saída (só se não for a última fase) */}
      {!isLastStage && (
        <svg
          className="pointer-events-none absolute"
          aria-hidden
          style={{
            left: `calc(100% - 32px)`, // começa na linha horizontal do slot
            top: 0,
            width: 40,
            height: SLOT_H * 2 + GAP,
            overflow: "visible",
          }}
        >
          {/* Linha vertical que conecta o meio do top ao meio do bot */}
          <line
            x1={32}
            y1={topCenter}
            x2={32}
            y2={botCenter}
            stroke="#1F2937"
            strokeWidth={1.5}
          />
          {/* Linha horizontal saindo do meio vertical para a direita */}
          <line
            x1={32}
            y1={midY}
            x2={40}
            y2={midY}
            stroke="#1F2937"
            strokeWidth={1.5}
          />
        </svg>
      )}
    </div>
  );
}

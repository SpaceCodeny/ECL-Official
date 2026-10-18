"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, GitBranch } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface BracketTeam {
  id: string;
  name: string;
  tag: string | null;
  logoUrl: string | null;
}

interface BracketMatch {
  id: string;
  teamA: BracketTeam;
  teamB: BracketTeam;
  scoreA: number | null;
  scoreB: number | null;
  winnerTeamId: string | null;
  status: string;
}

interface BracketStage {
  id: string;
  name: string;
  order: number;
  matches: BracketMatch[];
}

interface BracketViewProps {
  stages?: BracketStage[];
}

function MatchSlot({ match }: { match: BracketMatch }) {
  const isCompleted = match.status === "COMPLETED";

  function TeamRow({ team, score }: { team: BracketTeam; score: number | null }) {
    const isWinner = isCompleted && match.winnerTeamId === team.id;
    return (
      <div className={cn("flex items-center justify-between gap-2 px-3 py-2", isWinner && "bg-gold/10")}>
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={team.name} src={team.logoUrl} size="sm" />
          <span className={cn("truncate text-xs font-semibold uppercase", isWinner ? "text-gold" : "text-paper")}>
            {team.name}
          </span>
        </div>
        {score !== null && (
          <span className={cn("shrink-0 font-display text-sm font-bold", isWinner ? "text-gold" : "text-muted")}>
            {score}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="w-56 overflow-hidden rounded-lg border border-border bg-surface">
      <TeamRow team={match.teamA} score={match.scoreA} />
      <div className="border-t border-border/50" />
      <TeamRow team={match.teamB} score={match.scoreB} />
    </div>
  );
}

export function BracketView({ stages }: BracketViewProps) {
  const [currentRound, setCurrentRound] = useState(0);

  if (!stages?.length) {
    return (
      <EmptyState
        icon={GitBranch}
        title="Chaveamento não gerado"
        description="O chaveamento será exibido quando o campeonato for iniciado."
      />
    );
  }

  const stage = stages[currentRound];

  return (
    <div className="space-y-4">
      {/* Navegação de rounds — responsivo */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setCurrentRound((p) => Math.max(0, p - 1))}
          disabled={currentRound === 0}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted transition-colors hover:text-paper disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {stages.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setCurrentRound(i)}
            className={cn(
              "shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors",
              currentRound === i
                ? "border-gold/60 bg-gold/10 text-gold"
                : "border-border text-muted hover:text-paper",
            )}
          >
            {s.name}
          </button>
        ))}
        <button
          onClick={() => setCurrentRound((p) => Math.min(stages.length - 1, p + 1))}
          disabled={currentRound === stages.length - 1}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted transition-colors hover:text-paper disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Partidas da fase atual */}
      {!stage?.matches.length ? (
        <EmptyState icon={GitBranch} title="Nenhuma partida nesta fase" description="As partidas serão geradas conforme o campeonato avança." />
      ) : (
        <div className="flex flex-wrap gap-4">
          {stage.matches.map((m) => (
            <MatchSlot key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}

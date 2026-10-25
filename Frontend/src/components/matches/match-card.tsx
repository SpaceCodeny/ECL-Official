  import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { MatchStatusBadge } from "./match-status-badge";
import { seriesFormatLabel } from "@/lib/labels";
import { formatDateTime, cn } from "@/lib/utils";
import type { Match, MatchTeam } from "@/types/match";

function TeamRow({ team, alignRight, highlight }: { team: MatchTeam; alignRight?: boolean; highlight?: boolean }) {
  return (
    <div className={cn("flex flex-1 items-center gap-2 min-w-0 sm:gap-3", alignRight && "flex-row-reverse text-right")}>
      <Avatar name={team.name} src={team.logoUrl} size="sm" className="shrink-0 sm:h-10 sm:w-10" />
      <div className={cn("min-w-0 flex-1", alignRight && "items-end")}>
        <p className={cn("truncate font-display text-xs font-semibold uppercase tracking-tight sm:text-sm", highlight ? "text-gold" : "text-paper")}>
          {team.name}
        </p>
        {team.tag ? <p className="text-[10px] text-muted sm:text-xs">{team.tag}</p> : null}
      </div>
    </div>
  );
}

export function MatchCard({ match, isLive = false }: { match: Match; isLive?: boolean }) {
  // O backend retorna scoreA/scoreB
  const scoreA = match.scoreA ?? null;
  const scoreB = match.scoreB ?? null;
  const hasScore = scoreA !== null && scoreB !== null;
  const winnerA = Boolean(match.winnerTeamId && match.winnerTeamId === match.teamA.id);
  const winnerB = Boolean(match.winnerTeamId && match.winnerTeamId === match.teamB.id);

  // O backend retorna stage como objeto { name, tournament }
  const stageName = typeof match.stage === "string" ? match.stage : (match.stage?.name ?? "");
  const tournamentName =
    typeof match.stage === "object" ? (match.stage?.tournament?.name ?? "") : "";
  const tournamentSlug = 
    typeof match.stage === "object" ? (match.stage?.tournament?.slug ?? "") : "";

  // Link para a tela da partida
  const href = `/matches/${match.id}`;

  return (
    <Link href={href} className="group block">
      <Card className={cn(
        "h-full transition-all",
        isLive 
          ? "animate-pulse-border border-2 border-gold shadow-lg shadow-gold/20 group-hover:shadow-gold/40" 
          : "group-hover:border-gold/40"
      )}>
        <div className="flex items-center justify-between border-b border-border bg-ink/40 px-3 py-2 sm:px-4 sm:py-2.5">
          <span className="truncate text-[10px] uppercase tracking-widest text-muted sm:text-xs">{tournamentName}</span>
          {isLive ? (
            <span className="flex items-center gap-1.5 rounded bg-red-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              AO VIVO
            </span>
          ) : (
            <MatchStatusBadge status={match.status} />
          )}
        </div>
        <div className="flex items-center gap-2 p-3 sm:p-4">
          <TeamRow team={match.teamA} highlight={winnerA} />
          <div className="flex shrink-0 flex-col items-center gap-1 px-1 sm:px-2">
            {hasScore ? (
              <span className="font-display text-lg font-bold text-paper sm:text-xl">
                {scoreA}
                <span className="px-0.5 text-muted sm:px-1">:</span>
                {scoreB}
              </span>
            ) : (
              <span className="font-display text-xs uppercase tracking-widest text-muted">VS</span>
            )}
            <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted">
              {seriesFormatLabel[match.seriesFormat]}
            </span>
          </div>
          <TeamRow team={match.teamB} alignRight highlight={winnerB} />
        </div>
        <div className="flex flex-col gap-1 border-t border-border px-3 py-2 text-[10px] text-muted sm:px-4 sm:py-2.5 sm:text-xs">
          <span className="flex items-center gap-1.5 sm:gap-2">
            <CalendarDays className="h-3 w-3 text-gold/70 sm:h-3.5 sm:w-3.5" aria-hidden />
            <span className="truncate">{match.scheduledAt ? formatDateTime(match.scheduledAt) : "Horário a definir"}</span>
          </span>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-muted/80">{stageName}{match.round ? ` · ${match.round}` : ""}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

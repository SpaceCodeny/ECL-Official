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
    <div className={cn("flex flex-1 items-center gap-3", alignRight && "flex-row-reverse text-right")}>
      <Avatar name={team.name} src={team.logoUrl} size="md" />
      <div className={cn("min-w-0", alignRight && "items-end")}>
        <p className={cn("truncate font-display text-sm font-semibold uppercase tracking-tight", highlight ? "text-gold" : "text-paper")}>
          {team.name}
        </p>
        {team.tag ? <p className="text-xs text-muted">{team.tag}</p> : null}
      </div>
    </div>
  );
}

export function MatchCard({ match }: { match: Match }) {
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

  return (
    <Link href={`/matches/${match.id}`} className="group block">
      <Card className="h-full transition-colors group-hover:border-gold/40">
        <div className="flex items-center justify-between border-b border-border bg-ink/40 px-4 py-2.5">
          <span className="truncate text-xs uppercase tracking-widest text-muted">{tournamentName}</span>
          <MatchStatusBadge status={match.status} />
        </div>
        <div className="flex items-center gap-2 p-4">
          <TeamRow team={match.teamA} highlight={winnerA} />
          <div className="flex shrink-0 flex-col items-center gap-1 px-2">
            {hasScore ? (
              <span className="font-display text-xl font-bold text-paper">
                {scoreA}
                <span className="px-1 text-muted">:</span>
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
        <div className="flex flex-col gap-1 border-t border-border px-4 py-2.5 text-xs text-muted">
          <span className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-gold/70" aria-hidden />
            {match.scheduledAt ? formatDateTime(match.scheduledAt) : "Horário a definir"}
          </span>
          <div className="flex items-center justify-between">
            <span className="text-muted/80">{stageName}{match.round ? ` · ${match.round}` : ""}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

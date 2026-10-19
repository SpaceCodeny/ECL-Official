import Link from "next/link";
import { Calendar, Users, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TournamentStatusBadge } from "./status-badge";
import { tournamentFormatLabel } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import type { TournamentListItem } from "@/types/tournament";

export function TournamentCard({ tournament }: { tournament: TournamentListItem }) {
  const spotsLeft = tournament.maxTeams - tournament.registeredTeams;

  return (
    <Link href={`/tournaments/${tournament.slug}`} className="group block">
      <Card className="h-full overflow-hidden transition-colors group-hover:border-gold/40">
        <div className="flex items-center justify-between border-b border-border bg-ink/40 px-3 py-2 sm:px-5 sm:py-3">
          <TournamentStatusBadge status={tournament.status} />
          <span className="text-[10px] uppercase tracking-widest text-muted sm:text-xs">
            {tournamentFormatLabel[tournament.format]}
          </span>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div>
            <h3 className="font-display text-base font-bold uppercase tracking-tight text-paper transition-colors group-hover:text-gold sm:text-lg">
              {tournament.name}
            </h3>
            <p className="text-xs text-muted sm:text-sm">{tournament.season}</p>
          </div>
          <div className="flex flex-col gap-2 text-xs text-muted sm:text-sm">
            <span className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-gold/70 sm:h-4 sm:w-4" aria-hidden />
              <span className="truncate">{tournament.startDate ? formatDate(tournament.startDate) : "Data a definir"}</span>
            </span>
            <span className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-gold/70 sm:h-4 sm:w-4" aria-hidden />
              <span className="truncate">
                {tournament.registeredTeams}/{tournament.maxTeams} equipes
                {tournament.status === "REGISTRATION_OPEN" ? ` · ${Math.max(spotsLeft, 0)} vagas` : ""}
              </span>
            </span>
            {tournament.prizePool ? (
              <span className="flex items-center gap-2 text-gold">
                <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                <span className="truncate">{tournament.prizePool}</span>
              </span>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}

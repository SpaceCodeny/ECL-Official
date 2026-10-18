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
        <div className="flex items-center justify-between border-b border-border bg-ink/40 px-5 py-3">
          <TournamentStatusBadge status={tournament.status} />
          <span className="text-xs uppercase tracking-widest text-muted">
            {tournamentFormatLabel[tournament.format]}
          </span>
        </div>
        <div className="flex flex-col gap-3 p-5">
          <div>
            <h3 className="font-display text-lg font-bold uppercase tracking-tight text-paper transition-colors group-hover:text-gold">
              {tournament.name}
            </h3>
            <p className="text-sm text-muted">{tournament.season}</p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-muted">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gold/70" aria-hidden />
              {tournament.startDate ? formatDate(tournament.startDate) : "Data a definir"}
            </span>
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gold/70" aria-hidden />
              {tournament.registeredTeams}/{tournament.maxTeams} equipes
              {tournament.status === "REGISTRATION_OPEN" ? ` · ${Math.max(spotsLeft, 0)} vagas` : ""}
            </span>
            {tournament.prizePool ? (
              <span className="flex items-center gap-2 text-gold">
                <Trophy className="h-4 w-4" aria-hidden />
                {tournament.prizePool}
              </span>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}

"use client";

import Link from "next/link";
import { Calendar, Users, Trophy, ArrowRight, Layers } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/demo-badge";
import { TournamentStatusBadge } from "@/components/tournaments/status-badge";
import { useFeaturedTournament } from "@/hooks/use-home";
import { tournamentFormatLabel } from "@/lib/labels";
import { formatDate, hasNoData } from "@/lib/utils";
import { demoFeaturedTournament } from "@/lib/demo-data";
import type { FeaturedTournament } from "@/types/domain";

function FeaturedContent({ t, demo }: { t: FeaturedTournament; demo: boolean }) {
  return (
    <div className="card-ecl relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
      <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <TournamentStatusBadge status={t.status as never} />
            {demo ? <DemoBadge /> : null}
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-paper sm:text-4xl">
              {t.name}
            </h2>
            <p className="text-sm uppercase tracking-widest text-gold">{t.season}</p>
          </div>
          {t.description ? <p className="max-w-xl text-sm text-muted">{t.description}</p> : null}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gold/70" aria-hidden />
              {t.startDate ? formatDate(t.startDate) : "Data a definir"}
            </span>
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-gold/70" aria-hidden />
              {tournamentFormatLabel[t.format as keyof typeof tournamentFormatLabel] ?? t.format}
            </span>
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gold/70" aria-hidden />
              {t.registeredTeams}/{t.maxTeams} equipes
            </span>
            {t.prizePool ? (
              <span className="flex items-center gap-2 text-gold">
                <Trophy className="h-4 w-4" aria-hidden />
                {t.prizePool}
              </span>
            ) : null}
          </div>
        </div>
        <Link href={`/tournaments/${t.slug}`} className={buttonVariants({ variant: "primary", size: "lg" })}>
          Ver campeonato
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

export function FeaturedTournamentSection() {
  const { data, isLoading } = useFeaturedTournament();
  const useDemo = hasNoData(data);
  const tournament = useDemo ? demoFeaturedTournament : (data as FeaturedTournament);

  return (
    <section className="container-ecl py-16">
      <FeaturedContent t={tournament} demo={useDemo} />
    </section>
  );
}

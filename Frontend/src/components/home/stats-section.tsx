"use client";

import { Trophy, Users, Gamepad2, UserCheck } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizationStats } from "@/hooks/use-home";
import { demoStats } from "@/lib/demo-data";

export function StatsSection() {
  const { data, isLoading } = useOrganizationStats();

  const stats = data ?? demoStats;
  const isDemo = !data || data.isDemo;

  return (
    <section className="border-t border-border bg-navy/30">
      <div className="container-ecl py-16">
        <div className="mb-8 flex items-center gap-3">
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-paper sm:text-3xl">
            A organização
          </h2>
          {isDemo ? <DemoBadge /> : null}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={Trophy}
              value={stats.tournamentsHeld}
              label="Campeonatos realizados"
              accent
            />
            <StatCard icon={Users} value={stats.teamsRegistered} label="Equipes cadastradas" />
            <StatCard icon={Gamepad2} value={stats.matchesPlayed} label="Partidas disputadas" />
            <StatCard icon={UserCheck} value={stats.playersRegistered} label="Jogadores registrados" />
          </div>
        )}
      </div>
    </section>
  );
}

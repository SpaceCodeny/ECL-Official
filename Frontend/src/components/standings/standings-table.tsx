"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BarChart2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface StandingRow {
  team: { id: string; slug: string; name: string; tag: string | null; logoUrl: string | null };
  played: number;
  wins: number;
  losses: number;
  mapsWon: number;
  mapsLost: number;
  points: number;
}

interface Group {
  id: string;
  name: string;
  standings: StandingRow[];
}

export function StandingsTable({ tournamentId }: { tournamentId: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["standings", tournamentId],
    queryFn: () => api.get<Group[]>(`/tournaments/${tournamentId}/standings`),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (!data?.length) return <EmptyState icon={BarChart2} title="Sem classificação" description="A classificação estará disponível quando as partidas forem jogadas." />;

  return (
    <div className="space-y-8">
      {data.map((group) => (
        <div key={group.id}>
          <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-gold">
            {group.name}
          </h3>
          <div className="card-ecl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-widest text-muted">
                  <th className="py-3 pl-4 text-left w-8">#</th>
                  <th className="py-3 pl-2 text-left">Equipe</th>
                  <th className="hidden py-3 text-center sm:table-cell">J</th>
                  <th className="hidden py-3 text-center sm:table-cell">V</th>
                  <th className="hidden py-3 text-center sm:table-cell">D</th>
                  <th className="hidden py-3 text-center md:table-cell">Maps</th>
                  <th className="py-3 pr-4 text-right font-bold text-gold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {group.standings.map((row, i) => (
                  <tr key={row.team.id} className={cn("border-b border-border/50 last:border-0 transition-colors hover:bg-surfaceHover", i < 2 && "bg-gold/5")}>
                    <td className="py-3 pl-4 font-display text-sm font-bold text-muted">{i + 1}</td>
                    <td className="py-3 pl-2">
                      <Link href={`/teams/${row.team.slug}`} className="flex items-center gap-3 hover:text-gold">
                        <Avatar name={row.team.name} src={row.team.logoUrl} size="sm" />
                        <span className="font-display font-semibold uppercase tracking-tight">{row.team.name}</span>
                      </Link>
                    </td>
                    <td className="hidden py-3 text-center text-muted sm:table-cell">{row.played}</td>
                    <td className="hidden py-3 text-center text-emerald-400 sm:table-cell">{row.wins}</td>
                    <td className="hidden py-3 text-center text-red-400 sm:table-cell">{row.losses}</td>
                    <td className="hidden py-3 text-center text-muted md:table-cell">{row.mapsWon}/{row.mapsLost}</td>
                    <td className="py-3 pr-4 text-right font-display text-base font-bold text-gold">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

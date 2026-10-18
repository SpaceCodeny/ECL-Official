"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, BarChart2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getTeamRanking } from "@/services/rankings.service";
import { cn } from "@/lib/utils";
import type { RankingEntry } from "@/types/domain";

const SORT_OPTIONS = [
  { label: "Pontos", value: "points" },
  { label: "Vitórias", value: "wins" },
  { label: "Aproveitamento", value: "rate" },
  { label: "Títulos", value: "titles" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export function RankingsClient() {
  const [sortBy, setSortBy] = useState<SortValue>("points");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["rankings", sortBy],
    queryFn: () => getTeamRanking(50),
  });

  let entries: RankingEntry[] = data ?? [];
  if (entries.length > 0) {
    entries = [...entries].sort((a, b) => {
      switch (sortBy) {
        case "wins": return b.wins - a.wins;
        case "titles": return b.titles - a.titles;
        case "rate": {
          const rateA = a.matchesPlayed ? a.wins / a.matchesPlayed : 0;
          const rateB = b.matchesPlayed ? b.wins / b.matchesPlayed : 0;
          return rateB - rateA;
        }
        default: return b.points - a.points;
      }
    });
  }

  return (
    <div className="container-ecl py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-paper">
            Ranking Competitivo
          </h1>
          <p className="mt-2 text-muted">Classificação geral das equipes da Elite Champions League.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors",
                sortBy === opt.value
                  ? "border-gold/60 bg-gold/15 text-gold"
                  : "border-border text-muted hover:text-paper",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-ecl overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-border/50">
                <Skeleton className="h-7 w-7 rounded" />
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 flex-1 rounded" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !entries.length ? (
          <EmptyState icon={BarChart2} title="Sem dados de ranking" description="O ranking será calculado após as primeiras partidas serem disputadas." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-widest text-muted">
                <th className="py-3 pl-4 text-left w-10">Pos.</th>
                <th className="py-3 text-left">Equipe</th>
                <th className="hidden py-3 text-center sm:table-cell">Jogos</th>
                <th className="hidden py-3 text-center sm:table-cell">V</th>
                <th className="hidden py-3 text-center sm:table-cell">D</th>
                <th className="hidden py-3 text-center md:table-cell">Aprov.</th>
                <th className="hidden py-3 text-center lg:table-cell">Títulos</th>
                <th className="py-3 pr-4 text-right font-bold text-gold">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const rate = e.matchesPlayed ? Math.round((e.wins / e.matchesPlayed) * 100) : 0;
                const delta = e.previousPosition !== null ? e.previousPosition - (i + 1) : null;
                return (
                  <tr key={e.team.id} className={cn("border-b border-border/50 last:border-0 transition-colors hover:bg-surfaceHover", i < 3 && "bg-gold/5")}>
                    <td className="py-3 pl-4">
                      <div className="flex items-center gap-2">
                        <span className={cn("flex h-7 w-7 items-center justify-center rounded font-display text-sm font-bold", i < 3 ? "bg-gold/15 text-gold" : "text-muted")}>
                          {i + 1}
                        </span>
                        {delta !== null && delta !== 0 ? (
                          delta > 0
                            ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                            : <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                        ) : <Minus className="h-3.5 w-3.5 text-muted/50" />}
                      </div>
                    </td>
                    <td className="py-3">
                      <Link href={`/teams/${e.team.slug}`} className="flex items-center gap-3 hover:text-gold">
                        <Avatar name={e.team.name} src={e.team.logoUrl} size="sm" />
                        <div className="min-w-0">
                          <span className="font-display font-semibold uppercase tracking-tight">{e.team.name}</span>
                          {e.team.tag && <span className="ml-2 text-xs text-muted">{e.team.tag}</span>}
                        </div>
                      </Link>
                    </td>
                    <td className="hidden py-3 text-center text-muted sm:table-cell">{e.matchesPlayed}</td>
                    <td className="hidden py-3 text-center text-emerald-400 sm:table-cell">{e.wins}</td>
                    <td className="hidden py-3 text-center text-red-400 sm:table-cell">{e.losses}</td>
                    <td className="hidden py-3 text-center text-muted md:table-cell">{rate}%</td>
                    <td className="hidden py-3 text-center lg:table-cell">
                      {e.titles > 0 ? <Badge variant="gold">{e.titles}</Badge> : <span className="text-muted/40">—</span>}
                    </td>
                    <td className="py-3 pr-4 text-right font-display text-base font-bold text-gold">{e.points.toLocaleString("pt-BR")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

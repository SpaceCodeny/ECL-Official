"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoBadge } from "@/components/ui/demo-badge";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useTeamRanking } from "@/hooks/use-home";
import { hasNoData, cn } from "@/lib/utils";
import { demoRanking } from "@/lib/demo-data";
import type { RankingEntry } from "@/types/domain";

export function RankingSection() {
  const { data, isLoading, isError, refetch } = useTeamRanking(5);

  const useDemo = !isLoading && !isError && (data === undefined || (Array.isArray(data) && data.length === 0));
  const entries = useDemo ? demoRanking : (data ?? []);

  return (
    <section className="border-t border-border">
      <div className="container-ecl py-16">
        <div className="mb-6 flex items-end gap-4">
          <SectionHeader title="Ranking Competitivo" description="Top 5 equipes por pontos" href="/rankings" />
          {useDemo ? <DemoBadge /> : null}
        </div>

        <div className="card-ecl overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 border-b border-border/50 p-4 last:border-0">
                  <Skeleton className="h-7 w-7 rounded" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 flex-1 rounded" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : entries.length === 0 ? (
            <EmptyState title="Sem dados de ranking" description="O ranking será calculado após as primeiras partidas." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-widest text-muted">
                  <th className="w-16 py-3 pl-4 text-left sm:w-20">Pos.</th>
                  <th className="py-3 text-left">Equipe</th>
                  <th className="hidden w-16 py-3 text-center sm:table-cell">Jogos</th>
                  <th className="hidden w-12 py-3 text-center sm:table-cell">V</th>
                  <th className="hidden w-12 py-3 text-center sm:table-cell">D</th>
                  <th className="hidden w-20 py-3 text-center md:table-cell">Aprov.</th>
                  <th className="hidden w-20 py-3 text-center lg:table-cell">Títulos</th>
                  <th className="w-20 py-3 pr-4 text-right font-bold text-gold sm:w-24">Pontos</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => {
                  const rate = e.matchesPlayed ? Math.round((e.wins / e.matchesPlayed) * 100) : 0;
                  const delta = e.previousPosition !== null ? e.previousPosition - (i + 1) : null;
                  return (
                    <tr key={e.team.id} className={cn("border-b border-border/50 last:border-0 transition-colors hover:bg-surfaceHover", i < 3 && "bg-gold/5")}>
                      <td className="py-3 pl-4">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded font-display text-sm font-bold tabular-nums", i < 3 ? "bg-gold/15 text-gold" : "text-muted")}>
                            {i + 1}
                          </span>
                          {delta !== null && delta !== 0 ? (
                            delta > 0
                              ? <TrendingUp className="h-3 w-3 shrink-0 text-emerald-400 sm:h-3.5 sm:w-3.5" />
                              : <TrendingDown className="h-3 w-3 shrink-0 text-red-400 sm:h-3.5 sm:w-3.5" />
                          ) : <Minus className="h-3 w-3 shrink-0 text-muted/50 sm:h-3.5 sm:w-3.5" />}
                        </div>
                      </td>
                      <td className="py-3 pr-2">
                        <Link href={`/teams/${e.team.slug}`} className="flex items-center gap-2 hover:text-gold sm:gap-3">
                          <Avatar name={e.team.name} src={e.team.logoUrl} size="sm" className="shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="block truncate font-display text-xs font-semibold uppercase tracking-tight sm:text-sm">{e.team.name}</span>
                            {e.team.tag && <span className="text-[10px] text-muted sm:text-xs">{e.team.tag}</span>}
                          </div>
                        </Link>
                      </td>
                      <td className="hidden py-3 text-center font-display tabular-nums text-muted sm:table-cell">{e.matchesPlayed}</td>
                      <td className="hidden py-3 text-center font-display tabular-nums text-emerald-400 sm:table-cell">{e.wins}</td>
                      <td className="hidden py-3 text-center font-display tabular-nums text-red-400 sm:table-cell">{e.losses}</td>
                      <td className="hidden py-3 text-center font-display tabular-nums text-muted md:table-cell">{rate}%</td>
                      <td className="hidden py-3 text-center lg:table-cell">
                        {e.titles > 0 ? (
                          <span className="inline-flex items-center rounded bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">
                            {e.titles}
                          </span>
                        ) : (
                          <span className="text-muted/40">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right font-display text-base font-bold tabular-nums text-gold">{e.points.toLocaleString("pt-BR")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}

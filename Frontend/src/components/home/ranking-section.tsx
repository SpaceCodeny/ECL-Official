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

function PositionDelta({ entry }: { entry: RankingEntry }) {
  if (entry.previousPosition === null) return <Minus className="h-3.5 w-3.5 text-muted" aria-hidden />;
  const delta = entry.previousPosition - entry.position;
  if (delta === 0) return <Minus className="h-3.5 w-3.5 text-muted" aria-hidden />;
  if (delta > 0) return (
    <span className="flex items-center gap-0.5 text-emerald-400" title={`+${delta}`}>
      <TrendingUp className="h-3.5 w-3.5" aria-hidden />
      <span className="text-xs">{delta}</span>
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-red-400" title={String(delta)}>
      <TrendingDown className="h-3.5 w-3.5" aria-hidden />
      <span className="text-xs">{Math.abs(delta)}</span>
    </span>
  );
}

function RankingRow({ entry, rank }: { entry: RankingEntry; rank: number }) {
  const isTop3 = rank <= 3;
  return (
    <Link
      href={`/teams/${entry.team.slug}`}
      className="group flex items-center gap-4 rounded-lg px-4 py-3 transition-colors hover:bg-surfaceHover"
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded font-display text-sm font-bold",
          isTop3 ? "bg-gold/15 text-gold" : "text-muted",
        )}
      >
        {rank}
      </span>
      <Avatar name={entry.team.name} src={entry.team.logoUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-semibold uppercase tracking-tight text-paper transition-colors group-hover:text-gold">
          {entry.team.name}
        </p>
        {entry.team.tag ? <p className="text-xs text-muted">{entry.team.tag}</p> : null}
      </div>
      <div className="hidden items-center gap-6 text-sm text-muted sm:flex">
        <span className="w-8 text-right" title="Vitórias">{entry.wins}V</span>
        <span className="w-8 text-right" title="Derrotas">{entry.losses}D</span>
        <span className="w-14 text-right font-display font-bold text-gold">{entry.points.toLocaleString("pt-BR")}</span>
      </div>
      <PositionDelta entry={entry} />
    </Link>
  );
}

export function RankingSection() {
  const { data, isLoading, isError, refetch } = useTeamRanking(5);

  const useDemo = !isLoading && !isError && (data === undefined || (Array.isArray(data) && data.length === 0));
  const entries = useDemo ? demoRanking : (data ?? []);

  return (
    <section className="border-t border-border">
      <div className="container-ecl py-16">
        <div className="mb-6 flex items-end gap-4">
          <SectionHeader title="Ranking Competitivo" description="Top equipes por pontos" href="/rankings" />
          {useDemo ? <DemoBadge /> : null}
        </div>

        <div className="card-ecl overflow-hidden">
          <div className="hidden items-center gap-4 border-b border-border px-4 py-2.5 text-xs font-medium uppercase tracking-widest text-muted sm:flex">
            <span className="w-7">Pos.</span>
            <span className="ml-12 flex-1">Equipe</span>
            <div className="flex gap-6 pr-5">
              <span className="w-8 text-right">V</span>
              <span className="w-8 text-right">D</span>
              <span className="w-14 text-right">Pontos</span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-0 divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-6 w-6 rounded" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 flex-1 rounded" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : entries.length === 0 ? (
            <EmptyState title="Sem dados de ranking" description="O ranking será calculado após as primeiras partidas." />
          ) : (
            <div className="flex flex-col">
              {entries.map((e, i) => (
                <RankingRow key={e.team.id} entry={e} rank={i + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

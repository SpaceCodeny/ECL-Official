"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Trophy, Flame, Clock, CheckCircle2, Layers } from "lucide-react";
import { TournamentCard } from "./tournament-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getTournaments } from "@/services/tournaments.service";
import { cn } from "@/lib/utils";

// Status visíveis para usuários comuns — CANCELLED propositalmente excluído.
const VISIBLE_STATUSES = "DRAFT,PUBLISHED,REGISTRATION_OPEN,REGISTRATION_CLOSED,IN_PROGRESS,COMPLETED";

const STATUS_FILTERS = [
  { label: "Todos",              value: "",                  icon: Layers },
  { label: "Inscrições Abertas", value: "REGISTRATION_OPEN", icon: Flame },
  { label: "Em Andamento",       value: "IN_PROGRESS",       icon: Clock },
  { label: "Encerrados",         value: "COMPLETED",         icon: CheckCircle2 },
];

export function TournamentsListClient() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["tournaments", statusFilter, debouncedSearch],
    queryFn: () =>
      getTournaments({
        status: statusFilter || VISIBLE_STATUSES,
        search: debouncedSearch || undefined,
      }),
  });

  function handleSearchChange(v: string) {
    setSearch(v);
    clearTimeout((window as Window & { _st?: ReturnType<typeof setTimeout> })._st);
    (window as Window & { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(
      () => setDebouncedSearch(v),
      380,
    );
  }

  const tournaments = data?.data ?? [];
  // Destaque: primeiro torneio com inscrições abertas ou em andamento
  const featured = tournaments.find(
    (t) => t.status === "IN_PROGRESS" || t.status === "REGISTRATION_OPEN",
  );
  const rest = featured ? tournaments.filter((t) => t.id !== featured.id) : tournaments;

  return (
    <div className="space-y-8">
      {/* Barra de filtros + busca */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filtros em pill */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => {
            const Icon = f.icon;
            const active = statusFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-wide transition-all duration-200",
                  active
                    ? "border-gold/60 bg-gold/10 text-gold shadow-sm shadow-gold/10"
                    : "border-border/60 text-muted hover:border-gold/30 hover:bg-white/[0.03] hover:text-paper",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Busca */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/60" aria-hidden />
          <input
            type="search"
            placeholder="Buscar campeonato…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={cn(
              "h-10 w-full rounded-full border bg-ink/40 pl-10 pr-4 text-sm text-paper",
              "placeholder:text-muted/50",
              "border-border/60 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/20",
              "transition-colors duration-200",
            )}
          />
        </div>
      </div>

      {/* Resultados */}
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-56 rounded-2xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !tournaments.length ? (
        <EmptyState
          icon={Trophy}
          title="Nenhum campeonato encontrado"
          description="Tente ajustar os filtros ou a busca."
        />
      ) : (
        <div className="space-y-6">
          {/* Card em destaque — ocupa largura total com layout horizontal */}
          {featured && !debouncedSearch && !statusFilter && (
            <FeaturedCard tournament={featured} />
          )}

          {/* Contador */}
          <p className="text-xs uppercase tracking-widest text-muted">
            {data?.total ?? tournaments.length} campeonato
            {(data?.total ?? tournaments.length) !== 1 ? "s" : ""} encontrado
            {(data?.total ?? tournaments.length) !== 1 ? "s" : ""}
          </p>

          {/* Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(featured && !debouncedSearch && !statusFilter ? rest : tournaments).map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Featured Card ────────────────────────────────────────────────────────────

import Link from "next/link";
import { Calendar, Users, ArrowRight } from "lucide-react";
import { TournamentStatusBadge } from "./status-badge";
import { tournamentFormatLabel } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import type { TournamentListItem } from "@/types/tournament";

function FeaturedCard({ tournament: t }: { tournament: TournamentListItem }) {
  const fillPct = Math.min((t.registeredTeams / t.maxTeams) * 100, 100);
  const isLive = t.status === "IN_PROGRESS";

  return (
    <Link
      href={`/tournaments/${t.slug}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 rounded-2xl"
    >
      <article
        className={cn(
          "relative overflow-hidden rounded-2xl border transition-all duration-300",
          isLive
            ? "border-red-500/30 hover:border-red-400/50 hover:shadow-xl hover:shadow-red-900/20"
            : "border-gold/20 hover:border-gold/40 hover:shadow-xl hover:shadow-gold/10",
          "bg-surface/60",
        )}
      >
        {/* Banner hero */}
        <div className="relative h-48 overflow-hidden bg-navy/80 sm:h-56">
          {t.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={t.bannerUrl}
              alt=""
              aria-hidden
              className="h-full w-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-navy/80 via-ink/95 to-black">
              <svg className="absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden>
                <defs>
                  <pattern id="feat-grid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                    <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gold" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#feat-grid)" />
              </svg>
            </div>
          )}

          {/* Gradiente overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface/95 to-transparent" />

          {/* Linha decorativa superior */}
          <div className={cn(
            "absolute inset-x-0 top-0 h-px",
            isLive
              ? "bg-gradient-to-r from-transparent via-red-500/80 to-transparent"
              : "bg-gradient-to-r from-transparent via-gold/60 to-transparent",
          )} />

          {/* Conteúdo sobre o banner */}
          <div className="absolute inset-0 flex flex-col justify-end p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TournamentStatusBadge status={t.status} />
                  <span className="rounded-full border border-border/50 bg-ink/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted backdrop-blur-sm">
                    {tournamentFormatLabel[t.format]}
                  </span>
                  {isLive && (
                    <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-red-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse-live" />
                      Live
                    </span>
                  )}
                </div>
                <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-paper sm:text-3xl">
                  {t.name}
                </h3>
                <p className="text-xs uppercase tracking-widest text-gold/80">{t.season}</p>
              </div>

              <div className="flex items-center gap-3 text-sm font-medium text-gold/90 group-hover:text-gold transition-colors">
                Ver campeonato
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-6 px-6 py-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-gold/50" />
            {t.startDate ? formatDate(t.startDate) : "Data a definir"}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-gold/50" />
            {t.registeredTeams}/{t.maxTeams} equipes
          </span>
          {t.prizePool && (
            <span className="flex items-center gap-1.5 text-gold">
              <Trophy className="h-3.5 w-3.5" />
              {t.prizePool}
            </span>
          )}

          {/* Barra de progresso inline */}
          <div className="ml-auto flex items-center gap-2">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-border/60">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  fillPct >= 100 ? "bg-red-500" : fillPct >= 80 ? "bg-amber-400" : "bg-gradient-to-r from-gold-dark to-gold",
                )}
                style={{ width: `${fillPct}%` }}
              />
            </div>
            <span className="text-[10px] text-muted">{Math.round(fillPct)}% cheio</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

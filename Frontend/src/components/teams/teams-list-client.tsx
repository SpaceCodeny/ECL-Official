"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, Users, Shield, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface TeamListItem {
  id: string;
  slug: string;
  name: string;
  tag: string | null;
  logoUrl: string | null;
  isActive: boolean;
  _count: { memberships: number };
}

// Cores de accent por índice — rotaciona entre variações de dourado/azul
const ACCENTS = [
  "from-gold/20 to-gold/5",
  "from-blue-500/15 to-blue-500/5",
  "from-gold/15 to-gold/5",
  "from-indigo-500/15 to-indigo-500/5",
];

export function TeamsListClient() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  function handleSearch(v: string) {
    setSearch(v);
    clearTimeout((window as Window & { _t?: ReturnType<typeof setTimeout> })._t);
    (window as Window & { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(
      () => setDebounced(v),
      380,
    );
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["teams", debounced],
    queryFn: () =>
      api.get<{ data: TeamListItem[]; total: number }>("/teams", {
        search: debounced || undefined,
        pageSize: 40,
      }),
  });

  const teams = data?.data ?? [];

  return (
    <div className="space-y-8">
      {/* Barra de busca */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="search"
            placeholder="Buscar equipe ou tag…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-navy/50 pl-10 pr-4 text-sm text-paper placeholder:text-muted/50 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-colors"
          />
        </div>
        {data && (
          <span className="text-sm text-muted whitespace-nowrap">
            {data.total} equipe{data.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Grid de equipes */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhuma equipe encontrada"
          description={
            debounced
              ? `Sem resultados para "${debounced}".`
              : "Nenhuma equipe cadastrada ainda."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teams.map((team, i) => (
            <TeamCard key={team.id} team={team} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Card individual ──────────────────────────────────────────────────────────

function TeamCard({ team, index }: { team: TeamListItem; index: number }) {
  const accent = ACCENTS[index % ACCENTS.length]!;

  return (
    <Link
      href={`/teams/${team.slug}`}
      className="group relative overflow-hidden rounded-xl border border-border bg-surface transition-all duration-300 hover:border-gold/50 hover:shadow-lg hover:shadow-gold/5"
    >
      {/* Accent gradient no canto superior direito */}
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100",
          accent,
        )}
        aria-hidden
      />

      {/* Linha decorativa superior */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden />

      <div className="relative flex items-center gap-4 p-5">
        {/* Número sequencial */}
        <span className="absolute right-3 top-3 font-display text-[10px] font-bold tracking-widest text-muted/30 group-hover:text-gold/30 transition-colors">
          #{String(index + 1).padStart(2, "0")}
        </span>

        {/* Logo / Avatar */}
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-lg bg-gold/10 blur-md opacity-0 group-hover:opacity-60 transition-opacity" aria-hidden />
          <Avatar
            name={team.name}
            src={team.logoUrl}
            size="lg"
            className="relative h-14 w-14 rounded-lg text-xl font-bold"
          />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            {team.tag && (
              <span className="rounded bg-gold/10 px-1.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest text-gold">
                {team.tag}
              </span>
            )}
          </div>
          <p className="truncate font-display text-base font-bold uppercase tracking-tight text-paper transition-colors group-hover:text-gold leading-tight">
            {team.name}
          </p>
          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted/70">
            <Users className="h-3 w-3" />
            <span>{team._count.memberships} membro{team._count.memberships !== 1 ? "s" : ""}</span>
            {!team.isActive && (
              <span className="ml-1 rounded bg-muted/10 px-1 text-[10px] uppercase tracking-wide text-muted/50">
                Inativa
              </span>
            )}
          </div>
        </div>

        {/* Seta */}
        <ChevronRight className="h-4 w-4 shrink-0 text-muted/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-gold" />
      </div>
    </Link>
  );
}

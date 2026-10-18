"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { TournamentCard } from "./tournament-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { getTournaments } from "@/services/tournaments.service";
import type { TournamentStatus } from "@/types/tournament";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "Todos", value: "" },
  { label: "Inscrições Abertas", value: "REGISTRATION_OPEN" },
  { label: "Em Andamento", value: "IN_PROGRESS" },
  { label: "Publicados", value: "PUBLISHED" },
  { label: "Encerrados", value: "COMPLETED" },
];

export function TournamentsListClient() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["tournaments", statusFilter, debouncedSearch],
    queryFn: () => getTournaments({ status: statusFilter || undefined, search: debouncedSearch || undefined }),
  });

  function handleSearchChange(v: string) {
    setSearch(v);
    clearTimeout((window as Window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer);
    (window as Window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(() => setDebouncedSearch(v), 400);
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors",
                statusFilter === f.value
                  ? "border-gold/60 bg-gold/15 text-gold"
                  : "border-border text-muted hover:border-gold/30 hover:text-paper",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            placeholder="Buscar campeonato…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-ink/50 pl-10 pr-4 text-sm text-paper placeholder:text-muted/60 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
          />
        </div>
      </div>

      {/* Resultados */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-lg" />)}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data?.data.length ? (
        <EmptyState icon={Trophy} title="Nenhum campeonato encontrado" description="Tente ajustar os filtros de busca." />
      ) : (
        <>
          <p className="text-sm text-muted">{data.total} campeonato{data.total !== 1 ? "s" : ""} encontrado{data.total !== 1 ? "s" : ""}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.data.map((t) => <TournamentCard key={t.id} tournament={t} />)}
          </div>
        </>
      )}
    </div>
  );
}

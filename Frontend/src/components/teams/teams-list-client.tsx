"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { api } from "@/lib/api-client";

interface TeamListItem {
  id: string;
  slug: string;
  name: string;
  tag: string | null;
  logoUrl: string | null;
  _count: { memberships: number };
}

export function TeamsListClient() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  function handleSearch(v: string) {
    setSearch(v);
    clearTimeout((window as Window & { _t?: ReturnType<typeof setTimeout> })._t);
    (window as Window & { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => setDebounced(v), 400);
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["teams", debounced],
    queryFn: () => api.get<{ data: TeamListItem[]; total: number }>("/teams", { search: debounced || undefined, pageSize: 40 }),
  });

  return (
    <div className="space-y-6">
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          placeholder="Buscar equipe…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-ink/50 pl-10 pr-4 text-sm text-paper placeholder:text-muted/60 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data?.data.length ? (
        <EmptyState icon={Users} title="Nenhuma equipe encontrada" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.data.map((t) => (
            <Link
              key={t.id}
              href={`/teams/${t.slug}`}
              className="card-ecl flex items-center gap-4 p-4 transition-colors hover:border-gold/40"
            >
              <Avatar name={t.name} src={t.logoUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-semibold uppercase tracking-tight text-paper">{t.name}</p>
                {t.tag && <p className="text-xs text-muted">{t.tag}</p>}
                <p className="text-xs text-muted">{t._count.memberships} membro{t._count.memberships !== 1 ? "s" : ""}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

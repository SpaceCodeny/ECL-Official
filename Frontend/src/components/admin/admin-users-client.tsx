"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Ban, CheckCircle2, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { adminService, type AdminUser } from "@/services/admin.service";
import { useAuthStore } from "@/stores/auth.store";
import { formatDate, cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMINISTRATOR: "Administrador",
  TOURNAMENT_ORGANIZER: "Organizador",
  REFEREE: "Árbitro",
  TEAM_CAPTAIN: "Capitão",
  PLAYER: "Jogador",
  VISITOR: "Visitante",
};

const roleVariant: Record<string, "gold" | "neutral" | "success"> = {
  SUPER_ADMIN: "gold",
  ADMINISTRATOR: "gold",
  TOURNAMENT_ORGANIZER: "neutral",
  REFEREE: "neutral",
  TEAM_CAPTAIN: "success",
  PLAYER: "success",
  VISITOR: "neutral",
};

export function AdminUsersClient() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  function handleSearch(v: string) {
    setSearch(v);
    clearTimeout((window as Window & { _t?: ReturnType<typeof setTimeout> })._t);
    (window as Window & { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => setDebounced(v), 400);
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-users", debounced],
    queryFn: () => adminService.listUsers({ search: debounced || undefined, pageSize: 50 }),
  });

  const suspendMutation = useMutation({
    mutationFn: (userId: string) => adminService.suspendUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const reactivateMutation = useMutation({
    mutationFn: (userId: string) => adminService.reactivateUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-paper">Usuários</h1>
        <p className="mt-1 text-sm text-muted">Gerencie contas, papéis e permissões.</p>
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          placeholder="Buscar usuário…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-ink/50 pl-10 pr-4 text-sm text-paper placeholder:text-muted/60 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data?.data.length ? (
        <EmptyState icon={Shield} title="Nenhum usuário encontrado" />
      ) : (
        <div className="card-ecl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-widest text-muted">
                <th className="py-3 pl-4 text-left">Usuário</th>
                <th className="hidden py-3 text-left md:table-cell">Papel</th>
                <th className="hidden py-3 text-center sm:table-cell">Status</th>
                <th className="hidden py-3 text-center lg:table-cell">Cadastrado</th>
                <th className="py-3 pr-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((u: AdminUser) => (
                <tr key={u.id} className="border-b border-border/50 last:border-0 transition-colors hover:bg-surfaceHover">
                  <td className="py-3 pl-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.displayName} src={null} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-paper">{u.displayName}</p>
                        <p className="truncate text-xs text-muted">@{u.username} · {u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden py-3 md:table-cell">
                    <Badge variant={roleVariant[u.role]}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                  </td>
                  <td className="hidden py-3 text-center sm:table-cell">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-medium uppercase",
                      u.status === "ACTIVE" ? "text-emerald-400" : "text-amber-400",
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", u.status === "ACTIVE" ? "bg-emerald-400" : "bg-amber-400")} />
                      {u.status === "ACTIVE" ? "Ativo" : "Suspenso"}
                    </span>
                  </td>
                  <td className="hidden py-3 text-center text-muted lg:table-cell">{formatDate(u.createdAt)}</td>
                  <td className="py-3 pr-4 text-right">
                    {u.id === currentUser?.id ? (
                      <span className="text-xs text-muted">Você</span>
                    ) : u.status === "ACTIVE" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => suspendMutation.mutate(u.id)}
                        disabled={suspendMutation.isPending}
                      >
                        <Ban className="h-3.5 w-3.5" /> Suspender
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => reactivateMutation.mutate(u.id)}
                        disabled={reactivateMutation.isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Reativar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

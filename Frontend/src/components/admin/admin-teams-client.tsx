"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Plus, Users, Eye, Crown, UserPlus,
  Trash2, UserMinus, Search, ChevronDown, ChevronUp,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Modal } from "@/components/ui/modal";
import { CreateTeamForm } from "./create-team-form";
import { api } from "@/lib/api-client";
import { formatDate, cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;  // membershipId
  role: string;
  player: {
    id: string;
    user: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
  };
}

interface AdminTeam {
  id: string;
  slug: string;
  name: string;
  tag: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  captainId: string;
  memberships: TeamMember[];
  _count: { memberships: number };
}

interface UserOption {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  playerProfile: { id: string } | null;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AdminTeamsClient() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  function handleSearch(v: string) {
    setSearch(v);
    clearTimeout((window as Window & { _st?: ReturnType<typeof setTimeout> })._st);
    (window as Window & { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => setDebounced(v), 350);
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-teams", debounced],
    queryFn: () =>
      api.get<{ data: AdminTeam[]; total: number }>("/teams", {
        search: debounced || undefined,
        pageSize: 50,
        active: undefined, // lista todas (ativas e inativas)
      }),
  });

  const teams = data?.data ?? [];

  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-paper">
            Equipes
          </h1>
          <p className="mt-1 text-sm text-muted">
            A liga controla quem participa — crie e gerencie equipes diretamente.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Nova equipe
        </Button>
      </div>

      {/* ── Busca ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          type="search"
          placeholder="Buscar equipe ou tag…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-ink/50 pl-10 pr-4 text-sm text-paper placeholder:text-muted/60 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
        />
      </div>

      {/* ── Lista ── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhuma equipe cadastrada"
          description="Clique em 'Nova equipe' para criar a primeira equipe da liga."
          action={
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Criar equipe
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {teams.map((team) => (
            <TeamRow
              key={team.id}
              team={team}
              expanded={expandedTeam === team.id}
              onToggle={() =>
                setExpandedTeam((prev) => (prev === team.id ? null : team.id))
              }
              onMemberRemoved={() =>
                queryClient.invalidateQueries({ queryKey: ["admin-teams"] })
              }
            />
          ))}
        </div>
      )}

      {/* ── Modal de criação ── */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nova equipe"
        description="Crie uma equipe e selecione os usuários que farão parte dela."
        size="lg"
      >
        <CreateTeamForm
          onSuccess={() => setShowCreate(false)}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>
    </div>
  );
}

// ─── Linha de equipe com painel expansível de membros ─────────────────────────

function TeamRow({
  team,
  expanded,
  onToggle,
  onMemberRemoved,
}: {
  team: AdminTeam;
  expanded: boolean;
  onToggle: () => void;
  onMemberRemoved: () => void;
}) {
  const queryClient = useQueryClient();
  const [showAddMember, setShowAddMember] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [debouncedUserSearch, setDebouncedUserSearch] = useState("");

  function handleUserSearch(v: string) {
    setUserSearch(v);
    clearTimeout((window as Window & { _ut2?: ReturnType<typeof setTimeout> })._ut2);
    (window as Window & { _ut2?: ReturnType<typeof setTimeout> })._ut2 = setTimeout(
      () => setDebouncedUserSearch(v),
      350,
    );
  }

  // Busca os membros completos quando expande
  const { data: teamDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["admin-team-detail", team.slug],
    queryFn: () => api.get<AdminTeam>(`/teams/${team.slug}`),
    enabled: expanded,
  });

  const memberships: TeamMember[] = teamDetail?.memberships ?? [];

  const { data: usersData, isFetching: fetchingUsers } = useQuery({
    queryKey: ["admin-users-add-member", debouncedUserSearch],
    queryFn: () =>
      api.get<{ data: UserOption[] }>("/admin/users", {
        search: debouncedUserSearch || undefined,
        pageSize: 20,
        status: "ACTIVE",
      }),
    enabled: showAddMember,
  });

  const removeMutation = useMutation({
    mutationFn: (membershipId: string) =>
      api.delete(`/teams/${team.id}/members/${membershipId}`, true),
    onSuccess: () => {
      onMemberRemoved();
      queryClient.invalidateQueries({ queryKey: ["admin-team-detail", team.slug] });
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
    },
  });

  const addMutation = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/teams/${team.id}/members`, { userId, role: "PLAYER" }, true),
    onSuccess: () => {
      setShowAddMember(false);
      setUserSearch("");
      queryClient.invalidateQueries({ queryKey: ["admin-team-detail", team.slug] });
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
    },
  });

  const memberUserIds = new Set(memberships.map((m) => m.player.user.id));

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-border/80">
      {/* ── Linha principal ── */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <Avatar name={team.name} src={team.logoUrl} size="md" className="shrink-0" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display font-bold uppercase tracking-tight text-paper">
              {team.name}
            </span>
            {team.tag && (
              <span className="rounded bg-gold/10 px-1.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest text-gold">
                {team.tag}
              </span>
            )}
            {!team.isActive && <Badge variant="neutral">Inativa</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            Criada em {formatDate(team.createdAt)} ·{" "}
            <span className="text-paper">{team._count.memberships}</span> membro
            {team._count.memberships !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/teams/${team.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted transition-colors hover:border-gold/40 hover:text-gold"
            title="Ver equipe no site"
          >
            <Eye className="h-3.5 w-3.5" />
          </Link>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted" />
          )}
        </div>
      </button>

      {/* ── Painel expandido: membros ── */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">
              Elenco ({memberships.length})
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddMember((v) => !v)}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Adicionar membro
            </Button>
          </div>

          {/* Painel de adição de membro */}
          {showAddMember && (
            <div className="mb-4 rounded-lg border border-gold/20 bg-gold/5 p-4 space-y-3">
              <p className="text-xs font-medium text-paper">
                Buscar usuário para adicionar como membro
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  type="search"
                  placeholder="Nome, usuário ou e-mail…"
                  value={userSearch}
                  onChange={(e) => handleUserSearch(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-ink/50 pl-9 pr-4 text-sm text-paper placeholder:text-muted/60 focus:border-gold/50 focus:outline-none"
                />
              </div>

              <div className="max-h-48 overflow-y-auto rounded-md border border-border divide-y divide-border/50">
                {fetchingUsers ? (
                  <div className="flex items-center justify-center py-4">
                    <span className="text-xs text-muted">Buscando…</span>
                  </div>
                ) : (usersData?.data ?? []).length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted">
                    {debouncedUserSearch ? "Nenhum usuário encontrado" : "Digite para buscar"}
                  </p>
                ) : (
                  (usersData?.data ?? []).map((u) => {
                    const alreadyMember = memberUserIds.has(u.id);
                    return (
                      <div
                        key={u.id}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5",
                          alreadyMember ? "opacity-50" : "hover:bg-surface",
                        )}
                      >
                        <Avatar name={u.displayName} src={u.avatarUrl} size="sm" className="shrink-0 h-7 w-7" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-paper">
                            {u.displayName}
                          </p>
                          <p className="text-[10px] text-muted">@{u.username}</p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={alreadyMember || addMutation.isPending}
                          onClick={() => !alreadyMember && addMutation.mutate(u.id)}
                          className="h-7 px-2 text-[10px]"
                        >
                          {alreadyMember ? "Já membro" : "Adicionar"}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Lista de membros */}
          {loadingDetail ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-surfaceHover" />
              ))}
            </div>
          ) : memberships.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">
              Nenhum membro cadastrado.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {memberships.map((m) => {
                const isCaptain = m.role === "CAPTAIN";
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                      isCaptain ? "border-gold/30 bg-gold/5" : "border-border bg-ink/30",
                    )}
                  >
                    <Avatar
                      name={m.player.user.displayName}
                      src={m.player.user.avatarUrl}
                      size="sm"
                      className="shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-paper">
                        {m.player.user.displayName}
                      </p>
                      <p className="text-[10px] text-muted">
                        @{m.player.user.username}
                      </p>
                    </div>
                    {isCaptain ? (
                      <span title="Capitão" className="shrink-0">
                        <Crown className="h-3.5 w-3.5 text-gold" aria-label="Capitão" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        title="Remover membro"
                        onClick={() => removeMutation.mutate(m.id)}
                        disabled={removeMutation.isPending}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-40"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Users, Archive, CheckCircle2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Modal } from "@/components/ui/modal";
import { CreatePlayerForm } from "./create-player-form";
import { PlayerDetailPanel } from "./player-detail-panel";
import { playersService } from "@/services/players.service";
import { formatDate, cn } from "@/lib/utils";
import type { PlayerListItem } from "@/types/player";

// ─── Filtros de status ────────────────────────────────────────────────────────

const STATUS_TABS = [
  { label: "Todos", value: "" },
  { label: "Ativos", value: "ACTIVE" },
  { label: "Banco", value: "BENCH" },
];

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMINISTRATOR: "Admin",
  TOURNAMENT_ORGANIZER: "Organizador",
  REFEREE: "Árbitro",
  TEAM_CAPTAIN: "Capitão",
  PLAYER: "Jogador",
  VISITOR: "Visitante",
};

// ─── Componente principal ─────────────────────────────────────────────────────

export function AdminPlayersClient() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  function handleSearch(v: string) {
    setSearch(v);
    clearTimeout((window as Window & { _pt?: ReturnType<typeof setTimeout> })._pt);
    (window as Window & { _pt?: ReturnType<typeof setTimeout> })._pt = setTimeout(
      () => setDebounced(v),
      380,
    );
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-players", debounced, statusFilter],
    queryFn: () =>
      playersService.list({
        search: debounced || undefined,
        status: statusFilter || undefined,
        pageSize: 50,
      }),
  });

  const players = data?.data ?? [];

  return (
    <div className="flex h-full gap-0">
      {/* ── Coluna principal ── */}
      <div className={cn("flex flex-col space-y-5 transition-all", selectedUserId ? "w-full lg:w-1/2 xl:w-3/5" : "w-full")}>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-paper">Jogadores</h1>
            <p className="mt-1 text-sm text-muted">
              Crie contas, gerencie perfis e controle transferências.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Novo jogador
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="search"
              placeholder="Buscar por nome, usuário ou e-mail…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-ink/50 pl-10 pr-4 text-sm text-paper placeholder:text-muted/60 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
            />
          </div>
          <div className="flex gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors",
                  statusFilter === tab.value
                    ? "border-gold/60 bg-gold/15 text-gold"
                    : "border-border text-muted hover:text-paper",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : players.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum jogador encontrado"
            description={debounced ? `Sem resultados para "${debounced}".` : "Crie o primeiro jogador clicando em 'Novo jogador'."}
            action={
              <Button variant="primary" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" /> Criar jogador
              </Button>
            }
          />
        ) : (
          <div className="card-ecl overflow-hidden">
            {/* Header da tabela */}
            <div className="hidden items-center gap-3 border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-muted sm:flex">
              <span className="w-8">#</span>
              <span className="flex-1">Jogador</span>
              <span className="w-28 text-center">Status</span>
              <span className="hidden w-36 text-left lg:block">Time atual</span>
              <span className="w-20 text-right">Cadastro</span>
            </div>

            {players.map((player, i) => (
              <PlayerRow
                key={player.id}
                player={player}
                index={i + 1}
                selected={selectedUserId === player.id}
                onSelect={() =>
                  setSelectedUserId((prev) => (prev === player.id ? null : player.id))
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Painel lateral de detalhe ── */}
      {selectedUserId && (
        <div className="hidden lg:flex w-1/2 xl:w-2/5 flex-col border-l border-border bg-surface/50">
          <PlayerDetailPanel
            userId={selectedUserId}
            onClose={() => setSelectedUserId(null)}
          />
        </div>
      )}

      {/* Modal de detalhe no mobile */}
      <Modal
        open={Boolean(selectedUserId)}
        onClose={() => setSelectedUserId(null)}
        title="Jogador"
        size="lg"
      >
        <div className="lg:hidden" style={{ minHeight: 480 }}>
          {selectedUserId && (
            <PlayerDetailPanel
              userId={selectedUserId}
              onClose={() => setSelectedUserId(null)}
            />
          )}
        </div>
      </Modal>

      {/* Modal de criação */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Novo jogador"
        description="Crie a conta de login e o perfil do jogador."
        size="md"
      >
        <CreatePlayerForm
          onSuccess={() => setShowCreate(false)}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>
    </div>
  );
}

// ─── Linha da tabela ──────────────────────────────────────────────────────────

function PlayerRow({
  player,
  index,
  selected,
  onSelect,
}: {
  player: PlayerListItem;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const profile = player.playerProfile;
  const isBench = profile?.status === "BENCH" || !profile;
  const currentTeam = profile?.memberships[0]?.team ?? null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left text-sm transition-colors last:border-0",
        selected ? "bg-gold/5 border-l-2 border-l-gold" : "hover:bg-surfaceHover",
      )}
    >
      {/* Índice */}
      <span className="hidden w-8 shrink-0 font-display text-xs font-bold text-muted/50 sm:block">
        {String(index).padStart(2, "0")}
      </span>

      {/* Jogador */}
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <Avatar name={player.displayName} src={player.avatarUrl} size="sm" className="shrink-0" />
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold uppercase tracking-tight text-paper">
            {player.displayName}
          </p>
          <p className="truncate text-xs text-muted">@{player.username}</p>
        </div>
      </div>

      {/* Status */}
      <div className="hidden w-28 shrink-0 justify-center sm:flex">
        {isBench ? (
          <Badge variant="warning" className="text-[10px]">
            <Archive className="h-3 w-3" /> Banco
          </Badge>
        ) : (
          <Badge variant="success" className="text-[10px]">
            <CheckCircle2 className="h-3 w-3" /> Ativo
          </Badge>
        )}
      </div>

      {/* Time atual */}
      <div className="hidden w-36 shrink-0 lg:block">
        {currentTeam ? (
          <span className="truncate text-xs text-paper">
            {currentTeam.name}
            {currentTeam.tag && (
              <span className="ml-1 text-gold/70">({currentTeam.tag})</span>
            )}
          </span>
        ) : (
          <span className="text-xs text-muted/50">Sem time</span>
        )}
      </div>

      {/* Data */}
      <span className="hidden w-20 shrink-0 text-right text-xs text-muted sm:block">
        {formatDate(player.createdAt)}
      </span>
    </button>
  );
}

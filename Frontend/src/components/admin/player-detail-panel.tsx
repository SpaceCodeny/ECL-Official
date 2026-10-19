"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X, ArrowRightLeft, Archive, Clock, ChevronDown, Users,
  Gamepad2,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { TransferConfirmModal } from "./transfer-confirm-modal";
import { playersService } from "@/services/players.service";
import { api } from "@/lib/api-client";
import { FetchError } from "@/lib/api-client";
import { formatDate, formatDateTime, cn } from "@/lib/utils";
import type { TransferConflict } from "@/types/player";

interface TeamOption {
  id: string;
  name: string;
  tag: string | null;
}

interface Props {
  userId: string;
  onClose: () => void;
}

export function PlayerDetailPanel({ userId, onClose }: Props) {
  const queryClient = useQueryClient();
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [conflict, setConflict] = useState<TransferConflict | null>(null);
  const [pendingAction, setPendingAction] = useState<"transfer" | "bench" | null>(null);

  const { data: player, isLoading } = useQuery({
    queryKey: ["admin-player-detail", userId],
    queryFn: () => playersService.detail(userId),
  });

  const { data: teamsData } = useQuery({
    queryKey: ["teams-for-transfer"],
    queryFn: () => api.get<{ data: TeamOption[] }>("/teams", { pageSize: 50 }),
  });

  const mutation = useMutation({
    mutationFn: ({ toTeamId, force }: { toTeamId: string | null; force: boolean }) =>
      playersService.transfer(userId, toTeamId, force),
    onSuccess: () => {
      setConflict(null);
      setPendingAction(null);
      setShowTransfer(false);
      setSelectedTeamId("");
      queryClient.invalidateQueries({ queryKey: ["admin-player-detail", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-players"] });
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
    },
    onError: (err) => {
      if (err instanceof FetchError && err.status === 409) {
        try {
          const body = JSON.parse(err.message) as TransferConflict;
          if (body.code === "PLAYER_IN_TEAM") {
            setConflict(body);
            return;
          }
        } catch { /* não é JSON — mostra mensagem normal */ }
      }
    },
  });

  function handleTransferSubmit() {
    if (!selectedTeamId) return;
    mutation.mutate({ toTeamId: selectedTeamId, force: false });
  }

  function handleBench() {
    setPendingAction("bench");
    mutation.mutate({ toTeamId: null, force: false });
  }

  function handleForceConfirm() {
    if (pendingAction === "bench" || (conflict && !selectedTeamId)) {
      mutation.mutate({ toTeamId: null, force: true });
    } else {
      mutation.mutate({ toTeamId: selectedTeamId, force: true });
    }
  }

  if (isLoading || !player) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between border-b border-border p-5">
          <p className="font-display text-lg font-bold uppercase text-paper">Carregando…</p>
          <button onClick={onClose} className="text-muted hover:text-paper"><X className="h-5 w-5" /></button>
        </div>
        <LoadingState className="flex-1" />
      </div>
    );
  }

  const profile = player.playerProfile;
  const activeMembership = profile?.memberships[0] ?? null;
  const currentTeam = activeMembership?.team ?? null;
  const teams: TeamOption[] = teamsData?.data ?? [];
  const isBench = profile?.status === "BENCH";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Cabeçalho ── */}
      <div className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div className="flex items-center gap-4">
          <Avatar name={player.displayName} src={player.avatarUrl} size="lg" className="shrink-0" />
          <div>
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-paper">
              {player.displayName}
            </h2>
            <p className="text-sm text-muted">@{player.username} · {player.email}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge variant={isBench ? "warning" : "success"}>
                {isBench ? "Banco" : "Ativo"}
              </Badge>
              {currentTeam && (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Users className="h-3 w-3" />
                  {currentTeam.name}
                  {currentTeam.tag && <span className="text-gold/70">({currentTeam.tag})</span>}
                </span>
              )}
              {profile?.standoffId && (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Gamepad2 className="h-3 w-3" /> ID: {profile.standoffId}
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted hover:text-paper">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── Ações de movimentação ── */}
      <div className="border-b border-border p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">Movimentação</p>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          {/* Seletor de time */}
          <div className="relative flex-1">
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="h-10 w-full appearance-none rounded-md border border-border bg-ink/50 pl-3 pr-8 text-sm text-paper focus:border-gold/50 focus:outline-none"
            >
              <option value="">Selecione um time para transferir…</option>
              {teams
                .filter((t) => t.id !== currentTeam?.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.tag ? ` (${t.tag})` : ""}
                  </option>
                ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-muted" />
          </div>

          <Button
            variant="primary"
            size="md"
            disabled={!selectedTeamId || mutation.isPending}
            onClick={handleTransferSubmit}
          >
            <ArrowRightLeft className="h-4 w-4" />
            Transferir
          </Button>

          <Button
            variant="secondary"
            size="md"
            disabled={isBench || mutation.isPending}
            onClick={handleBench}
          >
            <Archive className="h-4 w-4" />
            Banco
          </Button>
        </div>

        {mutation.isError && !conflict && (
          <p className="text-xs text-red-400">
            {mutation.error instanceof Error ? mutation.error.message : "Erro na movimentação"}
          </p>
        )}
      </div>

      {/* ── Histórico de transferências ── */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
          <Clock className="h-3.5 w-3.5" />
          Histórico ({player.transferHistory.length})
        </p>

        {player.transferHistory.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Sem histórico de movimentações.</p>
        ) : (
          <ol className="relative border-l border-border pl-5 space-y-4">
            {player.transferHistory.map((h, i) => (
              <li key={h.id} className="relative">
                {/* Bolinha da timeline */}
                <span
                  className={cn(
                    "absolute -left-[21px] flex h-3.5 w-3.5 items-center justify-center rounded-full border-2",
                    i === 0
                      ? "border-gold bg-gold/20"
                      : "border-border bg-ink",
                  )}
                />
                <div className="rounded-lg border border-border/50 bg-ink/30 px-4 py-3">
                  <p className="text-sm text-paper">{h.description}</p>
                  <p className="mt-1 text-xs text-muted">{formatDateTime(h.createdAt)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ── Modal de confirmação de conflito ── */}
      <TransferConfirmModal
        open={Boolean(conflict)}
        conflict={conflict}
        playerName={player.displayName}
        targetTeamName={teams.find((t) => t.id === selectedTeamId)?.name ?? null}
        onConfirm={handleForceConfirm}
        onCancel={() => { setConflict(null); setPendingAction(null); }}
        isPending={mutation.isPending}
      />
    </div>
  );
}

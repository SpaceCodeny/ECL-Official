"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Map, X, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { STANDOFF_MAPS } from "@/components/matches/map-pool";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// DECIDER não pede time — é o último mapa restante automaticamente
type Action = "PICKED" | "BANNED" | "DECIDER";

interface ManageMapsModalProps {
  open: boolean;
  onClose: () => void;
  matchId: string;
  seriesFormat: string;
  teamA: { id: string; name: string };
  teamB: { id: string; name: string };
  currentMaps?: { mapName: string; action?: string | null; actionTeamId?: string | null }[];
}

const MAPS_PLAYED: Record<string, number> = { BO1: 1, BO3: 3, BO5: 5 };

// Regras de picks/bans por formato:
// BO1: 6 bans, 1 decider (último restante, sem time)
// BO3: 2 picks de cada time (4 picks), 1 decider
// BO5: 2 picks de cada, 1 decider
const FORMAT_RULES: Record<string, string> = {
  BO1: "6 bans · 1 decider (último restante)",
  BO3: "2 picks por time · 1 decider · 1 ban de cada",
  BO5: "2 picks por time · 1 decider",
};

export function ManageMapsModal({
  open,
  onClose,
  matchId,
  seriesFormat,
  teamA,
  teamB,
  currentMaps = [],
}: ManageMapsModalProps) {
  const queryClient = useQueryClient();
  const mapsPlayed = MAPS_PLAYED[seriesFormat] ?? 3;

  type MapState = { action: Action; teamId: string | null } | null;

  const [mapStates, setMapStates] = useState<Record<string, MapState>>(() => {
    const init: Record<string, MapState> = {};
    STANDOFF_MAPS.forEach((m) => { init[m.name] = null; });
    currentMaps.forEach((m) => {
      if (m.action) {
        init[m.mapName] = {
          action: m.action as Action,
          // DECIDER não tem team
          teamId: m.action === "DECIDER" ? null : (m.actionTeamId ?? null),
        };
      }
    });
    return init;
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<Action>("BANNED");
  const [pendingTeam, setPendingTeam] = useState<string>(teamA.id);

  const saveMutation = useMutation({
    mutationFn: () => {
      // Ordena: bans primeiro, picks depois, decider por último
      const order = { BANNED: 0, PICKED: 1, DECIDER: 2 };
      const entries = Object.entries(mapStates)
        .filter(([, v]) => v !== null)
        .sort(([, a], [, b]) => (order[a!.action] ?? 3) - (order[b!.action] ?? 3))
        .map(([name, v], idx) => ({
          mapName: name,
          order: idx + 1,
          action: v!.action,
          // DECIDER: sem actionTeamId
          actionTeamId: v!.action === "DECIDER" ? null : (v!.teamId ?? null),
        }));
      return api.put(`/matches/${matchId}/maps`, entries, true);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      onClose();
    },
  });

  function applyAction(mapName: string) {
    setMapStates((prev) => ({
      ...prev,
      [mapName]: {
        action: pendingAction,
        teamId: pendingAction === "DECIDER" ? null : pendingTeam,
      },
    }));
    setSelected(null);
  }

  function clearAction(mapName: string) {
    setMapStates((prev) => ({ ...prev, [mapName]: null }));
  }

  const pickedCount  = Object.values(mapStates).filter((v) => v?.action === "PICKED").length;
  const bannedCount  = Object.values(mapStates).filter((v) => v?.action === "BANNED").length;
  const deciderCount = Object.values(mapStates).filter((v) => v?.action === "DECIDER").length;

  const ACTION_STYLE: Record<Action, { border: string; badge: string; label: string }> = {
    PICKED:  { border: "border-emerald-500/50 bg-emerald-500/10", badge: "bg-emerald-700 text-white", label: "PICK" },
    BANNED:  { border: "border-red-500/50 bg-red-500/10",         badge: "bg-red-800 text-white",     label: "BAN"  },
    DECIDER: { border: "border-gold/40 bg-gold/5",                badge: "bg-gold/30 text-gold",      label: "DECIDER" },
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Definir Mapas"
      description={FORMAT_RULES[seriesFormat] ?? `${seriesFormat} · ${mapsPlayed} mapas jogados`}
      size="lg"
    >
      <div className="space-y-5">

        {/* Contadores */}
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-400">
            <Check className="h-3 w-3" /> {pickedCount} picks
          </span>
          <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-red-400">
            <X className="h-3 w-3" /> {bannedCount} bans
          </span>
          <span className="flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-1 text-gold">
            ◆ {deciderCount} decider
          </span>
        </div>

        {/* Grid de mapas */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STANDOFF_MAPS.map((map) => {
            const state = mapStates[map.name];
            const style = state ? ACTION_STYLE[state.action] : null;
            const isSelected = selected === map.name;

            return (
              <button
                key={map.name}
                type="button"
                onClick={() => setSelected(isSelected ? null : map.name)}
                className={cn(
                  "relative overflow-hidden rounded-xl border transition-all text-left",
                  isSelected && "ring-2 ring-gold/60 ring-offset-1 ring-offset-surface",
                  style ? style.border : "border-border hover:border-gold/30",
                )}
              >
                {/* Foto */}
                <div className="relative h-16 w-full sm:h-20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={map.image}
                    alt={map.name}
                    className={cn(
                      "h-full w-full object-cover",
                      state?.action === "BANNED" && "brightness-30 grayscale",
                    )}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                  {/* Badge */}
                  {state && (
                    <div className={cn(
                      "absolute right-1.5 top-1.5 rounded px-1.5 py-px text-[9px] font-bold uppercase",
                      style?.badge,
                    )}>
                      {ACTION_STYLE[state.action].label}
                    </div>
                  )}

                  {/* Nome */}
                  <p className="absolute bottom-1.5 left-2 font-display text-[10px] font-bold uppercase text-white drop-shadow">
                    {map.name}
                  </p>
                </div>

                {/* Time abaixo */}
                <div className="px-2 py-1 text-[10px] text-muted truncate text-center min-h-[22px]">
                  {state?.action === "DECIDER"
                    ? <span className="font-bold uppercase tracking-wide text-blue-400">DECIDER</span>
                    : state?.teamId
                    ? (state.teamId === teamA.id ? teamA.name : teamB.name)
                    : ""}
                </div>
              </button>
            );
          })}
        </div>

        {/* Painel de configuração */}
        {selected && (
          <div className="space-y-4 rounded-xl border border-gold/30 bg-gold/5 p-4">
            <p className="font-display text-sm font-bold uppercase text-gold">
              {selected}
            </p>

            {/* Ação */}
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">Ação</p>
              <div className="flex gap-2">
                {(["PICKED", "BANNED", "DECIDER"] as Action[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setPendingAction(a)}
                    className={cn(
                      "flex-1 rounded-lg border px-2 py-2 text-[11px] font-bold uppercase transition-all",
                      pendingAction === a
                        ? ACTION_STYLE[a].border
                        : "border-border text-muted hover:text-paper",
                    )}
                  >
                    {ACTION_STYLE[a].label}
                  </button>
                ))}
              </div>

              {/* Aviso DECIDER */}
              {pendingAction === "DECIDER" && (
                <p className="mt-2 text-[10px] text-gold/70">
                  ◆ Decider é o último mapa restante — não pertence a nenhum time.
                </p>
              )}
            </div>

            {/* Seleção de time — apenas para PICK e BAN */}
            {pendingAction !== "DECIDER" && (
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">
                  Time que {pendingAction === "BANNED" ? "baniu" : "escolheu"}
                </p>
                <div className="flex gap-2">
                  {[teamA, teamB].map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setPendingTeam(team.id)}
                      className={cn(
                        "flex-1 truncate rounded-lg border px-2 py-2 text-[11px] font-semibold uppercase transition-all",
                        pendingTeam === team.id
                          ? "border-gold/60 bg-gold/10 text-gold"
                          : "border-border text-muted hover:text-paper",
                      )}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-2">
              <Button variant="primary" size="sm" className="flex-1" onClick={() => applyAction(selected)}>
                <Check className="h-3.5 w-3.5" /> Aplicar
              </Button>
              {mapStates[selected] && (
                <Button variant="secondary" size="sm" onClick={() => clearAction(selected)}>
                  <X className="h-3.5 w-3.5" /> Remover
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Salvar */}
        <div className="flex gap-3 border-t border-border pt-4">
          <Button variant="secondary" size="md" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
              : <Map className="h-4 w-4" />
            }
            {saveMutation.isPending ? "Salvando…" : "Salvar Mapas"}
          </Button>
        </div>

        {saveMutation.isError && (
          <p className="text-center text-xs text-red-400">Erro ao salvar. Tente novamente.</p>
        )}
      </div>
    </Modal>
  );
}

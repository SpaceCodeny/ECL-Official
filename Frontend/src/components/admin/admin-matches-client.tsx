"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gamepad2, Plus, Play, Trophy, Radio, CheckCircle2, Map, Check, Swords, Copy, ExternalLink, CheckCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { CreateMatchForm } from "./create-match-form";
import { ManageMapsModal } from "./manage-maps-modal";
import { ErrorState } from "@/components/ui/error-state";
import { api } from "@/lib/api-client";
import { formatDateTime, cn } from "@/lib/utils";

interface MatchListItem {
  id: string; status: string; scheduledAt: string | null;
  scoreA: number | null; scoreB: number | null; seriesFormat: string;
  teamA: { id: string; name: string; tag: string | null; logoUrl: string | null };
  teamB: { id: string; name: string; tag: string | null; logoUrl: string | null };
  stage: { name: string; tournament?: { id: string; name: string } };
  maps?: { mapName: string; action?: string | null; actionTeamId?: string | null }[];
}

type FullMatchDetail = {
  id: string; status: string; seriesFormat: string;
  scoreA: number | null; scoreB: number | null;
  teamA: { id: string; name: string; tag: string | null; logoUrl: string | null };
  teamB: { id: string; name: string; tag: string | null; logoUrl: string | null };
  maps: { id: string; mapName: string; order: number; action: string | null;
    scoreA: number | null; scoreB: number | null; winnerId: string | null; played: boolean }[];
};

function useMatchDetail(matchId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["match-admin", matchId],
    queryFn: () => api.get<FullMatchDetail>(`/matches/${matchId}`),
    enabled,
    refetchInterval: (q) => {
      const d = q.state.data;
      return d && (d.status === "LIVE" || d.status === "AWAITING_RESULT") ? 5000 : false;
    },
  });
}

function ManageMatchModal({ match: initialMatch, open, onClose }: {
  match: MatchListItem; open: boolean; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: fullMatch } = useMatchDetail(initialMatch.id, open);
  const teamA = fullMatch?.teamA ?? initialMatch.teamA;
  const teamB = fullMatch?.teamB ?? initialMatch.teamB;
  const playableMaps = (fullMatch?.maps ?? [])
    .filter((m) => m.action === "PICKED" || m.action === "DECIDER")
    .sort((a, b) => a.order - b.order);
  const serieA = playableMaps.filter((m) => m.played && m.winnerId === teamA.id).length;
  const serieB = playableMaps.filter((m) => m.played && m.winnerId === teamB.id).length;
  const sA = fullMatch?.scoreA ?? initialMatch.scoreA ?? 0;
  const sB = fullMatch?.scoreB ?? initialMatch.scoreB ?? 0;
  const maxToWin = initialMatch.seriesFormat === "BO1" ? 1 : initialMatch.seriesFormat === "BO3" ? 2 : 3;
  const serieDecided = serieA >= maxToWin || serieB >= maxToWin;
  const [roundsInput, setRoundsInput] = useState<Record<string, { rA: string; rB: string }>>({});
  const [winnerId, setWinnerId] = useState("");
  const status = fullMatch?.status ?? initialMatch.status;
  const canStart = status === "SCHEDULED" || status === "READY";
  const isLive = status === "LIVE" || status === "AWAITING_RESULT";
  const isCompleted = status === "COMPLETED";

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
    void queryClient.invalidateQueries({ queryKey: ["match-admin", initialMatch.id] });
    void queryClient.invalidateQueries({ queryKey: ["match", initialMatch.id] });
  };

  const startMutation = useMutation({
    mutationFn: () => api.patch(`/matches/${initialMatch.id}/status`, { status: "LIVE" }, true),
    onSuccess: () => invalidate(),
  });

  const mapRoundsMutation = useMutation({
    mutationFn: ({ mapId, rA, rB }: { mapId: string; rA: number; rB: number }) =>
      api.patch(`/matches/${initialMatch.id}/maps/${mapId}`, { scoreA: rA, scoreB: rB }, true),
    onSuccess: async () => {
      invalidate();
      const updated = await queryClient.fetchQuery({
        queryKey: ["match-refresh-" + initialMatch.id],
        queryFn: () => api.get<FullMatchDetail>(`/matches/${initialMatch.id}`),
        staleTime: 0,
      });
      if (updated) {
        const newA = updated.maps.filter((m) => (m.action === "PICKED" || m.action === "DECIDER") && m.played && m.winnerId === updated.teamA.id).length;
        const newB = updated.maps.filter((m) => (m.action === "PICKED" || m.action === "DECIDER") && m.played && m.winnerId === updated.teamB.id).length;
        void api.patch(`/matches/${initialMatch.id}/score`, { scoreA: newA, scoreB: newB }, true).then(() => invalidate());
      }
    },
  });

  const resultMutation = useMutation({
    mutationFn: ({ winner }: { winner: string }) =>
      api.post(`/matches/${initialMatch.id}/result`, { scoreA: serieA, scoreB: serieB, winnerTeamId: winner }, true),
    onSuccess: () => { invalidate(); onClose(); },
  });

  function getRounds(mapId: string, field: "rA" | "rB", fallback: number | null | undefined) {
    return roundsInput[mapId]?.[field] ?? String(fallback ?? "");
  }
  function setRound(mapId: string, field: "rA" | "rB", val: string) {
    setRoundsInput((prev) => ({ ...prev, [mapId]: { rA: prev[mapId]?.rA ?? "", rB: prev[mapId]?.rB ?? "", [field]: val } }));
  }
  function saveMapRounds(mapId: string) {
    const rA = parseInt(getRounds(mapId, "rA", 0) as string, 10);
    const rB = parseInt(getRounds(mapId, "rB", 0) as string, 10);
    if (!isNaN(rA) && !isNaN(rB)) mapRoundsMutation.mutate({ mapId, rA, rB });
  }

  const statusLabel: Record<string, { label: string; color: string }> = {
    SCHEDULED: { label: "Agendada", color: "text-muted" },
    READY: { label: "Pronta", color: "text-blue-400" },
    LIVE: { label: "Ao Vivo", color: "text-red-400" },
    AWAITING_RESULT: { label: "Ag. Resultado", color: "text-yellow-400" },
    COMPLETED: { label: "Finalizada", color: "text-emerald-400" },
    CANCELLED: { label: "Cancelada", color: "text-muted" },
  };
  const st = statusLabel[status] ?? { label: status, color: "text-muted" };

  return (
    <Modal open={open} onClose={onClose} title="Gerenciar Partida"
      description={`${initialMatch.stage?.tournament?.name ?? "Campeonato"} · ${initialMatch.stage?.name ?? ""}`} size="md">
      <div className="space-y-5">
        {/* Times + placar série */}
        <div className="flex items-center justify-between gap-2 rounded-xl bg-ink/60 px-3 py-4 sm:gap-4 sm:px-5">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <Avatar name={teamA.name} src={teamA.logoUrl} size="md" />
            <p className="w-full truncate text-center font-display text-xs font-bold uppercase text-paper sm:text-sm">{teamA.name}</p>
            {teamA.tag && <p className="text-[10px] text-muted">{teamA.tag}</p>}
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1">
            <span className="font-display text-3xl font-bold tabular-nums text-paper sm:text-4xl">
              {sA} <span className="text-muted">:</span> {sB}
            </span>
            <span className="rounded bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">{initialMatch.seriesFormat}</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <Avatar name={teamB.name} src={teamB.logoUrl} size="md" />
            <p className="w-full truncate text-center font-display text-xs font-bold uppercase text-paper sm:text-sm">{teamB.name}</p>
            {teamB.tag && <p className="text-[10px] text-muted">{teamB.tag}</p>}
          </div>
        </div>
        {/* Status */}
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/40 px-4 py-2.5">
          <span className="text-xs uppercase tracking-widest text-muted">Status</span>
          <span className={cn("flex items-center gap-1.5 text-sm font-bold", st.color)}>
            {status === "LIVE" && <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />}
            {st.label}
          </span>
        </div>
        {/* Iniciar */}
        {canStart && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-blue-400"><Play className="h-4 w-4" /> Iniciar Partida</p>
            <p className="mb-4 text-xs text-muted">Marca como AO VIVO e zera o placar para 0 : 0.</p>
            <Button variant="secondary" size="md" className="w-full border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
              onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
              {startMutation.isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" /> : <Radio className="h-4 w-4" />}
              {startMutation.isPending ? "Iniciando…" : "Iniciar → AO VIVO"}
            </Button>
            {startMutation.isError && <p className="mt-2 text-xs text-red-400">Erro ao iniciar.</p>}
          </div>
        )}
        {/* Resultado por mapa */}
        {isLive && playableMaps.length > 0 && (
          <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-red-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" /> Resultado por Mapa (rounds 0–13)
            </p>
            {playableMaps.map((m, idx) => {
              const isDecider = m.action === "DECIDER";
              const deciderUnused = isDecider && serieDecided && !m.played;
              const rA = getRounds(m.id, "rA", m.scoreA);
              const rB = getRounds(m.id, "rB", m.scoreB);
              const isSaving = mapRoundsMutation.isPending && mapRoundsMutation.variables?.mapId === m.id;
              return (
                <div key={m.id} className={cn(
                  "rounded-lg border p-3",
                  m.played ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/60 bg-ink/30",
                  deciderUnused && "opacity-40",
                )}>
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/images/maps/${m.mapName.toLowerCase().replace("prison", "prision")}.png`}
                        alt={m.mapName} className="h-7 w-10 shrink-0 rounded object-cover" />
                      <span className="font-display text-xs font-bold uppercase text-paper">Mapa {idx + 1} — {m.mapName}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {isDecider && <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white">DECIDER</span>}
                      {m.played && <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">✓</span>}
                    </div>
                  </div>
                  {!deciderUnused && (
                    <div className="flex items-center gap-2">
                      <div className="flex flex-1 flex-col items-center gap-1">
                        <span className="max-w-full truncate text-[9px] uppercase tracking-wide text-muted">{teamA.name}</span>
                        <input type="number" min={0} max={13} value={rA}
                          onChange={(e) => setRound(m.id, "rA", e.target.value)} placeholder="0"
                          className="h-10 w-full rounded-lg border border-border bg-ink text-center font-display text-xl font-bold text-paper focus:border-gold/50 focus:outline-none" />
                      </div>
                      <span className="mt-4 font-display text-lg text-muted">:</span>
                      <div className="flex flex-1 flex-col items-center gap-1">
                        <span className="max-w-full truncate text-[9px] uppercase tracking-wide text-muted">{teamB.name}</span>
                        <input type="number" min={0} max={13} value={rB}
                          onChange={(e) => setRound(m.id, "rB", e.target.value)} placeholder="0"
                          className="h-10 w-full rounded-lg border border-border bg-ink text-center font-display text-xl font-bold text-paper focus:border-gold/50 focus:outline-none" />
                      </div>
                      <Button variant="secondary" size="sm" className="mt-4 shrink-0"
                        onClick={() => saveMapRounds(m.id)} disabled={isSaving || rA === "" || rB === ""}>
                        {isSaving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted border-t-transparent" /> : <Check className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  )}
                  {m.played && m.scoreA !== null && m.scoreB !== null && (
                    <p className="mt-1.5 text-center text-[10px] text-muted">
                      Registrado: <span className={m.scoreA > m.scoreB ? "font-bold text-emerald-400" : "text-red-400"}>{m.scoreA}</span>
                      {" : "}
                      <span className={m.scoreB > m.scoreA ? "font-bold text-emerald-400" : "text-red-400"}>{m.scoreB}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {isLive && playableMaps.length === 0 && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
            <p className="text-xs text-yellow-400">⚠ Nenhum mapa definido. Use o botão "Mapas" para definir picks/bans.</p>
          </div>
        )}
        {/* Finalizar série */}
        {isLive && (
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold"><Trophy className="h-4 w-4" /> Finalizar Série</p>
            <p className="mb-3 text-[11px] text-muted">Placar calculado: <strong className="text-paper">{serieA} × {serieB}</strong> ({initialMatch.seriesFormat})</p>
            <div className="mb-4 flex gap-2">
              {[teamA, teamB].map((team) => {
                const isAuto = serieA !== serieB ? (serieA > serieB ? teamA.id : teamB.id) === team.id : false;
                const selected = isAuto || winnerId === team.id;
                return (
                  <button key={team.id} type="button" onClick={() => setWinnerId(team.id)}
                    className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-semibold uppercase transition-all",
                      selected ? "border-gold/60 bg-gold/10 text-gold" : "border-border text-muted hover:text-paper")}>
                    {selected && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate">{team.name}</span>
                  </button>
                );
              })}
            </div>
            <Button variant="primary" size="md" className="w-full"
              onClick={() => {
                const w = serieA !== serieB ? (serieA > serieB ? teamA.id : teamB.id) : winnerId;
                if (!w) return;
                resultMutation.mutate({ winner: w });
              }}
              disabled={resultMutation.isPending || (serieA === serieB && !winnerId)}>
              {resultMutation.isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent" /> : <Trophy className="h-4 w-4" />}
              {resultMutation.isPending ? "Salvando…" : "Salvar e Finalizar"}
            </Button>
            {resultMutation.isError && <p className="mt-2 text-xs text-red-400">Erro ao registrar.</p>}
          </div>
        )}
        {isCompleted && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-4 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-semibold">Resultado registrado — {sA} : {sB}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Modal de Picks & Bans ────────────────────────────────────────────────────

function PicksBansModal({ match, open, onClose }: { match: MatchListItem; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionLink, setSessionLink] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<"pending" | "in_progress" | "completed">("pending");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Ao abrir, verificar se já há sessão concluída para esta partida
  useEffect(() => {
    if (!open) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      setSessionId(null);
      setSessionLink(null);
      setSessionStatus("pending");
      setError(null);
      return;
    }
    // Checar status atual ao abrir
    const checkExisting = async () => {
      setChecking(true);
      try {
        const data = await api.get<{ status: string; sessionId?: string }>(`/matches/${match.id}/picks-bans-status`);
        if (data.status === "COMPLETED" || data.status === "TERMINATED") {
          setSessionStatus("completed");
        } else if (data.status === "IN_PROGRESS") {
          // Retomar link se já existia sessão ativa
          setSessionStatus("in_progress");
          startPolling();
        }
      } catch { /* sem sessão ainda — estado pending */ }
      finally { setChecking(false); }
    };
    void checkExisting();
  }, [open]);

  // Polling via proxy do backend ECL para detectar conclusão
  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        // Usa a API da ECL como proxy — não precisa expor URL do picks-and-bans no frontend
        const data = await api.get<{ status: string }>(`/matches/${match.id}/picks-bans-status`);
        if (data.status === "COMPLETED" || data.status === "TERMINATED") {
          setSessionStatus("completed");
          clearInterval(pollingRef.current!);
          // Invalidar cache para o card de mapas atualizar automaticamente
          void queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
          void queryClient.invalidateQueries({ queryKey: ["match-admin", match.id] });
          void queryClient.invalidateQueries({ queryKey: ["match", match.id] });
        }
      } catch { /* silencioso */ }
    }, 3000);
  };

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<{ sessionId: string; sessionLink: string; alreadyExists: boolean }>(
        `/matches/${match.id}/picks-bans`,
        {},
        true,
      );
      setSessionId(data.sessionId);
      setSessionLink(data.sessionLink);
      setSessionStatus("in_progress");
      startPolling();
    } catch (e: any) {
      setError(e?.message ?? "Erro ao gerar sessão de picks & bans");
    } finally {
      setLoading(false);
    }
  };

  const resetAndGenerate = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setSessionId(null);
    setSessionLink(null);
    setSessionStatus("pending");
    setError(null);
    generate();
  };

  const copyLink = async () => {
    if (!sessionLink) return;
    await navigator.clipboard.writeText(sessionLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={open} onClose={onClose} title="Picks & Bans" description={`${match.teamA.name} vs ${match.teamB.name} · ${match.seriesFormat}`} size="sm">
      <div className="space-y-5">
        {/* Times */}
        <div className="flex items-center justify-center gap-4 rounded-xl bg-ink/60 px-4 py-4">
          <div className="flex flex-col items-center gap-1.5">
            <Avatar name={match.teamA.name} src={match.teamA.logoUrl} size="md" />
            <p className="text-xs font-bold text-paper truncate max-w-[80px] text-center">{match.teamA.name}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Swords className="h-5 w-5 text-gold" />
            <span className="text-[10px] uppercase tracking-widest text-muted">{match.seriesFormat}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Avatar name={match.teamB.name} src={match.teamB.logoUrl} size="md" />
            <p className="text-xs font-bold text-paper truncate max-w-[80px] text-center">{match.teamB.name}</p>
          </div>
        </div>

        {/* Verificando estado inicial */}
        {checking && (
          <div className="flex items-center justify-center py-8 gap-3 text-gray-400">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#f59e0b]/30 border-t-[#f59e0b]" />
            <span className="text-sm">Verificando sessão...</span>
          </div>
        )}

        {/* Estado: INICIAL — sem sessão */}
        {!checking && sessionStatus === "pending" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-3 text-xs text-muted space-y-1.5">
              <p className="font-semibold text-paper">Como funciona:</p>
              <p>1. Gere o link abaixo</p>
              <p>2. Envie para os líderes de cada time</p>
              <p>3. Os jogadores realizam os picks & bans em tempo real</p>
              <p>4. Ao concluir, os mapas são salvos automaticamente ✅</p>
            </div>
            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}
            <Button variant="primary" size="md" className="w-full" onClick={generate} disabled={loading}>
              {loading
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                : <Swords className="h-4 w-4" />}
              {loading ? "Gerando…" : "Gerar Link de Picks & Bans"}
            </Button>
          </div>
        )}

        {/* Estado: EM ANDAMENTO — aguardando picks & bans */}
        {!checking && sessionStatus === "in_progress" && sessionLink && (
          <div className="space-y-3">
            {/* Link */}
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                  Sessão ativa — aguardando picks & bans
                </span>
              </div>
              <p className="break-all text-[11px] text-muted">{sessionLink}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={copyLink}>
                {copied ? <CheckCheck className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copiado!" : "Copiar Link"}
              </Button>
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => window.open(sessionLink, "_blank")}>
                <ExternalLink className="h-3.5 w-3.5" /> Abrir
              </Button>
            </div>
            <p className="text-center text-[10px] text-muted">
              Monitorando a sessão automaticamente a cada 3 segundos…
            </p>
          </div>
        )}

        {/* Estado: CONCLUÍDO — picks & bans finalizados */}
        {!checking && sessionStatus === "completed" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-green-400">Picks & Bans concluídos!</p>
              <p className="text-xs text-muted mt-1">
                Os mapas foram salvos automaticamente na partida.
              </p>
            </div>
            <div className="rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-2.5 text-center">
              <p className="text-[11px] text-muted">
                Verifique a aba <strong className="text-paper">Mapas</strong> da partida — os picks e bans já estão registrados.
              </p>
            </div>
            {/* Gerar nova sessão */}
            <Button variant="secondary" size="md" className="w-full" onClick={resetAndGenerate} disabled={loading}>
              {loading
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-transparent" />
                : <Swords className="h-4 w-4" />}
              {loading ? "Gerando…" : "Gerar Nova Sessão"}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Lista principal ──────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { label: "A Jogar", value: "SCHEDULED,READY,LIVE,AWAITING_RESULT" },
  { label: "Finalizadas", value: "COMPLETED" },
  { label: "Todas", value: "" },
];
const STATUS_VARIANT: Record<string, "live" | "success" | "warning" | "neutral"> = {
  SCHEDULED: "neutral", READY: "warning", LIVE: "live",
  AWAITING_RESULT: "warning", COMPLETED: "success", CANCELLED: "neutral",
};
const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendada", READY: "Pronta", LIVE: "Ao Vivo",
  AWAITING_RESULT: "Ag. Resultado", COMPLETED: "Finalizada", CANCELLED: "Cancelada",
};

export function AdminMatchesClient() {
  const [filter, setFilter] = useState("SCHEDULED,READY,LIVE,AWAITING_RESULT");
  const [showCreate, setShowCreate] = useState(false);
  const [managing, setManaging] = useState<MatchListItem | null>(null);
  const [managingMaps, setManagingMaps] = useState<MatchListItem | null>(null);
  const [picksBans, setPicksBans] = useState<MatchListItem | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-matches", filter],
    queryFn: () => api.get<{ data: MatchListItem[] }>(`/matches?status=${filter}&limit=100`),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-paper">Partidas</h1>
          <p className="mt-1 text-sm text-muted">Gerencie partidas e registre resultados.</p>
        </div>
        <Button variant="primary" size="md" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Nova partida
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors",
              filter === f.value ? "border-gold/60 bg-gold/15 text-gold" : "border-border text-muted hover:text-paper")}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data?.data.length ? (
        <EmptyState icon={Gamepad2} title="Nenhuma partida" description="As partidas aparecerão aqui quando criadas." />
      ) : (
        <div className="space-y-3">
          {data.data.map((m) => (
            <div key={m.id}
              className={cn("card-ecl cursor-pointer p-4 transition-all hover:border-gold/30", m.status === "LIVE" && "border-red-500/40 bg-red-500/5")}
              onClick={() => setManaging(m)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setManaging(m)}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted">{m.stage?.tournament?.name ?? "—"} · {m.stage?.name ?? "—"}</span>
                <Badge variant={STATUS_VARIANT[m.status] ?? "neutral"}>
                  {m.status === "LIVE" && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />}
                  {STATUS_LABEL[m.status] ?? m.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Avatar name={m.teamA.name} src={m.teamA.logoUrl} size="sm" />
                  <span className="truncate text-sm font-semibold text-paper">{m.teamA.name}</span>
                </div>
                <span className="shrink-0 font-display text-base font-bold text-paper">
                  {m.status === "COMPLETED" ? `${m.scoreA ?? 0} : ${m.scoreB ?? 0}` : "VS"}
                </span>
                <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-2">
                  <Avatar name={m.teamB.name} src={m.teamB.logoUrl} size="sm" />
                  <span className="truncate text-right text-sm font-semibold text-paper">{m.teamB.name}</span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
                <span>{m.scheduledAt ? formatDateTime(m.scheduledAt) : "Sem horário"}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={(e) => { e.stopPropagation(); setManagingMaps(m); }}
                    className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] text-muted transition-colors hover:border-gold/40 hover:text-gold">
                    <Map className="h-3 w-3" /> Mapas
                  </button>
                  {(m.status === "SCHEDULED" || m.status === "READY" || m.status === "LIVE") && (
                    (() => {
                      // Verifica se já há mapas com picks definidos (sessão concluída)
                      const hasPicks = m.maps && m.maps.some(mp => mp.action === "PICKED" || mp.action === "DECIDER");
                      return hasPicks ? (
                        <span className="flex items-center gap-1 rounded border border-green-500/40 bg-green-500/5 px-2 py-1 text-[10px] text-green-400 cursor-default">
                          <CheckCircle2 className="h-3 w-3" /> P&B Realizado
                        </span>
                      ) : (
                        <button type="button" onClick={(e) => { e.stopPropagation(); setPicksBans(m); }}
                          className="flex items-center gap-1 rounded border border-[#f59e0b]/40 bg-[#f59e0b]/5 px-2 py-1 text-[10px] text-[#f59e0b] transition-colors hover:bg-[#f59e0b]/15">
                          <Swords className="h-3 w-3" /> Picks & Bans
                        </button>
                      );
                    })()
                  )}
                  {(m.status === "SCHEDULED" || m.status === "READY" || m.status === "LIVE" || m.status === "AWAITING_RESULT") && (
                    <span className="text-gold/70">Clique para gerenciar →</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nova partida" description="Configure o confronto entre duas equipes." size="lg">
        <CreateMatchForm onSuccess={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
      </Modal>

      {managing && <ManageMatchModal match={managing} open={Boolean(managing)} onClose={() => setManaging(null)} />}

      {managingMaps && (
        <ManageMapsModal open={Boolean(managingMaps)} onClose={() => setManagingMaps(null)}
          matchId={managingMaps.id} seriesFormat={managingMaps.seriesFormat}
          teamA={managingMaps.teamA} teamB={managingMaps.teamB} currentMaps={managingMaps.maps} />
      )}

      {picksBans && (
        <PicksBansModal match={picksBans} open={Boolean(picksBans)} onClose={() => setPicksBans(null)} />
      )}
    </div>
  );
}

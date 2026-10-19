"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gamepad2, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { CreateMatchForm } from "./create-match-form";
import { ErrorState } from "@/components/ui/error-state";
import { api } from "@/lib/api-client";
import { formatDateTime, cn } from "@/lib/utils";

interface MatchListItem {
  id: string;
  status: string;
  scheduledAt: string | null;
  scoreA: number | null;
  scoreB: number | null;
  teamA: { id: string; name: string; tag: string | null; logoUrl: string | null };
  teamB: { id: string; name: string; tag: string | null; logoUrl: string | null };
  stage: { name: string; tournament: { id: string; name: string } };
}

export function AdminMatchesClient() {
  const [filter, setFilter] = useState("SCHEDULED,AWAITING_RESULT");
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-matches", filter],
    queryFn: () => api.get<{ data: MatchListItem[] }>(`/matches?status=${filter}&pageSize=50`),
  });

  const resultMutation = useMutation({
    mutationFn: ({ matchId, scoreA, scoreB }: { matchId: string; scoreA: number; scoreB: number }) =>
      api.post(`/matches/${matchId}/results`, { scoreA, scoreB }, true),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-matches"] }),
  });

  const filters = [
    { label: "Agendadas", value: "SCHEDULED" },
    { label: "Aguardando resultado", value: "AWAITING_RESULT" },
    { label: "Disputadas", value: "DISPUTED" },
    { label: "Todas", value: "" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-paper">Partidas</h1>
          <p className="mt-1 text-sm text-muted">Crie partidas e registre resultados.</p>
        </div>
        <Button variant="primary" size="md" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Nova partida
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors",
              filter === f.value ? "border-gold/60 bg-gold/15 text-gold" : "border-border text-muted hover:text-paper",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data?.data.length ? (
        <EmptyState icon={Gamepad2} title="Nenhuma partida" description="As partidas aparecerão aqui quando criadas." />
      ) : (
        <div className="space-y-3">
          {data.data.map((m) => (
            <div key={m.id} className="card-ecl p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-muted">{m.stage.tournament.name} · {m.stage.name}</span>
                <Badge variant="neutral">{m.status}</Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar name={m.teamA.name} src={m.teamA.logoUrl} size="sm" />
                  <span className="truncate text-sm font-medium text-paper">{m.teamA.name}</span>
                </div>
                <span className="font-display text-lg font-bold text-paper">{m.scoreA ?? 0} : {m.scoreB ?? 0}</span>
                <div className="flex items-center gap-2 justify-end min-w-0">
                  <span className="truncate text-sm font-medium text-paper">{m.teamB.name}</span>
                  <Avatar name={m.teamB.name} src={m.teamB.logoUrl} size="sm" />
                </div>
              </div>
              <div className="mt-2 text-xs text-muted">
                {m.scheduledAt ? formatDateTime(m.scheduledAt) : "Sem horário"}
              </div>
              {(m.status === "SCHEDULED" || m.status === "AWAITING_RESULT" || m.status === "LIVE") && (
                <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                  <span className="text-xs text-muted">Resultado rápido:</span>
                  <Button variant="secondary" size="sm" onClick={() => {
                    const a = Number(prompt(`Vitórias ${m.teamA.name} (BO3: 0-2)`));
                    const b = Number(prompt(`Vitórias ${m.teamB.name} (BO3: 0-2)`));
                    if (!Number.isNaN(a) && !Number.isNaN(b)) resultMutation.mutate({ matchId: m.id, scoreA: a, scoreB: b });
                  }}>Registrar</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de criação de partida */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nova partida"
        description="Configure o confronto entre duas equipes."
        size="lg"
      >
        <CreateMatchForm
          onSuccess={() => setShowCreate(false)}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>
    </div>
  );
}

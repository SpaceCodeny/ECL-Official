"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, ClipboardList, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { api } from "@/lib/api-client";
import { formatDate, cn } from "@/lib/utils";

interface TournamentOption {
  id: string;
  name: string;
  status: string;
}

interface Registration {
  id: string;
  status: string;
  submittedAt: string;
  team: {
    id: string;
    slug: string;
    name: string;
    tag: string | null;
    logoUrl: string | null;
  };
}

const STATUS_FILTERS = [
  { label: "Todas", value: "" },
  { label: "Pendentes", value: "PENDING" },
  { label: "Aprovadas", value: "APPROVED" },
  { label: "Rejeitadas", value: "REJECTED" },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
  WITHDRAWN: "Retirada",
};

const STATUS_VARIANT: Record<string, "warning" | "success" | "neutral" | "live"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "neutral",
  WITHDRAWN: "neutral",
};

export function AdminRegistrationsClient() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState("");

  // Lista de todos os campeonatos para o seletor
  const { data: tournamentsData, isLoading: loadingTournaments } = useQuery({
    queryKey: ["admin-tournaments-for-reg"],
    queryFn: () =>
      api.get<{ data: TournamentOption[] }>("/tournaments", { pageSize: 50 }),
  });

  const tournaments: TournamentOption[] = tournamentsData?.data ?? [];

  // Seleciona o primeiro automaticamente quando carregado
  useEffect(() => {
    if (!selectedId && tournaments.length > 0 && tournaments[0]) {
      setSelectedId(tournaments[0].id);
    }
  }, [tournaments, selectedId]);

  const activeTournamentId = selectedId || tournaments[0]?.id;
  const activeTournamentName = tournaments.find((t: TournamentOption) => t.id === activeTournamentId)?.name;

  // Inscrições do campeonato selecionado
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-registrations", activeTournamentId, statusFilter],
    queryFn: () =>
      api.get<Registration[]>(
        `/tournaments/${activeTournamentId}/registrations`,
        statusFilter ? { status: statusFilter } : undefined,
      ),
    enabled: Boolean(activeTournamentId),
  });

  const approveMutation = useMutation({
    mutationFn: (regId: string) =>
      api.post(
        `/tournaments/${activeTournamentId}/registrations/${regId}/approve`,
        undefined,
        true,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["admin-registrations", activeTournamentId],
      }),
  });

  const rejectMutation = useMutation({
    mutationFn: (regId: string) =>
      api.post(
        `/tournaments/${activeTournamentId}/registrations/${regId}/reject`,
        undefined,
        true,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["admin-registrations", activeTournamentId],
      }),
  });

  const registrations = data ?? [];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-paper">
          Inscrições
        </h1>
        <p className="mt-1 text-sm text-muted">
          Aprove ou rejeite inscrições de equipes nos campeonatos.
        </p>
      </div>

      {/* Seletor de campeonato + filtro de status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Dropdown de campeonato */}
        <div className="relative">
          <select
            value={activeTournamentId ?? ""}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={loadingTournaments}
            className="h-10 w-full appearance-none rounded-md border border-border bg-ink/50 pl-3 pr-9 text-sm text-paper focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30 sm:w-72"
          >
            {loadingTournaments ? (
              <option>Carregando…</option>
            ) : tournaments.length === 0 ? (
              <option>Nenhum campeonato</option>
            ) : (
              tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))
            )}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </div>

        {/* Filtros de status */}
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
      </div>

      {/* Nome do campeonato selecionado */}
      {activeTournamentName && (
        <p className="text-sm text-muted">
          Exibindo inscrições de:{" "}
          <span className="font-medium text-paper">{activeTournamentName}</span>
        </p>
      )}

      {/* Lista de inscrições */}
      {!activeTournamentId ? (
        <EmptyState icon={ClipboardList} title="Nenhum campeonato disponível" />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : registrations.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma inscrição encontrada"
          description={
            statusFilter
              ? "Sem inscrições com este status."
              : "As inscrições aparecerão aqui quando enviadas pelas equipes."
          }
        />
      ) : (
        <div className="card-ecl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-widest text-muted">
                <th className="py-3 pl-4 text-left">Equipe</th>
                <th className="hidden py-3 text-center sm:table-cell">Status</th>
                <th className="hidden py-3 text-center md:table-cell">Enviada em</th>
                <th className="py-3 pr-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg) => (
                <tr
                  key={reg.id}
                  className="border-b border-border/50 last:border-0 transition-colors hover:bg-surfaceHover"
                >
                  <td className="py-3 pl-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={reg.team.name} src={reg.team.logoUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-display font-semibold uppercase tracking-tight text-paper">
                          {reg.team.name}
                        </p>
                        {reg.team.tag && (
                          <p className="text-xs text-muted">{reg.team.tag}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="hidden py-3 text-center sm:table-cell">
                    <Badge variant={STATUS_VARIANT[reg.status] ?? "neutral"}>
                      {STATUS_LABEL[reg.status] ?? reg.status}
                    </Badge>
                  </td>

                  <td className="hidden py-3 text-center text-muted md:table-cell">
                    {formatDate(reg.submittedAt)}
                  </td>

                  <td className="py-3 pr-4">
                    <div className="flex items-center justify-end gap-2">
                      {reg.status === "PENDING" ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => approveMutation.mutate(reg.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Aprovar</span>
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => rejectMutation.mutate(reg.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <X className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Rejeitar</span>
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted/60">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totais */}
          <div className="border-t border-border px-4 py-3 text-xs text-muted">
            {registrations.length} inscrição{registrations.length !== 1 ? "ões" : ""} exibida{registrations.length !== 1 ? "s" : ""}
            {" · "}
            {registrations.filter((r) => r.status === "PENDING").length} pendente{registrations.filter((r) => r.status === "PENDING").length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}

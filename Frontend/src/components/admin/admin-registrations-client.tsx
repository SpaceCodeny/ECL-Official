"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { api } from "@/lib/api-client";

interface Registration {
  id: string;
  status: string;
  submittedAt: string;
  team: { id: string; slug: string; name: string; tag: string | null; logoUrl: string | null };
  tournament: { id: string; name: string; slug: string };
}

export function AdminRegistrationsClient() {
  const queryClient = useQueryClient();

  // Lista torneios para selecionar
  const { data: tournaments } = useQuery({
    queryKey: ["admin-tournaments-for-reg"],
    queryFn: () => api.get<{ data: { id: string; name: string }[] }>("/tournaments", { pageSize: 50 }),
  });

  const selectedTournamentId = tournaments?.data[0]?.id;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-registrations", selectedTournamentId],
    queryFn: () => api.get<Registration[]>(`/tournaments/${selectedTournamentId}/registrations`),
    enabled: Boolean(selectedTournamentId),
  });

  const approveMutation = useMutation({
    mutationFn: (regId: string) => api.post(`/tournaments/${selectedTournamentId}/registrations/${regId}/approve`, undefined, true),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-registrations", selectedTournamentId] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (regId: string) => api.post(`/tournaments/${selectedTournamentId}/registrations/${regId}/reject`, undefined, true),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-registrations", selectedTournamentId] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-paper">Inscrições</h1>
        <p className="mt-1 text-sm text-muted">Aprove ou rejeite inscrições pendentes.</p>
      </div>

      {!selectedTournamentId ? (
        <EmptyState icon={ClipboardList} title="Nenhum campeonato disponível" />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data?.length ? (
        <EmptyState icon={ClipboardList} title="Nenhuma inscrição" description="As inscrições aparecerão aqui quando enviadas." />
      ) : (
        <div className="space-y-2">
          {data.map((reg) => (
            <div key={reg.id} className="card-ecl flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={reg.team.name} src={reg.team.logoUrl} size="md" />
                <div>
                  <p className="font-display font-semibold uppercase tracking-tight text-paper">{reg.team.name}</p>
                  <p className="text-xs text-muted">{reg.tournament.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={reg.status === "PENDING" ? "warning" : reg.status === "APPROVED" ? "success" : "neutral"}>
                  {reg.status === "PENDING" ? "Pendente" : reg.status === "APPROVED" ? "Aprovada" : reg.status === "REJECTED" ? "Rejeitada" : "Retirada"}
                </Badge>
                {reg.status === "PENDING" && (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => approveMutation.mutate(reg.id)} disabled={approveMutation.isPending}>
                      <Check className="h-3.5 w-3.5" /> Aprovar
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => rejectMutation.mutate(reg.id)} disabled={rejectMutation.isPending}>
                      <X className="h-3.5 w-3.5" /> Rejeitar
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

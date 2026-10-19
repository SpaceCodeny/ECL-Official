"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Trophy, Plus, Eye, LockOpen, Lock,
  Play, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Modal } from "@/components/ui/modal";
import { TournamentStatusBadge } from "@/components/tournaments/status-badge";
import { CreateTournamentForm } from "./create-tournament-form";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { TournamentListItem } from "@/types/tournament";

export function AdminTournamentsClient() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-tournaments"],
    queryFn: () => api.get<{ data: TournamentListItem[] }>("/tournaments", { pageSize: 50 }),
  });

  const transitionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.post(`/tournaments/${id}/${action}`, undefined, true),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-tournaments"] }),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.post(`/tournaments/${id}/publish`, undefined, true),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-tournaments"] }),
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-paper">Campeonatos</h1>
          <p className="mt-1 text-sm text-muted">Crie, gerencie e controle o fluxo dos campeonatos.</p>
        </div>
        <Button variant="primary" size="md" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Novo campeonato
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data?.data.length ? (
        <EmptyState
          icon={Trophy}
          title="Nenhum campeonato"
          description="Clique em 'Novo campeonato' para criar o primeiro."
          action={
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Criar campeonato
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((t) => (
            <div key={t.id} className="card-ecl flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-base font-bold uppercase tracking-tight text-paper">{t.name}</h3>
                  <p className="text-xs text-muted">{t.season}</p>
                </div>
                <TournamentStatusBadge status={t.status} />
              </div>

              <p className="text-sm text-muted">
                {t.registeredTeams}/{t.maxTeams} equipes
                {t.startDate ? ` · ${formatDate(t.startDate)}` : ""}
              </p>

              {/* Ações */}
              <div className="flex flex-wrap gap-1.5">
                <Link href={`/tournaments/${t.slug}`}>
                  <Button variant="secondary" size="sm">
                    <Eye className="h-3.5 w-3.5" /> Ver
                  </Button>
                </Link>

                {t.status === "DRAFT" && (
                  <Button variant="ghost" size="sm" onClick={() => publishMutation.mutate(t.id)} disabled={publishMutation.isPending}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Publicar
                  </Button>
                )}
                {t.status === "PUBLISHED" && (
                  <Button variant="ghost" size="sm" onClick={() => transitionMutation.mutate({ id: t.id, action: "open-registrations" })} disabled={transitionMutation.isPending}>
                    <LockOpen className="h-3.5 w-3.5" /> Abrir inscr.
                  </Button>
                )}
                {t.status === "REGISTRATION_OPEN" && (
                  <Button variant="ghost" size="sm" onClick={() => transitionMutation.mutate({ id: t.id, action: "close-registrations" })} disabled={transitionMutation.isPending}>
                    <Lock className="h-3.5 w-3.5" /> Fechar inscr.
                  </Button>
                )}
                {t.status === "REGISTRATION_CLOSED" && (
                  <Button variant="ghost" size="sm" onClick={() => transitionMutation.mutate({ id: t.id, action: "start" })} disabled={transitionMutation.isPending}>
                    <Play className="h-3.5 w-3.5" /> Iniciar
                  </Button>
                )}
                {t.status === "IN_PROGRESS" && (
                  <Button variant="ghost" size="sm" onClick={() => transitionMutation.mutate({ id: t.id, action: "complete" })} disabled={transitionMutation.isPending}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Finalizar
                  </Button>
                )}
                {["DRAFT", "PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"].includes(t.status) && (
                  <Button variant="danger" size="sm" onClick={() => transitionMutation.mutate({ id: t.id, action: "cancel" })} disabled={transitionMutation.isPending}>
                    <XCircle className="h-3.5 w-3.5" /> Cancelar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de criação */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Novo campeonato"
        description="Preencha os dados para criar um novo campeonato."
        size="lg"
      >
        <CreateTournamentForm
          onSuccess={() => setShowCreate(false)}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>
    </div>
  );
}

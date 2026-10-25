"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  slug: string;
  tag: string | null;
  logoUrl: string | null;
  description: string | null;
  captainId: string;
}

interface Props {
  tournamentId: string;
  tournamentSlug: string;
}

export function RegisterTeamForm({ tournamentId, tournamentSlug }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());

  // Buscar times
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["teams", search],
    queryFn: () => api.get<{ data: Team[]; pagination: unknown }>(`/teams?limit=100${search ? `&search=${search}` : ""}`),
  });

  // Mutation para inscrever múltiplos times
  const registerMutation = useMutation({
    mutationFn: async (teamIds: string[]) => {
      const results = await Promise.allSettled(
        teamIds.map((teamId) =>
          api.post("/registrations", { teamId, tournamentId }, true)
        )
      );
      
      const successes = results.filter((r) => r.status === "fulfilled").length;
      const failures = results.filter((r) => r.status === "rejected").length;
      
      return { successes, failures, results };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentSlug] });
      
      if (data.failures === 0) {
        router.push(`/tournaments/${tournamentSlug}`);
      }
    },
  });

  const teams = data?.data ?? [];
  const selectedTeams = teams.filter((t) => selectedTeamIds.has(t.id));

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedTeamIds(new Set(teams.map((t) => t.id)));
  };

  const clearSelection = () => {
    setSelectedTeamIds(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Busca e ações em massa */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            type="text"
            placeholder="Buscar time por nome ou tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={selectAll}
            disabled={teams.length === 0}
          >
            Selecionar todos
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            disabled={selectedTeamIds.size === 0}
          >
            Limpar seleção
          </Button>
        </div>
      </div>

      {/* Contador de seleção */}
      {selectedTeamIds.size > 0 && (
        <div className="rounded-lg border border-gold/30 bg-gold/5 px-4 py-2.5">
          <p className="text-sm font-medium text-gold">
            {selectedTeamIds.size} {selectedTeamIds.size === 1 ? "equipe selecionada" : "equipes selecionadas"}
          </p>
        </div>
      )}

      {/* Lista de times */}
      {isLoading ? (
        <LoadingState label="Carregando times..." className="py-12" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum time encontrado"
          description={search ? "Tente ajustar sua busca" : "Nenhum time cadastrado no sistema"}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const isSelected = selectedTeamIds.has(team.id);
            
            return (
              <button
                key={team.id}
                onClick={() => toggleTeam(team.id)}
                className={cn(
                  "group relative rounded-lg border p-4 text-left transition-all",
                  isSelected
                    ? "border-gold bg-gold/5 shadow-lg shadow-gold/20"
                    : "border-border bg-surface hover:border-gold/40 hover:bg-surface/80",
                )}
              >
                {/* Checkmark */}
                {isSelected && (
                  <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-gold">
                    <Check className="h-4 w-4 text-ink" />
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Avatar name={team.name} src={team.logoUrl} size="md" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3
                      className={cn(
                        "truncate font-display text-sm font-bold uppercase tracking-tight transition-colors",
                        isSelected ? "text-gold" : "text-paper group-hover:text-gold",
                      )}
                    >
                      {team.name}
                    </h3>
                    {team.tag && (
                      <p className="text-xs uppercase tracking-wide text-muted">{team.tag}</p>
                    )}
                    {team.description && (
                      <p className="mt-1.5 line-clamp-2 text-xs text-muted/80">{team.description}</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Ações */}
      <div className="flex items-center justify-between border-t border-border pt-6">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(`/tournaments/${tournamentSlug}`)}
          disabled={registerMutation.isPending}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="lg"
          disabled={selectedTeamIds.size === 0 || registerMutation.isPending}
          onClick={() => registerMutation.mutate(Array.from(selectedTeamIds))}
        >
          {registerMutation.isPending
            ? `Inscrevendo ${selectedTeamIds.size}...`
            : `Inscrever ${selectedTeamIds.size} ${selectedTeamIds.size === 1 ? "equipe" : "equipes"}`}
        </Button>
      </div>

      {/* Resumo das seleções */}
      {selectedTeams.length > 0 && (
        <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
            Equipes selecionadas ({selectedTeams.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedTeams.map((team) => (
              <div
                key={team.id}
                className="flex items-center gap-2 rounded-full border border-gold/20 bg-ink/50 px-3 py-1.5"
              >
                <Avatar name={team.name} src={team.logoUrl} size="xs" />
                <span className="text-xs font-medium text-paper">{team.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTeam(team.id);
                  }}
                  className="ml-1 text-muted transition-colors hover:text-red-400"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback de resultado */}
      {registerMutation.isSuccess && registerMutation.data.failures > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <p className="text-sm text-yellow-400">
            ⚠️ {registerMutation.data.successes} equipes inscritas com sucesso, mas {registerMutation.data.failures} falharam.
            Algumas equipes podem já estar inscritas.
          </p>
        </div>
      )}

      {/* Erro */}
      {registerMutation.isError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <p className="text-sm text-red-400">
            {registerMutation.error instanceof Error
              ? registerMutation.error.message
              : "Erro ao inscrever equipes. Tente novamente."}
          </p>
        </div>
      )}
    </div>
  );
}

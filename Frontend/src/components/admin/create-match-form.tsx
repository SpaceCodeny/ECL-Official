"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

const schema = z.object({
  tournamentId: z.string().min(1, "Selecione um campeonato"),
  stageId: z.string().min(1, "Selecione uma fase"),
  teamAId: z.string().min(1, "Selecione a equipe A"),
  teamBId: z.string().min(1, "Selecione a equipe B"),
  seriesFormat: z.enum(["BO1", "BO3", "BO5"]),
  scheduledAt: z.string().optional(),
}).refine((d) => d.teamAId !== d.teamBId, {
  path: ["teamBId"],
  message: "As equipes devem ser diferentes",
});

type FormData = z.infer<typeof schema>;

interface Props { onSuccess: () => void; onCancel: () => void; }

export function CreateMatchForm({ onSuccess, onCancel }: Props) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { seriesFormat: "BO3" },
  });

  const selectedTournamentId = watch("tournamentId");

  const { data: tournamentsData } = useQuery({
    queryKey: ["create-match-tournaments"],
    queryFn: () => api.get<{ data: { id: string; name: string }[] }>("/tournaments", { pageSize: 50 }),
  });

  const { data: teamsData } = useQuery({
    queryKey: ["create-match-teams"],
    queryFn: () => api.get<{ data: { id: string; name: string; tag: string | null }[] }>("/teams", { pageSize: 100 }),
  });

  // Busca fases do torneio selecionado
  const { data: stagesData } = useQuery({
    queryKey: ["create-match-stages", selectedTournamentId],
    queryFn: () => api.get<{ stages: { id: string; name: string; order: number }[] }>(
      `/tournaments/${selectedTournamentId}`,
    ),
    enabled: Boolean(selectedTournamentId),
    select: (d) => (d as { stages?: { id: string; name: string; order: number }[] }).stages ?? [],
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post("/matches", {
      ...data,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : undefined,
    }, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      queryClient.invalidateQueries({ queryKey: ["home", "upcoming-matches"] });
      onSuccess();
    },
  });

  const tournaments = tournamentsData?.data ?? [];
  const teams = teamsData?.data ?? [];
  const stages = stagesData ?? [];

  const selectClass = "h-10 rounded-md border border-border bg-ink/50 px-3 text-sm text-paper focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30";

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">

      {/* Campeonato */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-paper">Campeonato *</label>
        <select {...register("tournamentId")} className={selectClass}>
          <option value="">Selecione…</option>
          {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {errors.tournamentId && <p className="text-xs text-red-400">{errors.tournamentId.message}</p>}
      </div>

      {/* Fase */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-paper">Fase *</label>
        <select {...register("stageId")} className={selectClass} disabled={!selectedTournamentId || stages.length === 0}>
          <option value="">{selectedTournamentId ? "Selecione a fase…" : "Selecione um campeonato primeiro"}</option>
          {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {errors.stageId && <p className="text-xs text-red-400">{errors.stageId.message}</p>}
      </div>

      {/* Equipes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-paper">Equipe A *</label>
          <select {...register("teamAId")} className={selectClass}>
            <option value="">Selecione…</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}{t.tag ? ` (${t.tag})` : ""}</option>)}
          </select>
          {errors.teamAId && <p className="text-xs text-red-400">{errors.teamAId.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-paper">Equipe B *</label>
          <select {...register("teamBId")} className={selectClass}>
            <option value="">Selecione…</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}{t.tag ? ` (${t.tag})` : ""}</option>)}
          </select>
          {errors.teamBId && <p className="text-xs text-red-400">{errors.teamBId.message}</p>}
        </div>
      </div>

      {/* Série + Data */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-paper">Série *</label>
          <select {...register("seriesFormat")} className={selectClass}>
            <option value="BO1">BO1 — Melhor de 1</option>
            <option value="BO3">BO3 — Melhor de 3</option>
            <option value="BO5">BO5 — Melhor de 5</option>
          </select>
        </div>
        <Input {...register("scheduledAt")} type="datetime-local" label="Data e hora" />
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-400">
          {mutation.error instanceof Error ? mutation.error.message : "Erro ao criar partida"}
        </p>
      )}

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={mutation.isPending}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Criando…" : "Criar partida"}
        </Button>
      </div>
    </form>
  );
}

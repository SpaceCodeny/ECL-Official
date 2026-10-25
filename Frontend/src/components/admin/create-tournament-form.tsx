"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

const schema = z.object({
  name: z.string().min(3, "Mínimo 3 caracteres").max(80),
  season: z.string().min(2, "Informe a temporada"),
  description: z.string().optional(),
  format: z.enum(["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION", "ROUND_ROBIN", "GROUP_STAGE_PLAYOFFS"]),
  seriesFormat: z.enum(["BO1", "BO3", "BO5"]),
  maxTeams: z.coerce.number().min(2).max(128),
  startDate: z.string().optional(),
  registrationDeadline: z.string().optional(),
  prizePool: z.string().optional(),
  rules: z.string().optional(),
  autoApprove: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const FORMAT_OPTIONS = [
  { value: "GROUP_STAGE_PLAYOFFS", label: "Grupos + Playoffs" },
  { value: "SINGLE_ELIMINATION", label: "Eliminação Simples" },
  { value: "DOUBLE_ELIMINATION", label: "Eliminação Dupla" },
  { value: "ROUND_ROBIN", label: "Points Race (Round Robin)" },
];

const SERIES_OPTIONS = [
  { value: "BO1", label: "BO1 — Melhor de 1" },
  { value: "BO3", label: "BO3 — Melhor de 3" },
  { value: "BO5", label: "BO5 — Melhor de 5" },
];

export function CreateTournamentForm({ onSuccess, onCancel }: Props) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { format: "GROUP_STAGE_PLAYOFFS", seriesFormat: "BO3", maxTeams: 16, autoApprove: true },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      // Converter datas de YYYY-MM-DD para ISO datetime
      const payload = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate + "T00:00:00").toISOString() : undefined,
        registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline + "T23:59:59").toISOString() : undefined,
      };
      return api.post("/tournaments", payload, true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["home", "tournaments"] });
      onSuccess();
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input {...register("name")} label="Nome *" placeholder="ECL Season 2" error={errors.name?.message} />
        <Input {...register("season")} label="Temporada *" placeholder="Temporada 2" error={errors.season?.message} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Formato */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-paper">Formato *</label>
          <select {...register("format")} className="h-10 rounded-md border border-border bg-ink/50 px-3 text-sm text-paper focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30">
            {FORMAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Série */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-paper">Série padrão *</label>
          <select {...register("seriesFormat")} className="h-10 rounded-md border border-border bg-ink/50 px-3 text-sm text-paper focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30">
            {SERIES_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input {...register("maxTeams")} type="number" label="Máx. equipes *" error={errors.maxTeams?.message} />
        <Input {...register("startDate")} type="date" label="Data de início" />
        <Input {...register("registrationDeadline")} type="date" label="Prazo de inscrição" />
      </div>

      <Input {...register("prizePool")} label="Premiação" placeholder="R$ 500 em créditos" />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-paper">Descrição</label>
        <textarea
          {...register("description")}
          rows={2}
          placeholder="Descrição do campeonato…"
          className="rounded-md border border-border bg-ink/50 px-3 py-2.5 text-sm text-paper placeholder:text-muted/60 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-paper">Regulamento</label>
        <textarea
          {...register("rules")}
          rows={3}
          placeholder="Regras do campeonato…"
          className="rounded-md border border-border bg-ink/50 px-3 py-2.5 text-sm text-paper placeholder:text-muted/60 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-3">
        <input {...register("autoApprove")} type="checkbox" className="h-4 w-4 rounded border-border accent-gold" />
        <span className="text-sm text-paper">Aprovar inscrições automaticamente</span>
      </label>

      {mutation.isError && (
        <p className="text-sm text-red-400">
          {mutation.error instanceof Error ? mutation.error.message : "Erro ao criar campeonato"}
        </p>
      )}

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Criando…" : "Criar campeonato"}
        </Button>
      </div>
    </form>
  );
}

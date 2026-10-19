"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

const schema = z.object({
  title: z.string().min(3, "Mínimo 3 caracteres").max(120),
  summary: z.string().min(5, "Mínimo 5 caracteres").max(300),
  content: z.string().optional(),
  type: z.enum(["GENERAL", "REGISTRATION_OPEN", "RESULT", "SCHEDULE", "ANNOUNCEMENT"]),
});

type FormData = z.infer<typeof schema>;

interface Props { onSuccess: () => void; onCancel: () => void; }

const TYPE_OPTIONS = [
  { value: "ANNOUNCEMENT", label: "Comunicado" },
  { value: "GENERAL", label: "Geral" },
  { value: "REGISTRATION_OPEN", label: "Abertura de inscrições" },
  { value: "RESULT", label: "Resultado" },
  { value: "SCHEDULE", label: "Agenda" },
];

export function CreateAnnouncementForm({ onSuccess, onCancel }: Props) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "ANNOUNCEMENT" },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post("/announcements", data, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home", "announcements"] });
      onSuccess();
    },
  });

  const selectClass = "h-10 rounded-md border border-border bg-ink/50 px-3 text-sm text-paper focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30";

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-paper">Tipo *</label>
        <select {...register("type")} className={selectClass}>
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <Input {...register("title")} label="Título *" placeholder="Abertura de inscrições…" error={errors.title?.message} />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-paper">Resumo * <span className="text-muted">(aparece na listagem)</span></label>
        <textarea
          {...register("summary")}
          rows={2}
          placeholder="Breve descrição exibida nos cards…"
          className="rounded-md border border-border bg-ink/50 px-3 py-2.5 text-sm text-paper placeholder:text-muted/60 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
        />
        {errors.summary && <p className="text-xs text-red-400">{errors.summary.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-paper">Conteúdo completo <span className="text-muted">(opcional)</span></label>
        <textarea
          {...register("content")}
          rows={4}
          placeholder="Texto completo do comunicado…"
          className="rounded-md border border-border bg-ink/50 px-3 py-2.5 text-sm text-paper placeholder:text-muted/60 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
        />
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-400">
          {mutation.error instanceof Error ? mutation.error.message : "Erro ao publicar comunicado"}
        </p>
      )}

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={mutation.isPending}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Publicando…" : "Publicar comunicado"}
        </Button>
      </div>
    </form>
  );
}

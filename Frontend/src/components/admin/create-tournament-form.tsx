"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Info, Target, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { usePresets } from "@/hooks/use-presets";

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
  // Aprovação manual por padrão
  autoApprove: z.boolean(),
  // Pagamento
  paymentRequired: z.boolean(),
  entryFeeAmount: z.coerce.number().int().min(0).optional(),
  mpPreferenceId: z.string().optional(),
  // Preset
  presetId: z.string().optional(),
  // Pontuação por partida (ranking)
  swissWin: z.coerce.number().int().min(0).default(30),
  swissLoss: z.coerce.number().int().min(-100).default(0),
  playoffWin: z.coerce.number().int().min(0).default(50),
  playoffLoss: z.coerce.number().int().min(-100).default(0),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const FORMAT_OPTIONS = [
  { value: "GROUP_STAGE_PLAYOFFS",  label: "Grupos + Playoffs" },
  { value: "SINGLE_ELIMINATION",    label: "Eliminação Simples" },
  { value: "DOUBLE_ELIMINATION",    label: "Eliminação Dupla" },
  { value: "ROUND_ROBIN",           label: "Points Race (Round Robin)" },
];

const SERIES_OPTIONS = [
  { value: "BO1", label: "BO1 — Melhor de 1" },
  { value: "BO3", label: "BO3 — Melhor de 3" },
  { value: "BO5", label: "BO5 — Melhor de 5" },
];

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium text-paper">
      {children}
      {required && <span className="ml-0.5 text-gold/80">*</span>}
    </label>
  );
}

function Select({ label, required, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <select
        {...props}
        className={cn(
          "h-10 w-full rounded-lg border border-border/60 bg-ink/50 px-3 text-sm text-paper",
          "focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/20",
          "transition-colors",
          props.className,
        )}
      />
    </div>
  );
}

function Textarea({ label, rows = 3, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        rows={rows}
        {...props}
        className={cn(
          "rounded-lg border border-border/60 bg-ink/50 px-3 py-2.5 text-sm text-paper",
          "placeholder:text-muted/50 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/20",
          "transition-colors resize-none",
          props.className,
        )}
      />
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200",
          checked ? "bg-gold" : "bg-border",
        )}
      >
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </button>
      <div>
        <p className="text-sm font-medium text-paper">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
    </label>
  );
}

export function CreateTournamentForm({ onSuccess, onCancel }: Props) {
  const queryClient = useQueryClient();
  const { presets, loading: loadingPresets } = usePresets();

  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      format: "GROUP_STAGE_PLAYOFFS",
      seriesFormat: "BO3",
      maxTeams: 16,
      autoApprove: false,
      paymentRequired: false,
      presetId: undefined,
      swissWin: 30,
      swissLoss: 0,
      playoffWin: 50,
      playoffLoss: 0,
    },
  });

  const autoApprove = watch("autoApprove");
  const paymentRequired = watch("paymentRequired");
  const presetId = watch("presetId");

  // Quando um preset é selecionado, preencher campos automaticamente
  const handlePresetChange = (selectedPresetId: string) => {
    if (!selectedPresetId) {
      setValue("presetId", undefined);
      return;
    }

    const preset = presets?.find(p => p.id === selectedPresetId);
    if (!preset) return;

    setValue("presetId", selectedPresetId);
    
    // Preencher campos baseado no preset
    if (preset.config.totalTeams) {
      setValue("maxTeams", preset.config.totalTeams);
    }
    
    // Ajustar formato baseado na configuração
    if (preset.config.bracket) {
      setValue("format", preset.config.bracket.format === "SINGLE_ELIMINATION" ? "SINGLE_ELIMINATION" : "DOUBLE_ELIMINATION");
    }

    // Preencher pontuação do preset se disponível
    if (preset.config.scoring) {
      setValue("swissWin",   preset.config.scoring.swissWin   ?? 30);
      setValue("swissLoss",  preset.config.scoring.swissLoss  ?? 0);
      setValue("playoffWin", preset.config.scoring.playoffWin ?? 50);
      setValue("playoffLoss",preset.config.scoring.playoffLoss ?? 0);
    }
  };

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const { swissWin, swissLoss, playoffWin, playoffLoss, ...rest } = data;
      const payload = {
        ...rest,
        startDate: data.startDate ? new Date(data.startDate + "T00:00:00").toISOString() : undefined,
        registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline + "T23:59:59").toISOString() : undefined,
        autoApprove: data.paymentRequired ? false : data.autoApprove,
        entryFeeAmount: data.paymentRequired ? (data.entryFeeAmount ?? 0) : undefined,
        mpPreferenceId: data.paymentRequired ? data.mpPreferenceId : undefined,
        // Pontuação empacotada como objeto — será mesclada ao presetConfig no backend
        scoring: { swissWin, swissLoss, playoffWin, playoffLoss },
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
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
      {/* Preset */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-gold" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Preset (Opcional)</p>
        </div>
        
        <Select
          label="Usar preset de torneio"
          {...register("presetId")}
          onChange={(e) => handlePresetChange(e.target.value)}
          disabled={loadingPresets}
        >
          <option value="">Nenhum preset (configuração manual)</option>
          {presets?.filter(p => p.isActive).map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name} v{preset.version}
            </option>
          ))}
        </Select>

        {presetId && (
          <div className="animate-fade-in rounded-xl border border-gold/20 bg-gold/5 p-4">
            <div className="flex items-start gap-2 text-xs text-gold/80">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                O preset selecionado configurará automaticamente o formato do torneio com fase suíça e playoffs.
                Você pode ajustar os campos abaixo conforme necessário.
              </p>
            </div>
          </div>
        )}
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Identificação */}
      <section className="space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Identificação</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input {...register("name")} label="Nome *" placeholder="ECL Season 2" error={errors.name?.message} />
          <Input {...register("season")} label="Temporada *" placeholder="Temporada 2" error={errors.season?.message} />
        </div>
        <Textarea {...register("description")} label="Descrição" placeholder="Descrição do campeonato…" rows={2} />
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Formato */}
      <section className="space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Formato</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Formato" required {...register("format")}>
            {FORMAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Select label="Série padrão" required {...register("seriesFormat")}>
            {SERIES_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input {...register("maxTeams")} type="number" label="Máx. equipes *" error={errors.maxTeams?.message} />
          <Input {...register("startDate")} type="date" label="Data de início" />
          <Input {...register("registrationDeadline")} type="date" label="Prazo de inscrição" />
        </div>
        <Input {...register("prizePool")} label="Premiação" placeholder="R$ 500 em créditos" />
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Inscrições */}
      <section className="space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Inscrições</p>
        <Toggle
          label="Aprovar inscrições automaticamente"
          hint={
            paymentRequired
              ? "Desativado — torneios pagos exigem aprovação manual."
              : "Quando ativado, times são aprovados imediatamente ao se inscrever."
          }
          checked={paymentRequired ? false : autoApprove}
          onChange={(v) => setValue("autoApprove", v)}
        />
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Pagamento — Mercado Pago */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-3.5 w-3.5 text-muted" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Pagamento (Mercado Pago)</p>
        </div>

        <Toggle
          label="Campeonato pago"
          hint="Habilita a cobrança de taxa de inscrição via Mercado Pago."
          checked={paymentRequired}
          onChange={(v) => {
            setValue("paymentRequired", v);
            if (v) setValue("autoApprove", false); // força aprovação manual
          }}
        />

        {paymentRequired && (
          <div className="animate-fade-in space-y-4 rounded-xl border border-gold/20 bg-gold/5 p-4">
            <div className="flex items-start gap-2 text-xs text-gold/80">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>As inscrições ficam pendentes até a confirmação do pagamento e aprovação do admin.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                {...register("entryFeeAmount")}
                type="number"
                label="Valor (R$)"
                placeholder="20"
                error={errors.entryFeeAmount?.message}
              />
              <Input
                {...register("mpPreferenceId")}
                label="ID da preferência Mercado Pago (opcional)"
                placeholder="preference_xxxxxxxx"
                error={errors.mpPreferenceId?.message}
              />
            </div>
          </div>
        )}
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Pontuação para o Ranking */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-3.5 w-3.5 text-gold" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Pontuação para o Ranking</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-ink/30 p-4 space-y-4">
          <p className="text-xs text-muted">
            Pontos atribuídos automaticamente ao ranking dos times após cada resultado.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              {...register("swissWin")}
              type="number"
              label="Vitória — Fase Suíça"
              placeholder="30"
              error={errors.swissWin?.message}
            />
            <Input
              {...register("swissLoss")}
              type="number"
              label="Derrota — Fase Suíça"
              placeholder="0"
              error={errors.swissLoss?.message}
            />
            <Input
              {...register("playoffWin")}
              type="number"
              label="Vitória — Playoffs"
              placeholder="50"
              error={errors.playoffWin?.message}
            />
            <Input
              {...register("playoffLoss")}
              type="number"
              label="Derrota — Playoffs"
              placeholder="0"
              error={errors.playoffLoss?.message}
            />
          </div>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Regulamento */}
      <section className="space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Regulamento</p>
        <Textarea {...register("rules")} label="Regras" placeholder="Regras do campeonato…" rows={4} />
      </section>

      {/* Erro */}
      {mutation.isError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {mutation.error instanceof Error ? mutation.error.message : "Erro ao criar campeonato"}
        </p>
      )}

      {/* Ações */}
      <div className="flex justify-end gap-3 border-t border-border/60 pt-5">
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

"use client";

import { useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, ChevronRight, Plus, Trash2,
  AlertCircle, FileText, Shield, X,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PixPaymentModal } from "./pix-payment-modal";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// ─── Schema ──────────────────────────────────────────────────────────────────

const playerSchema = z.object({
  nick: z.string().min(1, "Nick obrigatório").max(50, "Nick muito longo"),
  role: z.enum(["PLAYER", "SUBSTITUTE"]),
});

const formSchema = z.object({
  leaderName: z.string().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80 caracteres"),
  teamName: z.string().min(3, "Mínimo 3 caracteres").max(50, "Máximo 50 caracteres"),
  teamTag: z.string().min(1, "Obrigatório").max(6, "Máximo 6 caracteres"),
  leaderPhone: z
    .string()
    .min(14, "Telefone inválido — use o formato (xx) xxxxx-xxxx")
    .max(15, "Telefone inválido"),
  players: z
    .array(playerSchema)
    .min(5, "Mínimo 5 jogadores")
    .max(7, "Máximo 7 jogadores"),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "Você precisa aceitar os termos para continuar" }),
  }),
});

type FormData = z.infer<typeof formSchema>;

// ─── Props ───────────────────────────────────────────────────────────────────

interface TournamentRegistrationModalProps {
  open: boolean;
  onClose: () => void;
  tournamentId: string;
  tournamentSlug: string;
  tournamentName: string;
  tournamentRules?: string | null;
  paymentRequired: boolean;
  entryFeeAmount: number | null;
  whatsappGroupUrl?: string | null;
}

interface RegisterResult {
  team: { id: string; name: string; slug: string };
  registration: { id: string; paymentStatus: string };
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function TournamentRegistrationModal({
  open,
  onClose,
  tournamentId,
  tournamentSlug,
  tournamentName,
  tournamentRules,
  paymentRequired,
  entryFeeAmount,
  whatsappGroupUrl,
}: TournamentRegistrationModalProps) {
  const queryClient = useQueryClient();
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [pixData, setPixData] = useState<{ registrationId: string; teamName: string; teamSlug: string } | null>(null);

  // ── Máscara de telefone (xx) xxxxx-xxxx ──────────────────────────────────
  const maskPhone = useCallback((value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leaderName: "",
      teamName: "",
      teamTag: "",
      leaderPhone: "",
      players: [
        { nick: "", role: "PLAYER" },
        { nick: "", role: "PLAYER" },
        { nick: "", role: "PLAYER" },
        { nick: "", role: "PLAYER" },
        { nick: "", role: "PLAYER" },
      ],
      termsAccepted: undefined as unknown as true,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "players" });
  const termsAccepted = watch("termsAccepted");

  const titulares = fields.filter((_, i) => watch(`players.${i}.role`) === "PLAYER");
  const totalReservas = fields.filter((_, i) => watch(`players.${i}.role`) === "SUBSTITUTE").length;

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      api.post<RegisterResult>("/registrations/with-team", {
        tournamentId,
        teamName: data.teamName,
        teamTag: data.teamTag.toUpperCase(),
        leaderName: data.leaderName,
        leaderPhone: data.leaderPhone,
        players: data.players,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentSlug] });
      if (paymentRequired && result.registration.id) {
        setPixData({
          registrationId: result.registration.id,
          teamName: result.team.name,
          teamSlug: result.team.slug,
        });
      } else {
        handleClose();
      }
    },
  });

  function handleClose() {
    reset();
    setPixData(null);
    setShowRulesModal(false);
    onClose();
  }

  function addReserva() {
    if (totalReservas < 2) {
      append({ nick: "", role: "SUBSTITUTE" });
    }
  }

  const amountCents = entryFeeAmount ?? 0;

  // ── Quando o modal de PIX está ativo, mostra apenas ele
  if (pixData) {
    return (
      <PixPaymentModal
        open={true}
        onClose={handleClose}
        registrationId={pixData.registrationId}
        tournamentName={tournamentName}
        teamName={pixData.teamName}
        amountCents={amountCents}
        tournamentSlug={tournamentSlug}
        teamSlug={pixData.teamSlug}
        whatsappGroupUrl={whatsappGroupUrl ?? undefined}
      />
    );
  }

  return (
    <>
      {/* ── Modal do regulamento ────────────────────────────────────────────── */}
      {showRulesModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Regulamento do campeonato"
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
            onClick={() => setShowRulesModal(false)}
          />

          {/* Painel */}
          <div className="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-surface shadow-2xl">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gold" />
                <h3 className="font-display text-base font-bold uppercase tracking-wide text-paper">
                  Regulamento
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface/80 hover:text-paper"
                aria-label="Fechar regulamento"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Conteúdo com scroll */}
            <div className="flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-muted">
              {tournamentRules && tournamentRules.trim() !== "" ? (
                tournamentRules.split("\n").map((line, i) => (
                  <p key={i} className={cn(line.trim() === "" ? "mt-3" : "")}>
                    {line || "\u00A0"}
                  </p>
                ))
              ) : (
                <p>O regulamento completo será disponibilizado pela organização. Ao prosseguir, o líder concorda em seguir todas as regras oficiais do campeonato.</p>
              )}
            </div>

            {/* Rodapé */}
            <div className="border-t border-border/60 px-6 py-4">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => setShowRulesModal(false)}
              >
                Entendido
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={open}
        onClose={handleClose}
        title="Inscrição no campeonato"
        description={tournamentName}
        size="lg"
      >
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} noValidate>
          <div className="space-y-8 px-7 pb-7">

            {/* ── Dados do time ──────────────────────────────────────────── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-gold/70" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  Dados do líder e do time
                </p>
              </div>

              <Input
                {...register("leaderName")}
                label="Seu nome (líder do time)"
                placeholder="Ex: João Silva"
                error={errors.leaderName?.message}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Input
                    {...register("teamName")}
                    label="Nome do time"
                    placeholder="Ex: Phantom Squad"
                    error={errors.teamName?.message}
                  />
                </div>
                <div>
                  <Input
                    {...register("teamTag")}
                    label="Tag (sigla)"
                    placeholder="Ex: PSQ"
                    maxLength={6}
                    error={errors.teamTag?.message}
                  />
                </div>
              </div>

              <Input
                {...register("leaderPhone")}
                label="Telefone do líder (WhatsApp)"
                placeholder="(11) 99999-9999"
                type="tel"
                error={errors.leaderPhone?.message}
                onChange={(e) => {
                  const masked = maskPhone(e.target.value);
                  e.target.value = masked;
                  void register("leaderPhone").onChange(e);
                }}
              />
            </section>

            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            {/* ── Jogadores ──────────────────────────────────────────────── */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-gold/70" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                    Jogadores
                  </p>
                </div>
                <span className="text-xs text-muted">
                  {fields.filter((_, i) => watch(`players.${i}.role`) === "PLAYER").length} titular
                  {totalReservas > 0 && ` · ${totalReservas} reserva${totalReservas > 1 ? "s" : ""}`}
                </span>
              </div>

              {errors.players?.root && (
                <p className="text-xs text-red-400">{errors.players.root.message}</p>
              )}
              {typeof errors.players?.message === "string" && (
                <p className="text-xs text-red-400">{errors.players.message}</p>
              )}

              <div className="space-y-2">
                {fields.map((field, index) => {
                  const isSubstitute = watch(`players.${index}.role`) === "SUBSTITUTE";
                  const isMain = !isSubstitute;
                  const mainCount = fields.filter((_, i) => i < index && watch(`players.${i}.role`) === "PLAYER").length;
                  const subCount = fields.filter((_, i) => i < index && watch(`players.${i}.role`) === "SUBSTITUTE").length;

                  return (
                    <div key={field.id} className="flex items-start gap-2">
                      {/* Badge de posição */}
                      <div
                        className={cn(
                          "mt-7 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                          isSubstitute
                            ? "bg-border text-muted"
                            : "bg-gold/10 text-gold",
                        )}
                      >
                        {isSubstitute ? `R${subCount + 1}` : mainCount + 1}
                      </div>

                      <div className="flex-1">
                        <Input
                          {...register(`players.${index}.nick`)}
                          label={
                            isSubstitute
                              ? `Reserva ${subCount + 1} — nick no jogo`
                              : `Jogador ${mainCount + 1} — nick no jogo`
                          }
                          placeholder="Nick no Standoff 2"
                          error={errors.players?.[index]?.nick?.message}
                        />
                      </div>

                      {/* Botão remover (apenas reservas) */}
                      {isSubstitute && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="mt-7 rounded p-1.5 text-muted transition-colors hover:text-red-400"
                          aria-label="Remover reserva"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Adicionar reserva */}
              {totalReservas < 2 && (
                <button
                  type="button"
                  onClick={addReserva}
                  className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-gold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar reserva {totalReservas === 0 ? "(opcional, até 2)" : "(mais 1)"}
                </button>
              )}
            </section>

            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            {/* ── Regulamento + aceite ───────────────────────────────────── */}
            <section className="space-y-4">
              {/* Botão que abre o modal do regulamento */}
              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-gold/80 underline underline-offset-2 transition-colors hover:text-gold"
              >
                <FileText className="h-3.5 w-3.5" />
                Ler o regulamento do campeonato
              </button>

              {/* Checkbox de aceite */}
              <label className="flex cursor-pointer items-start gap-3">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    {...register("termsAccepted")}
                    className="peer sr-only"
                  />
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border-2 transition-colors",
                      termsAccepted
                        ? "border-gold bg-gold"
                        : "border-border/80 bg-ink/50 peer-focus-visible:border-gold/60",
                    )}
                  >
                    {termsAccepted && (
                      <svg className="h-3 w-3 text-ink" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-muted leading-snug">
                  Eu li e concordo com os termos e regulamento do campeonato.
                </span>
              </label>
              {errors.termsAccepted && (
                <p className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {errors.termsAccepted.message}
                </p>
              )}
            </section>

            {/* ── Erro da API ────────────────────────────────────────────── */}
            {mutation.isError && (
              <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <p className="text-sm text-red-400">
                  {mutation.error instanceof Error
                    ? mutation.error.message
                    : "Erro ao realizar a inscrição. Tente novamente."}
                </p>
              </div>
            )}

            {/* ── Rodapé ────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-5">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!termsAccepted || mutation.isPending}
                className={cn(!termsAccepted && "opacity-50 cursor-not-allowed")}
              >
                {mutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/40 border-t-ink" />
                    Processando...
                  </span>
                ) : paymentRequired ? (
                  <span className="flex items-center gap-2">
                    Pagar
                    <ChevronRight className="h-4 w-4" />
                  </span>
                ) : (
                  "Confirmar inscrição"
                )}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}

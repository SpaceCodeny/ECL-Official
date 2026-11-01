"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Copy, Check, Clock, AlertCircle, MessageCircle, Trophy, Users } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface PixPaymentModalProps {
  open: boolean;
  onClose: () => void;
  registrationId: string;
  tournamentName: string;
  teamName: string;
  amountCents: number;
  tournamentSlug?: string;
  teamSlug?: string;
  whatsappGroupUrl?: string;
}

interface PaymentLinkData {
  paymentUrl: string;
  qrCode: string;
  qrCodeBase64: string;
  mpPaymentId: string;
  expiresAt?: string;
  amountCents: number;
  status: "NOT_REQUIRED" | "PENDING" | "PAID" | "REFUNDED" | "FAILED";
  registrationStatus?: string;
  whatsappGroupUrl?: string | null;
}

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(expiresAt: string | undefined) {
  const calcRemaining = useCallback(() => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  }, [expiresAt]);

  const [remaining, setRemaining] = useState(calcRemaining);

  useEffect(() => {
    if (!expiresAt) return;
    setRemaining(calcRemaining());
    const id = setInterval(() => {
      const r = calcRemaining();
      setRemaining(r);
      if (r === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, calcRemaining]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const expired = remaining === 0 && Boolean(expiresAt);
  const urgent = remaining > 0 && remaining <= 60; // último minuto

  return { remaining, minutes, seconds, expired, urgent };
}

export function PixPaymentModal({
  open,
  onClose,
  registrationId,
  tournamentName,
  teamName,
  amountCents,
  tournamentSlug,
  teamSlug,
  whatsappGroupUrl: whatsappGroupUrlProp,
}: PixPaymentModalProps) {
  const [copied, setCopied] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [resolvedWhatsapp, setResolvedWhatsapp] = useState<string | null>(
    whatsappGroupUrlProp ?? null,
  );
  const [resolvedTeamSlug, setResolvedTeamSlug] = useState<string | undefined>(teamSlug);
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<PaymentLinkData>(`/registrations/${registrationId}/payment-link`, undefined),
  });

  // Gera o pagamento quando abre o modal
  useEffect(() => {
    if (open && !mutation.data && !mutation.isPending && !isPaid) {
      mutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Polling para detectar pagamento confirmado (a cada 5s)
  useEffect(() => {
    if (!open || isPaid) return;

    pollRef.current = setInterval(async () => {
      try {
        const data = await api.post<PaymentLinkData>(
          `/registrations/${registrationId}/payment-link`,
          undefined,
        );
        if (data.status === "PAID") {
          // Captura whatsappGroupUrl e teamSlug da resposta se disponíveis
          if (data.whatsappGroupUrl) setResolvedWhatsapp(data.whatsappGroupUrl);
          setIsPaid(true);
          if (pollRef.current) clearInterval(pollRef.current);
          // Pequeno delay para a animação do QR
          setTimeout(() => setShowSuccess(true), 600);
        }
      } catch {
        // ignora erros de polling
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isPaid]);

  // Sincroniza teamSlug quando a prop muda
  useEffect(() => {
    if (teamSlug) setResolvedTeamSlug(teamSlug);
  }, [teamSlug]);

  // Reset ao fechar
  function handleClose() {
    setIsPaid(false);
    setShowSuccess(false);
    if (pollRef.current) clearInterval(pollRef.current);
    onClose();
  }

  const paymentData = mutation.data;
  const amountBRL = (amountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const copyPixCode = () => {
    if (paymentData?.qrCode) {
      navigator.clipboard.writeText(paymentData.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Countdown de expiração ──────────────────────────────────────────────────
  const { minutes, seconds, expired, urgent } = useCountdown(paymentData?.expiresAt);

  // ── Tela de sucesso (pagamento confirmado) ──────────────────────────────────
  if (isPaid && showSuccess) {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Pagamento confirmado!"
        description={`${tournamentName} · ${teamName}`}
        size="md"
      >
        <div className="space-y-6">
          {/* Animação de sucesso */}
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
              <div className="absolute inset-0 rounded-full bg-emerald-500/10" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500">
                <Check className="h-10 w-10 text-white" strokeWidth={3} />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="font-display text-lg font-bold text-emerald-400">
                Pagamento concluído com sucesso! ✅
              </p>
              <p className="text-sm text-muted">
                Sua inscrição foi aprovada automaticamente.
              </p>
            </div>
          </div>

          {/* Link do grupo do WhatsApp */}
          {resolvedWhatsapp && (
            <a
              href={resolvedWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-3.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10"
            >
              <MessageCircle className="h-4 w-4" />
              Entrar no grupo do campeonato (WhatsApp)
            </a>
          )}

          {/* Link do servidor Discord */}
          <a
            href="https://discord.gg/TKURuCarYJ"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/5 px-5 py-3.5 text-sm font-medium text-indigo-400 transition-colors hover:bg-indigo-500/10"
          >
            {/* Ícone Discord SVG */}
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            Entrar no servidor Discord
          </a>

          {/* Botões de navegação */}
          <div className="flex flex-col gap-3">
            {/* Botão principal: ir direto para a aba equipes do campeonato */}
            {tournamentSlug && (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => router.push(`/tournaments/${tournamentSlug}?tab=teams`)}
              >
                <Users className="h-4 w-4" />
                Ver equipes do campeonato
              </Button>
            )}

            {/* Botão secundário: ir para o perfil do time */}
            {resolvedTeamSlug && (
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={() => router.push(`/teams/${resolvedTeamSlug}`)}
              >
                <Trophy className="h-4 w-4" />
                Ver meu time
              </Button>
            )}

            {/* Fallback se não tiver teamSlug mas tiver tournamentSlug */}
            {tournamentSlug && !resolvedTeamSlug && (
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={() => router.push(`/tournaments/${tournamentSlug}`)}
              >
                <Trophy className="h-4 w-4" />
                Ver campeonato
              </Button>
            )}
          </div>

          {/* Fechar */}
          <div className="flex justify-end border-t border-border/60 pt-4">
            <Button variant="ghost" onClick={handleClose}>
              Fechar
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Tela de pagamento (QR Code) ──────────────────────────────────────────────
  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Pagamento via PIX"
      description={`${tournamentName} · ${teamName}`}
      size="md"
    >
      <div className="space-y-6">
        {/* Valor */}
        <div className="rounded-xl border border-gold/20 bg-gold/5 p-5 text-center">
          <p className="text-xs uppercase tracking-widest text-muted">Valor da inscrição</p>
          <p className="mt-2 font-display text-3xl font-bold text-gold">{amountBRL}</p>
        </div>

        {/* Loading */}
        {mutation.isPending && !paymentData && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
            <p className="text-sm text-muted">Gerando pagamento PIX...</p>
          </div>
        )}

        {/* Erro */}
        {mutation.isError && (
          <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-400">Erro ao gerar pagamento</p>
              <p className="text-xs text-red-400/80">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "Tente novamente em alguns instantes"}
              </p>
            </div>
          </div>
        )}

        {/* Pagamento gerado — PENDING */}
        {paymentData && paymentData.status === "PENDING" && (
          <>
            {/* Instruções */}
            <div className="space-y-2 text-sm text-muted">
              <p className="flex items-start gap-2">
                <span className="text-gold">1.</span>
                Abra o app do seu banco ou carteira digital
              </p>
              <p className="flex items-start gap-2">
                <span className="text-gold">2.</span>
                Escaneie o QR Code abaixo ou copie o código PIX
              </p>
              <p className="flex items-start gap-2">
                <span className="text-gold">3.</span>
                Confirme o pagamento — a confirmação é automática
              </p>
            </div>

            {/* QR Code (imagem real do Mercado Pago) */}
            {paymentData.qrCodeBase64 && (
              <div className="flex flex-col items-center gap-3">
                <div
                  className={cn(
                    "relative rounded-xl border border-border/60 bg-white p-4 transition-all duration-500",
                    isPaid && "opacity-30 blur-sm scale-95",
                    expired && "opacity-50",
                  )}
                >
                  <img
                    src={`data:image/png;base64,${paymentData.qrCodeBase64}`}
                    alt="QR Code PIX"
                    width={200}
                    height={200}
                    className="h-[200px] w-[200px]"
                  />
                  {/* Overlay de OK durante a transição */}
                  {isPaid && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-16 w-16 animate-bounce items-center justify-center rounded-full bg-emerald-500">
                        <Check className="h-8 w-8 text-white" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Status aguardando / botão copiar */}
                {isPaid ? (
                  <p className="text-sm font-medium text-emerald-400 animate-pulse">
                    Pagamento detectado! Confirmando...
                  </p>
                ) : expired ? (
                  <p className="text-sm font-medium text-red-400">
                    QR Code expirado. Feche e abra novamente para gerar um novo.
                  </p>
                ) : (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={copyPixCode}
                    className="w-full"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Código PIX copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copiar código PIX
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Temporizador de expiração */}
            {paymentData.expiresAt && !isPaid && (
              <div
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                  expired
                    ? "border border-red-500/30 bg-red-500/5 text-red-400"
                    : urgent
                      ? "border border-amber-500/30 bg-amber-500/5 text-amber-400"
                      : "border border-border/60 bg-ink/40 text-muted",
                )}
              >
                <Clock className={cn("h-4 w-4", urgent && "animate-pulse")} />
                {expired ? (
                  <span>QR Code expirado</span>
                ) : (
                  <span>
                    Expira em{" "}
                    <span className="font-display text-base font-bold tabular-nums">
                      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                    </span>
                  </span>
                )}
              </div>
            )}

            {/* Aviso */}
            <div className="rounded-lg border border-border/60 bg-ink/50 p-4 text-xs text-muted">
              <p className="font-medium text-paper">💡 Como funciona</p>
              <p className="mt-1">
                Após o pagamento, a confirmação é automática (pode levar alguns segundos).
                Deixe esta tela aberta — ela vai atualizar sozinha.
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

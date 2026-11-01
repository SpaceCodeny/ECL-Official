/**
 * payments.routes.ts
 * Webhook do Mercado Pago para confirmação de pagamentos PIX.
 *
 * Este router é montado SEM autenticação JWT.
 *
 * Headers de segurança validados:
 *   x-signature  → "ts=...,v1=..."  (HMAC-SHA256 do template)
 *   x-request-id → ID da requisição do MP
 *   ?data.id     → query param com o ID do recurso (payment)
 *
 * Fluxo:
 *   1. Valida a assinatura HMAC com o secret configurado no painel do MP.
 *   2. Se o evento for de "payment", busca o pagamento via API para confirmar
 *      o status e o external_reference (registrationId).
 *   3. Atualiza a inscrição: approved → PAID, rejected/cancelled/expired → FAILED.
 *      O status da inscrição permanece PENDING — admin aprova manualmente.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { RegistrationStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "../database/prisma";
import { getPayment, verifyWebhookSignature } from "../services/mercadopago.service";
import { config } from "../config/environment";
import { ensureRankingEntry } from "../utils/ranking";

export const paymentsRouter = Router();

// ─── POST /payments/webhook/mercadopago ───────────────────────────────────────
paymentsRouter.post(
  "/webhook/mercadopago",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const xSignature = req.headers["x-signature"] as string | undefined;
      const xRequestId = req.headers["x-request-id"] as string | undefined;
      // data.id pode vir como query (?data.id=123) ou dentro do body.
      const dataId =
        (req.query["data.id"] as string | undefined) ??
        (req.body?.data?.id as string | undefined);

      // 1. Verificar assinatura
      if (xSignature) {
        const valid = verifyWebhookSignature({
          xSignature,
          xRequestId,
          dataId: typeof dataId === "string" ? dataId : undefined,
        });
        if (!valid) {
          console.warn("[MP Webhook] Assinatura inválida recebida");
          return res.status(401).json({ error: "Assinatura inválida" });
        }
      } else if (config.NODE_ENV === "production" && config.MERCADOPAGO_WEBHOOK_SECRET) {
        // Em produção com secret configurado, assinatura é obrigatória.
        return res.status(401).json({ error: "Header x-signature ausente" });
      }

      // 2. Parse do payload
      const payload = req.body as {
        type?: string;
        action?: string;
        data?: { id?: string };
        live_mode?: boolean;
      };

      // MP envia type=payment (e.g. "payment") e action="payment.updated"/"payment.created"
      const topic = payload.type;
      const resourceId = payload.data?.id;

      // MP também envia um GET de validação (sem body/data) ao configurar o webhook.
      // Responde 200 sem processar.
      if (!topic || !resourceId) {
        return res.status(200).json({ received: true });
      }

      // 3. Processa apenas eventos de pagamento
      if (topic !== "payment") {
        console.log(`[MP Webhook] Evento ignorado (topic=${topic})`);
        return res.status(200).json({ received: true });
      }

      // 4. Busca o pagamento no MP para confirmar status e external_reference.
      const paymentId = String(resourceId);
      const payment = await getPayment(paymentId);
      const registrationId = payment.external_reference;

      if (!registrationId) {
        console.warn(`[MP Webhook] Pagamento ${paymentId} sem external_reference`);
        return res.status(200).json({ received: true });
      }

      // 5. Busca a inscrição
      const reg = await prisma.tournamentRegistration.findUnique({
        where: { id: registrationId },
      });

      if (!reg) {
        console.warn(`[MP Webhook] Inscrição não encontrada: ${registrationId}`);
        return res.status(200).json({ received: true });
      }

      // 6. Atualiza conforme o status do pagamento
      const mpStatus = payment.status;

      if (mpStatus === "approved") {
        await prisma.tournamentRegistration.update({
          where: { id: registrationId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            mpPaymentId: paymentId,
            paidAt: new Date(),
            // Auto-aprova a inscrição assim que o PIX é confirmado.
            status: RegistrationStatus.APPROVED,
          },
        });
        // Adiciona o time ao ranking automaticamente
        await ensureRankingEntry(reg.teamId, reg.tournamentId);
        console.log(`[MP Webhook] ✅ Pagamento confirmado — inscrição ${registrationId} aprovada automaticamente`);
      } else if (mpStatus === "rejected" || mpStatus === "cancelled" || mpStatus === "expired") {
        await prisma.tournamentRegistration.update({
          where: { id: registrationId },
          data: {
            paymentStatus: PaymentStatus.FAILED,
            mpPaymentId: paymentId,
          },
        });
        console.log(`[MP Webhook] ❌ Pagamento falhou — inscrição ${registrationId} (${mpStatus})`);
      } else {
        // pending / in_process — apenas registra o ID do pagamento, sem mudar status.
        if (!reg.mpPaymentId) {
          await prisma.tournamentRegistration.update({
            where: { id: registrationId },
            data: { mpPaymentId: paymentId },
          });
        }
        console.log(`[MP Webhook] Pagamento ${paymentId} com status ${mpStatus} — inscrição ${registrationId}`);
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  },
);

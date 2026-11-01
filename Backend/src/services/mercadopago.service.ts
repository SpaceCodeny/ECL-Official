/**
 * mercadopago.service.ts
 * Integração com a API do Mercado Pago (Checkout Transparente) para pagamentos PIX.
 *
 * Documentação oficial:
 *   https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/integration-configuration/integrate-pix
 *   https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 *
 * Autenticação: Bearer token com o Access Token do Mercado Pago.
 *   Authorization: Bearer {MERCADOPAGO_ACCESS_TOKEN}
 *
 * Idempotência: o header X-Idempotency-Key evita pagamentos duplicados
 * caso a mesma requisição seja reenviada.
 */

import crypto from "node:crypto";
import { config } from "../config/environment";

// ─── Tipos da API Mercado Pago ───────────────────────────────────────────────

export interface CreatePixPaymentParams {
  /** Valor em centavos (ex: 2000 = R$ 20,00) */
  amountCents: number;
  /** Descrição exibida no pagamento (ex: "Inscrição — ECL Season 2") */
  description: string;
  /** Código de referência interno (ex: registration UUID) — retornado no webhook */
  externalReference: string;
  /** E-mail do pagador (capitão do time). Se ausente, usa placeholder. */
  payerEmail?: string;
  /** Expiração em horas a partir de agora (padrão: 72h, limite MP: 30min–30 dias) */
  expiresInHours?: number;
}

export interface PixPaymentResult {
  /** ID do pagamento no Mercado Pago (string do payment.id) */
  paymentId: string;
  /** URL da página de checkout (ticket_url) — abre QR Code + copia e cola */
  paymentUrl: string;
  /** Código PIX "copia e cola" para o cliente pagar */
  qrCode: string;
  /** Imagem do QR Code em base64 (PNG), retornada diretamente pelo Mercado Pago */
  qrCodeBase64: string;
  /** Data de expiração ISO 8601 */
  expiresAt: string;
}

export interface MercadoPagoPayment {
  id: number;
  status: "pending" | "approved" | "rejected" | "cancelled" | "expired" | "in_process";
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  date_of_expiration?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getApiUrl(): string {
  return config.MERCADOPAGO_API_URL ?? "https://api.mercadopago.com";
}

function getAccessToken(): string {
  const token = config.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
  return token;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Cria um pagamento PIX no Mercado Pago (Checkout Transparente).
 * Retorna o ID do pagamento, a URL de checkout, o código "copia e cola" e a expiração.
 */
export async function createPixPayment(
  params: CreatePixPaymentParams,
): Promise<PixPaymentResult> {
  const {
    amountCents,
    description,
    externalReference,
    payerEmail,
    expiresInHours = 72,
  } = params;

  const expiresAt = new Date(
    Date.now() + expiresInHours * 60 * 60 * 1000,
  ).toISOString();

  const body = {
    transaction_amount: amountCents / 100, // MP espera valor em reais (float)
    payment_method_id: "pix",
    description: description.slice(0, 255),
    external_reference: externalReference,
    date_of_expiration: expiresAt,
    payer: {
      email: payerEmail && payerEmail.includes("@")
        ? payerEmail
        : "pagador@ecl.gg",
    },
  };

  // Idempotência: uma chave única por requisição evita duplicidade em retries.
  const idempotencyKey = crypto.randomUUID();

  const response = await fetch(`${getApiUrl()}/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Mercado Pago erro ${response.status}: ${errorText || response.statusText}`,
    );
  }

  const data = (await response.json()) as MercadoPagoPayment;

  const txData = data.point_of_interaction?.transaction_data;
  const qrCode = txData?.qr_code ?? "";
  const qrCodeBase64 = txData?.qr_code_base64 ?? "";
  const paymentUrl = txData?.ticket_url ?? "";

  if (!qrCode || !paymentUrl) {
    throw new Error(
      "Mercado Pago não retornou os dados do QR Code PIX (qr_code/ticket_url)",
    );
  }

  return {
    paymentId: String(data.id),
    paymentUrl,
    qrCode,
    qrCodeBase64,
    expiresAt: data.date_of_expiration ?? expiresAt,
  };
}

/**
 * Busca um pagamento no Mercado Pago pelo ID.
 * Usado pelo webhook para confirmar o status e o external_reference (registrationId).
 */
export async function getPayment(
  paymentId: string,
): Promise<MercadoPagoPayment> {
  const response = await fetch(`${getApiUrl()}/v1/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Mercado Pago erro ao buscar pagamento ${paymentId} (${response.status}): ${errorText}`,
    );
  }

  return (await response.json()) as MercadoPagoPayment;
}

/**
 * Busca pagamentos pelo external_reference (registrationId).
 * O Mercado Pago cria DOIS payments por transação PIX:
 *   1. O payment "pending" gerado ao criar o QR Code (ID salvo no banco).
 *   2. O payment "approved" gerado quando o usuário paga (ID diferente!).
 *
 * Por isso o polling NÃO pode usar apenas o ID salvo — precisa buscar por
 * external_reference para encontrar o payment approved.
 *
 * Retorna o payment com status "approved" se existir, senão o mais recente.
 */
export async function getPaymentByExternalReference(
  externalReference: string,
): Promise<MercadoPagoPayment | null> {
  const url = `${getApiUrl()}/v1/payments/search?external_reference=${encodeURIComponent(externalReference)}&limit=10&sort=date_created&criteria=desc`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Mercado Pago erro ao buscar por external_reference ${externalReference} (${response.status}): ${errorText}`,
    );
  }

  const data = (await response.json()) as { results: MercadoPagoPayment[] };

  if (!data.results || data.results.length === 0) return null;

  // Prefere o pagamento aprovado, senão retorna o mais recente (first by sort desc).
  const approved = data.results.find((p) => p.status === "approved");
  return approved ?? data.results[0] ?? null;
}

/**
 * Converte um pagamento já existente (buscado no Mercado Pago) no resultado do
 * fluxo PIX. Usado quando a inscrição já tem um mpPaymentId e precisamos devolver
 * o QR Code atualizado ao reabrir o modal — sempre com a imagem real do MP.
 */
export function paymentToResult(payment: MercadoPagoPayment): PixPaymentResult {
  const txData = payment.point_of_interaction?.transaction_data;
  return {
    paymentId: String(payment.id),
    paymentUrl: txData?.ticket_url ?? "",
    qrCode: txData?.qr_code ?? "",
    qrCodeBase64: txData?.qr_code_base64 ?? "",
    expiresAt:
      payment.date_of_expiration ??
      new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Verifica a assinatura HMAC-SHA256 de um webhook do Mercado Pago.
 *
 * Headers usados:
 *   x-signature  → "ts=1704908010,v1=618c85..."
 *   x-request-id  → ID da requisição
 * Query param:
 *   data.id      → ID do recurso (payment id)
 *
 * Template assinado pelo Mercado Pago:
 *   "id:{dataId};request-id:{requestId};ts:{ts};"
 * Quando dataId está ausente, a parte "id:...;" é omitida.
 */
export function verifyWebhookSignature(params: {
  xSignature: string;
  xRequestId?: string;
  dataId?: string;
}): boolean {
  const secret = config.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    // Sem secret configurado, aceita em desenvolvimento mas loga aviso.
    console.warn("[Mercado Pago] MERCADOPAGO_WEBHOOK_SECRET não configurado — pulando verificação de assinatura");
    return config.NODE_ENV !== "production";
  }

  const { xSignature, xRequestId, dataId } = params;

  // Extrai ts e v1 do header "ts=...,v1=..."
  const parts: Record<string, string> = {};
  for (const segment of xSignature.split(",")) {
    const idx = segment.indexOf("=");
    if (idx === -1) continue;
    const key = segment.slice(0, idx).trim();
    const value = segment.slice(idx + 1).trim();
    if (!key) continue;
    parts[key] = value;
  }
  const ts = parts["ts"];
  const v1 = parts["v1"];

  if (!ts || !v1) {
    console.warn("[Mercado Pago] Header x-signature malformado");
    return false;
  }

  // Monta o template conforme o Mercado Pago.
  // dataId é lowercased conforme o manifest do MP.
  const lowerDataId = dataId ? dataId.toLowerCase() : "";
  const idPart = lowerDataId ? `id:${lowerDataId};` : "";
  const template = `${idPart}request-id:${xRequestId ?? ""};ts:${ts};`;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(template)
    .digest("hex");

  // Comparação em tempo constante para evitar timing attacks.
  const a = Buffer.from(v1);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

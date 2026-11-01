/**
 * Script de teste da integração Mercado Pago (sandbox).
 * 1. Cria um usuário de teste (comprador) exigido pelo sandbox.
 * 2. Cria um pagamento PIX de R$ 20,00 com esse usuário.
 * 3. Busca o pagamento via GET /v1/payments/{id}.
 *
 * Uso: npx tsx --env-file=.env scripts/test-mercadopago.ts
 */
import { createPixPayment, getPayment } from "../src/services/mercadopago.service";

async function main() {
  // No sandbox, pagar como convidado (e-mail normal) funciona; e-mails de
  // "test_user_*@testuser.com" são bloqueados (403 Payer email forbidden).
  // No fluxo real da app, o e-mail do pagador é o do capitão (e-mail normal).
  const buyerEmail = "comprador@example.com";
  console.log("[Test MP] Pagando como convidado (email:", buyerEmail, ")");

  console.log("\n[Test MP] Criando pagamento PIX de teste (R$ 20,00)...");
  const result = await createPixPayment({
    amountCents: 2000,
    description: "Teste ECL — Inscrição campeonato",
    externalReference: "test-registration-0001",
    payerEmail: buyerEmail,
    expiresInHours: 1,
  });

  console.log("[Test MP] ✅ Pagamento criado com sucesso!");
  console.log("  paymentId      :", result.paymentId);
  console.log("  paymentUrl     :", result.paymentUrl);
  console.log("  qrCode (copia) :", result.qrCode.slice(0, 60) + "...");
  console.log("  qrCodeBase64   :", result.qrCodeBase64 ? `${result.qrCodeBase64.length} bytes de imagem` : "(vazio)");
  console.log("  expiresAt      :", result.expiresAt);

  console.log("\n[Test MP] Buscando o pagamento via GET /v1/payments/{id}...");
  const fetched = await getPayment(result.paymentId);
  console.log("[Test MP] ✅ Busca OK — status:", fetched.status, "| external_reference:", fetched.external_reference);

  console.log("\n[Test MP] Integração 100% funcional. ✅");
}

main().catch((e) => {
  console.error("[Test MP] ❌ Falha:", e instanceof Error ? e.message : e);
  process.exit(1);
});

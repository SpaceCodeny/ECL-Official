# Configuração Mercado Pago — Pagamentos PIX (Checkout Transparente)

Este documento descreve como configurar a integração com o Mercado Pago para aceitar
pagamentos PIX nas inscrições de campeonatos, usando o Checkout Transparente
(o QR Code é exibido diretamente no site, sem redirecionamento).

---

## 1. Criar aplicação no Mercado Pago

1. Acesse [https://www.mercadopago.com.br/developers](https://www.mercadopago.com.br/developers)
2. Entre com sua conta Mercado Pago (ou crie uma)
3. Acesse **Suas integrações** → **Criar aplicação**
4. Preencha o nome (ex: "ECL Pagamentos") e selecione o caso de uso de pagamentos online

---

## 2. Obter credenciais

1. Na aplicação criada, vá em **Credenciais**
2. Você verá dois ambientes:
   - **Teste (sandbox):** Access Token `TEST-...` e Public Key `TEST-...`
   - **Produção:** Access Token `APP_USR-...` e Public Key `APP_USR-...` (após validação da conta)

3. Copie o **Access Token** do ambiente desejado

> O Public Key não é necessário no backend — é usado apenas no frontend com os Bricks
> do Mercado Pago, que não utilizamos nesta integração.

---

## 3. Configurar variáveis de ambiente

No arquivo `.env` do backend, adicione:

```env
# Access Token (TEST-... em sandbox, APP_USR-... em produção)
MERCADOPAGO_ACCESS_TOKEN=TEST_xxxxxxxxxxxxxxxxxxxxxxxxxx

# Base URL da API (padrão, não precisa alterar)
MERCADOPAGO_API_URL=https://api.mercadopago.com

# Secret do webhook (configure após criar o webhook no passo 4)
MERCADOPAGO_WEBHOOK_SECRET=
```

---

## 4. Configurar webhook

Os webhooks permitem que o Mercado Pago notifique automaticamente quando um pagamento
é confirmado.

### 4.1. No painel do Mercado Pago

1. Em **Suas integrações** → aplicação → **Webhooks** → **Configurar notificação**
2. Configure as URLs:
   - **URL modo teste:** `https://seu-dominio.com/api/v1/payments/webhook/mercadopago`
   - **URL modo produção:** `https://seu-dominio.com/api/v1/payments/webhook/mercadopago`
3. Selecione o evento **Pagamentos** (`payment`)
4. Clique em **Salvar** — isso gera a **assinatura secreta** (secret)
5. Copie o secret gerado e adicione ao `.env` como `MERCADOPAGO_WEBHOOK_SECRET`

### 4.2. Testar webhook localmente (desenvolvimento)

Para testar webhooks em desenvolvimento local, use o **ngrok**:

```bash
ngrok http 3001
```

Copie a URL pública gerada (ex: `https://abc123.ngrok.io`) e configure:
```
https://abc123.ngrok.io/api/v1/payments/webhook/mercadopago
```

> O painel do Mercado Pago tem um **Simulador de notificações Webhooks** em
> Suas integrações → Webhooks → simular, onde você pode disparar eventos de teste.

---

## 5. Fluxo de pagamento PIX

### 5.1. Inscrição em campeonato pago

1. Admin cria um campeonato com `paymentRequired = true` e define `entryFeeAmount`
   em centavos (ex: `2000` = R$ 20,00)
2. Líder do time se inscreve no campeonato
3. Backend cria a inscrição com `status = PENDING` e `paymentStatus = PENDING`
4. Frontend exibe o modal "Pagamento via PIX"

### 5.2. Geração do pagamento PIX (Checkout Transparente)

1. Frontend chama `POST /api/v1/registrations/:id/payment-link`
2. Backend chama a API Mercado Pago: `POST /v1/payments` com:
   - `payment_method_id: "pix"`
   - `transaction_amount`: valor em reais (centavos / 100)
   - `external_reference`: registration UUID (correlaciona com o webhook)
   - `date_of_expiration`: expiração (padrão 72h, limite 30min–30 dias)
   - `payer.email`: e-mail do capitão
   - Header `X-Idempotency-Key`: UUID único (evita duplicidade)
3. Mercado Pago retorna:
   - `id` — ID do pagamento (salvo como `mpPaymentId`)
   - `point_of_interaction.transaction_data.qr_code` — código "copia e cola"
   - `point_of_interaction.transaction_data.qr_code_base64` — imagem PNG do QR Code (real)
   - `point_of_interaction.transaction_data.ticket_url` — URL de checkout (`paymentUrl`)
4. Backend salva apenas `mpPaymentId` e `paymentUrl` na inscrição (o QR Code não é
   armazenado — é buscado no MP em tempo real ao reabrir o modal)
5. Frontend exibe o QR Code (imagem base64 retornada pelo MP), botão copiar código
   e link alternativo de checkout

### 5.3. Pagamento e confirmação

1. Usuário escaneia o QR Code PIX no app do banco
2. Mercado Pago confirma o pagamento e envia webhook `payment` para o backend
3. Backend valida a assinatura HMAC-SHA256, busca o pagamento via API (`GET /v1/payments/{id}`)
   e atualiza conforme o status:
   - `approved` → `paymentStatus = PAID`, `paidAt = now()`
   - `rejected` / `cancelled` / `expired` → `paymentStatus = FAILED`
4. Inscrição continua com `status = PENDING` — aguarda aprovação manual do admin
5. Admin acessa painel, vê inscrições pagas e aprova manualmente

> Buscar o pagamento via API no webhook (em vez de confiar no payload) é uma prática
> de segurança recomendada — confirma o status na fonte.

---

## 6. Segurança

### Verificação de assinatura HMAC

Todos os webhooks recebidos são validados com HMAC-SHA256 usando o
`MERCADOPAGO_WEBHOOK_SECRET`.

Headers e query usados:
- `x-signature` → `ts=...,v1=...`
- `x-request-id` → ID da requisição
- `?data.id` → query param com o ID do recurso

Template assinado: `id:{dataId};request-id:{xRequestId};ts:{ts};`
(quando `dataId` está ausente, a parte `id:...;` é omitida).

Se a assinatura for inválida, o webhook é rejeitado com `401 Unauthorized`.

**Produção:** a verificação é **obrigatória** — o secret deve estar configurado.

**Desenvolvimento:** se o secret não estiver configurado, a verificação é pulada
e um aviso é logado.

---

## 7. Testes em sandbox

### Credenciais de teste

Use o Access Token `TEST-...` para o modo sandbox. Crie usuários de teste em
Suas integrações → Credenciais → Usuários de teste.

### Simular pagamento

1. Crie um pagamento via API (ou pelo frontend)
2. No painel: **Suas integrações → Webhooks → Simular notificação**
   - Evento: `payment`
   - Preencha o ID do pagamento criado
3. Verifique se o `paymentStatus` mudou para `PAID` no banco de dados

> No modo sandbox os QR Codes não geram pagamentos reais — use o simulador
> de webhooks para confirmar o fluxo completo.

---

## 8. Troubleshooting

### Webhook não está chegando

- Verifique se a URL do webhook está acessível publicamente (não pode ser `localhost`
  sem túnel como ngrok)
- Confirme que o evento `payment` está selecionado e a URL salva
- Verifique o painel → **Webhooks → Histórico de entregas**

### Assinatura inválida

- Confirme que o `MERCADOPAGO_WEBHOOK_SECRET` no `.env` corresponde ao secret
  exibido em Suas integrações → Webhooks
- Verifique se há espaços no secret copiado
- Lembre-se: a assinatura usa o template `id:{dataId};request-id:{xRequestId};ts:{ts};`

### Erro "MERCADOPAGO_ACCESS_TOKEN não configurado"

- Adicione o Access Token ao `.env`
- Reinicie o servidor backend

### Código PIX expira muito rápido

O padrão é 72 horas (limite Mercado Pago: 30min–30 dias). Para ajustar, edite
`expiresInHours` em `mercadopago.service.ts` (função `createPixPayment`).

---

## 9. Referências

- [Documentação oficial Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs)
- [Pix via Checkout Transparente](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/integration-configuration/integrate-pix)
- [Webhooks — Como funcionam](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)
- [API Reference — Payments](https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post)

---

## 10. Suporte

- **Central de ajuda:** https://www.mercadopago.com.br/ajuda
- **Devs no Discord/Portal:** https://www.mercadopago.com.br/developers/pt/community

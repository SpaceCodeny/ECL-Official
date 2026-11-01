-- Adiciona link do grupo do WhatsApp ao torneio (exibido após pagamento confirmado)
ALTER TABLE "Tournament" ADD COLUMN "whatsappGroupUrl" TEXT;

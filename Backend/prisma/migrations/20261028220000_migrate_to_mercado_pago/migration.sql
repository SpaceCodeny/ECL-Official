-- Migração do gateway Pagar.me/Stone para Mercado Pago
--
-- Renomeia colunas "stone*" para "mp*" preservando dados e adiciona o campo
-- para o código PIX "copia e cola" retornado pelo Mercado Pago.
-- A coluna "stoneLinkId" é removida (no MP o identificador único é o payment.id).

-- Tournament: stoneProductId -> mpPreferenceId
ALTER TABLE "Tournament" RENAME COLUMN "stoneProductId" TO "mpPreferenceId";

-- TournamentRegistration: stoneOrderId -> mpPaymentId
ALTER TABLE "TournamentRegistration" RENAME COLUMN "stoneOrderId" TO "mpPaymentId";

-- TournamentRegistration: remove stoneLinkId (consolidado em mpPaymentId)
ALTER TABLE "TournamentRegistration" DROP COLUMN "stoneLinkId";

-- TournamentRegistration: adiciona código PIX copia e cola
ALTER TABLE "TournamentRegistration" ADD COLUMN "pixQrCode" TEXT;

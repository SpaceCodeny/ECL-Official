-- Remove a coluna pixQrCode: o QR Code agora vem direto do Mercado Pago
-- (qr_code_base64) e é exibido em tempo real, sem armazenar no banco.
ALTER TABLE "TournamentRegistration" DROP COLUMN "pixQrCode";

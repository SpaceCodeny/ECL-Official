-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID', 'REFUNDED', 'FAILED');

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "entryFeeAmount" INTEGER,
ADD COLUMN     "entryFeeCurrency" TEXT DEFAULT 'BRL',
ADD COLUMN     "paymentRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stoneProductId" TEXT;

-- AlterTable
ALTER TABLE "TournamentRegistration" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "paymentUrl" TEXT,
ADD COLUMN     "stoneLinkId" TEXT,
ADD COLUMN     "stoneOrderId" TEXT;

-- CreateIndex
CREATE INDEX "TournamentRegistration_paymentStatus_idx" ON "TournamentRegistration"("paymentStatus");

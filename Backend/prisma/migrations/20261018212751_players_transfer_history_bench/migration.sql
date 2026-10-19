-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('ACTIVE', 'BENCH');

-- DropIndex
DROP INDEX "TeamMembership_teamId_playerId_key";

-- AlterTable
ALTER TABLE "PlayerProfile" ADD COLUMN     "status" "PlayerStatus" NOT NULL DEFAULT 'BENCH';

-- CreateTable
CREATE TABLE "PlayerTransferHistory" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "fromTeamId" TEXT,
    "fromTeamName" TEXT,
    "toTeamId" TEXT,
    "toTeamName" TEXT,
    "description" TEXT NOT NULL,
    "transferredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerTransferHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerTransferHistory_playerId_idx" ON "PlayerTransferHistory"("playerId");

-- CreateIndex
CREATE INDEX "PlayerTransferHistory_createdAt_idx" ON "PlayerTransferHistory"("createdAt");

-- CreateIndex
CREATE INDEX "PlayerProfile_status_idx" ON "PlayerProfile"("status");

-- CreateIndex
CREATE INDEX "TeamMembership_leftAt_idx" ON "TeamMembership"("leftAt");

-- AddForeignKey
ALTER TABLE "PlayerTransferHistory" ADD CONSTRAINT "PlayerTransferHistory_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

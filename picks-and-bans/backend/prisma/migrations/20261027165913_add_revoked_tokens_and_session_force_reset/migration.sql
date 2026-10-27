-- CreateTable
CREATE TABLE "RevokedToken" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedBy" TEXT NOT NULL,

    CONSTRAINT "RevokedToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RevokedToken_token_key" ON "RevokedToken"("token");

-- CreateIndex
CREATE INDEX "RevokedToken_token_idx" ON "RevokedToken"("token");

-- CreateIndex
CREATE INDEX "RevokedToken_adminId_idx" ON "RevokedToken"("adminId");

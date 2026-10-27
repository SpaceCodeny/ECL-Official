-- CreateTable
CREATE TABLE "ActiveToken" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActiveToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActiveToken_token_key" ON "ActiveToken"("token");

-- CreateIndex
CREATE INDEX "ActiveToken_token_idx" ON "ActiveToken"("token");

-- CreateIndex
CREATE INDEX "ActiveToken_adminId_idx" ON "ActiveToken"("adminId");

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "bracketPosition" TEXT,
ADD COLUMN     "swissRoundId" TEXT;

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "presetConfig" JSONB,
ADD COLUMN     "presetId" TEXT;

-- CreateTable
CREATE TABLE "TournamentPreset" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitedTeam" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "bracketSlot" INTEGER NOT NULL,
    "reservedOpponent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitedTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwissRound" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwissRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwissCampaign" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "roundsPlayed" INTEGER NOT NULL DEFAULT 0,
    "roundDiff" INTEGER NOT NULL DEFAULT 0,
    "opponentsIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isEliminated" BOOLEAN NOT NULL DEFAULT false,
    "finalPosition" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwissCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPreset_slug_key" ON "TournamentPreset"("slug");

-- CreateIndex
CREATE INDEX "TournamentPreset_slug_idx" ON "TournamentPreset"("slug");

-- CreateIndex
CREATE INDEX "TournamentPreset_isActive_idx" ON "TournamentPreset"("isActive");

-- CreateIndex
CREATE INDEX "InvitedTeam_tournamentId_idx" ON "InvitedTeam"("tournamentId");

-- CreateIndex
CREATE INDEX "InvitedTeam_teamId_idx" ON "InvitedTeam"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "InvitedTeam_tournamentId_teamId_key" ON "InvitedTeam"("tournamentId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "InvitedTeam_tournamentId_bracketSlot_key" ON "InvitedTeam"("tournamentId", "bracketSlot");

-- CreateIndex
CREATE INDEX "SwissRound_tournamentId_idx" ON "SwissRound"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "SwissRound_tournamentId_roundNumber_key" ON "SwissRound"("tournamentId", "roundNumber");

-- CreateIndex
CREATE INDEX "SwissCampaign_tournamentId_idx" ON "SwissCampaign"("tournamentId");

-- CreateIndex
CREATE INDEX "SwissCampaign_teamId_idx" ON "SwissCampaign"("teamId");

-- CreateIndex
CREATE INDEX "SwissCampaign_wins_losses_idx" ON "SwissCampaign"("wins", "losses");

-- CreateIndex
CREATE UNIQUE INDEX "SwissCampaign_tournamentId_teamId_key" ON "SwissCampaign"("tournamentId", "teamId");

-- CreateIndex
CREATE INDEX "Match_swissRoundId_idx" ON "Match"("swissRoundId");

-- CreateIndex
CREATE INDEX "Match_bracketPosition_idx" ON "Match"("bracketPosition");

-- CreateIndex
CREATE INDEX "Tournament_presetId_idx" ON "Tournament"("presetId");

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "TournamentPreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitedTeam" ADD CONSTRAINT "InvitedTeam_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitedTeam" ADD CONSTRAINT "InvitedTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwissRound" ADD CONSTRAINT "SwissRound_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwissCampaign" ADD CONSTRAINT "SwissCampaign_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_swissRoundId_fkey" FOREIGN KEY ("swissRoundId") REFERENCES "SwissRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

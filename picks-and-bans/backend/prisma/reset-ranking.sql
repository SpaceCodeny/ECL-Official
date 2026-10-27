-- Zerar ranking mantendo os times cadastrados
UPDATE "RankingSnapshot" 
SET 
  points = 0,
  "matchesPlayed" = 0,
  wins = 0,
  losses = 0,
  "mapsWon" = 0,
  "mapsLost" = 0,
  titles = 0,
  "previousPosition" = NULL,
  "calculatedAt" = NOW()
WHERE TRUE;

-- Limpar histórico de pontos de torneios
TRUNCATE TABLE "TournamentRankingPoints" CASCADE;

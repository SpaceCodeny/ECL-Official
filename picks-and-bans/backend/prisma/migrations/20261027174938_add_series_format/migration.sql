-- CreateEnum
CREATE TYPE "SeriesFormat" AS ENUM ('BO1', 'BO3', 'BO5');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "seriesFormat" "SeriesFormat" NOT NULL DEFAULT 'BO3';

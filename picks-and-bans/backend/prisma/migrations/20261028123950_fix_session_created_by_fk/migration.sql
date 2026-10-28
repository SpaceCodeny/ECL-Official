-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_createdBy_fkey";

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

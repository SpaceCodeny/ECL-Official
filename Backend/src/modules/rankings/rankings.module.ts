import { Module } from "@nestjs/common";
import { RankingsController } from "./rankings.controller";
import { RankingsService } from "./rankings.service";
import { PrismaService } from "@/database/prisma.service";

@Module({
  controllers: [RankingsController],
  providers: [RankingsService, PrismaService],
  exports: [RankingsService],
})
export class RankingsModule {}

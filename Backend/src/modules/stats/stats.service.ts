import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/database/prisma.service";
import { TournamentStatus } from "@prisma/client";

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganizationStats() {
    const [tournamentsHeld, teamsRegistered, matchesPlayed, playersRegistered] =
      await this.prisma.$transaction([
        this.prisma.tournament.count({
          where: {
            status: { in: [TournamentStatus.COMPLETED, TournamentStatus.IN_PROGRESS] },
            deletedAt: null,
          },
        }),
        this.prisma.team.count({ where: { deletedAt: null, isActive: true } }),
        this.prisma.match.count({ where: { status: "COMPLETED" } }),
        this.prisma.playerProfile.count(),
      ]);

    return {
      tournamentsHeld,
      teamsRegistered,
      matchesPlayed,
      playersRegistered,
      isDemo: false,
    };
  }
}

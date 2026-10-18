import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/database/prisma.service";

@Injectable()
export class RankingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeamRanking(params: { limit?: number; season?: string }) {
    const { limit = 20, season } = params;

    // Se há snapshots para a temporada, retorna o mais recente por equipe.
    if (season) {
      const snapshots = await this.prisma.rankingSnapshot.findMany({
        where: { season },
        orderBy: [{ teamId: "asc" }, { snapshotAt: "desc" }],
        distinct: ["teamId"],
        take: limit,
        include: { team: { select: { id: true, slug: true, name: true, tag: true, logoUrl: true } } },
      });
      return snapshots.map((s) => ({
        position: s.position,
        previousPosition: s.previousPosition,
        team: s.team,
        points: s.points,
        wins: s.wins,
        losses: s.losses,
        titles: s.titles,
        matchesPlayed: s.wins + s.losses,
      }));
    }

    // Sem temporada: agrega resultados de todas as partidas completadas.
    const teams = await this.prisma.team.findMany({
      where: { deletedAt: null, isActive: true },
      select: {
        id: true, slug: true, name: true, tag: true, logoUrl: true,
        matchesA: { where: { status: "COMPLETED" }, select: { winnerTeamId: true, teamAId: true } },
        matchesB: { where: { status: "COMPLETED" }, select: { winnerTeamId: true, teamBId: true } },
      },
      take: limit,
    });

    const ranking = teams.map((t) => {
      const wins = [
        ...t.matchesA.filter((m) => m.winnerTeamId === t.id),
        ...t.matchesB.filter((m) => m.winnerTeamId === t.id),
      ].length;
      const played = t.matchesA.length + t.matchesB.length;
      const losses = played - wins;
      return {
        position: 0,
        previousPosition: null,
        team: { id: t.id, slug: t.slug, name: t.name, tag: t.tag, logoUrl: t.logoUrl },
        points: wins * 3,
        wins,
        losses,
        titles: 0,
        matchesPlayed: played,
      };
    });

    ranking.sort((a, b) => b.points - a.points || b.wins - a.wins);
    ranking.forEach((r, i) => { r.position = i + 1; });

    return ranking;
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@/database/prisma.service";
import { MatchStatus, SeriesFormat, UserRole } from "@prisma/client";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { hasAnyRole } from "@/common/utils/role-check";

export interface SubmitResultDto {
  scoreA: number;
  scoreB: number;
  maps?: { mapName: string; order: number; scoreA: number; scoreB: number }[];
}

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    tournamentId?: string;
    limit?: number;
  }) {
    const { page = 1, pageSize = 20, status, tournamentId, limit } = params;
    const take = limit ?? pageSize;
    const skip = limit ? 0 : (page - 1) * pageSize;

    const statuses = status
      ? (status.split(",") as MatchStatus[])
      : undefined;

    const where = {
      ...(statuses ? { status: { in: statuses } } : {}),
      ...(tournamentId ? { tournamentId } : {}),
    };

    const [matches, total] = await this.prisma.$transaction([
      this.prisma.match.findMany({
        where,
        skip,
        take,
        orderBy: { scheduledAt: "asc" },
        include: {
          teamA: { select: { id: true, slug: true, name: true, tag: true, logoUrl: true } },
          teamB: { select: { id: true, slug: true, name: true, tag: true, logoUrl: true } },
          winner: { select: { id: true, name: true } },
          stage: { select: { name: true, tournament: { select: { id: true, name: true, slug: true } } } },
          maps: { orderBy: { order: "asc" } },
        },
      }),
      this.prisma.match.count({ where }),
    ]);

    return { data: matches, total, page, pageSize: take, totalPages: Math.ceil(total / take) };
  }

  async findById(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        teamA: { select: { id: true, slug: true, name: true, tag: true, logoUrl: true } },
        teamB: { select: { id: true, slug: true, name: true, tag: true, logoUrl: true } },
        winner: { select: { id: true, name: true } },
        stage: {
          select: {
            name: true, order: true,
            tournament: { select: { id: true, name: true, slug: true } },
          },
        },
        group: { select: { name: true } },
        maps: { orderBy: { order: "asc" } },
        disputes: true,
      },
    });
    if (!match) throw new NotFoundException("Partida não encontrada");
    return match;
  }

  async submitResult(id: string, dto: SubmitResultDto, actor: JwtPayload) {
    this.assertRefereeOrAdmin(actor);

    const match = await this.prisma.match.findUnique({ where: { id } });
    if (!match) throw new NotFoundException("Partida não encontrada");
    if (match.status === MatchStatus.COMPLETED) {
      throw new BadRequestException("Resultado já registrado");
    }
    if (match.status === MatchStatus.CANCELLED) {
      throw new BadRequestException("Partida cancelada — não é possível registrar resultado");
    }

    // Valida coerência do placar para o formato da série
    this.validateScore(dto.scoreA, dto.scoreB, match.seriesFormat);

    const winnerId =
      dto.scoreA > dto.scoreB
        ? match.teamAId
        : dto.scoreB > dto.scoreA
        ? match.teamBId
        : null;

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.match.update({
        where: { id },
        data: {
          scoreA: dto.scoreA,
          scoreB: dto.scoreB,
          winnerTeamId: winnerId,
          status: MatchStatus.COMPLETED,
        },
      });

      // Atualiza mapas, se fornecidos
      if (dto.maps?.length) {
        await tx.matchMap.deleteMany({ where: { matchId: id } });
        await tx.matchMap.createMany({
          data: dto.maps.map((m) => ({
            matchId: id,
            mapName: m.mapName,
            order: m.order,
            scoreA: m.scoreA,
            scoreB: m.scoreB,
            winnerId: m.scoreA > m.scoreB ? match.teamAId : m.scoreB > m.scoreA ? match.teamBId : null,
            played: true,
          })),
        });
      }

      // Atualiza classificação se a partida pertence a um grupo
      if (match.groupId && winnerId) {
        await this.updateStandings(
          tx as typeof this.prisma,
          match.groupId,
          match.teamAId,
          match.teamBId,
          dto.scoreA,
          dto.scoreB,
          dto.maps ?? [],
        );
      }

      return updated;
    });

    return result;
  }

  async openDispute(matchId: string, reason: string, actor: JwtPayload) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException("Partida não encontrada");

    return this.prisma.matchDispute.create({
      data: { matchId, raisedById: actor.sub, reason },
    });
  }

  // ─── Classificação ──────────────────────────────────────────────────────────

  private async updateStandings(
    tx: typeof this.prisma,
    groupId: string,
    teamAId: string,
    teamBId: string,
    scoreA: number,
    scoreB: number,
    maps: { scoreA: number; scoreB: number }[],
  ) {
    const mapsA = maps.filter((m) => m.scoreA > m.scoreB).length;
    const mapsB = maps.filter((m) => m.scoreB > m.scoreA).length;

    const winA = scoreA > scoreB ? 1 : 0;
    const winB = scoreB > scoreA ? 1 : 0;

    const upsertStanding = async (teamId: string, won: number, lost: number, mw: number, ml: number) => {
      const existing = await tx.standing.findUnique({ where: { groupId_teamId: { groupId, teamId } } });
      if (existing) {
        await tx.standing.update({
          where: { id: existing.id },
          data: {
            played: existing.played + 1,
            wins: existing.wins + won,
            losses: existing.losses + lost,
            mapsWon: existing.mapsWon + mw,
            mapsLost: existing.mapsLost + ml,
            points: existing.points + (won * 3),
          },
        });
      } else {
        await tx.standing.create({
          data: {
            groupId,
            teamId,
            played: 1,
            wins: won,
            losses: lost,
            mapsWon: mw,
            mapsLost: ml,
            points: won * 3,
          },
        });
      }
    };

    await upsertStanding(teamAId, winA, winB, mapsA, mapsB);
    await upsertStanding(teamBId, winB, winA, mapsB, mapsA);
  }

  private validateScore(a: number, b: number, format: SeriesFormat) {
    const max = format === SeriesFormat.BO1 ? 1 : format === SeriesFormat.BO3 ? 2 : 3;
    if (a > max || b > max) {
      throw new BadRequestException(`Placar inválido para ${format}: máximo ${max} vitórias`);
    }
    if (a === max || b === max) return; // Série finalizada corretamente
    throw new BadRequestException("Placar não indica uma série finalizada");
  }

  private assertRefereeOrAdmin(actor: JwtPayload) {
    const allowed = [UserRole.ADMINISTRATOR, UserRole.SUPER_ADMIN, UserRole.REFEREE, UserRole.TOURNAMENT_ORGANIZER];
    if (!hasAnyRole(actor.role, ...allowed)) {
      throw new ForbiddenException("Sem permissão para registrar resultados");
    }
  }
}

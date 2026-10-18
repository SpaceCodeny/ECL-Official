import { ForbiddenException, Injectable } from "@nestjs/common";
import { AnnouncementType, UserRole } from "@prisma/client";
import { PrismaService } from "@/database/prisma.service";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { hasAnyRole } from "@/common/utils/role-check";

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { limit?: number; type?: string }) {
    const { limit = 20, type } = params;
    const typeFilter = type ? (type.split(",") as AnnouncementType[]) : undefined;

    const items = await this.prisma.announcement.findMany({
      where: {
        deletedAt: null,
        ...(typeFilter ? { type: { in: typeFilter } } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: { id: true, title: true, summary: true, type: true, publishedAt: true, coverUrl: true },
    });

    return { data: items, total: items.length, page: 1, pageSize: limit, totalPages: 1 };
  }

  async create(
    dto: { title: string; summary: string; content?: string; type?: string; tournamentId?: string },
    actor: JwtPayload,
  ) {
    const allowed = [UserRole.ADMINISTRATOR, UserRole.SUPER_ADMIN, UserRole.TOURNAMENT_ORGANIZER];
    if (!hasAnyRole(actor.role, ...allowed)) throw new ForbiddenException("Sem permissão");

    return this.prisma.announcement.create({
      data: {
        title: dto.title,
        summary: dto.summary,
        content: dto.content,
        type: (dto.type as AnnouncementType) ?? AnnouncementType.GENERAL,
        tournamentId: dto.tournamentId,
      },
    });
  }
}

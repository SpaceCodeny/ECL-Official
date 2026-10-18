import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@/database/prisma.service";
import {
  TournamentFormat,
  TournamentStatus,
  SeriesFormat,
  RegistrationStatus,
  UserRole,
} from "@prisma/client";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { slugify } from "@/common/utils/slugify";
import { hasAnyRole } from "@/common/utils/role-check";

// Transições válidas de status
const VALID_TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
  [TournamentStatus.DRAFT]: [TournamentStatus.PUBLISHED, TournamentStatus.CANCELLED],
  [TournamentStatus.PUBLISHED]: [TournamentStatus.REGISTRATION_OPEN, TournamentStatus.CANCELLED],
  [TournamentStatus.REGISTRATION_OPEN]: [TournamentStatus.REGISTRATION_CLOSED, TournamentStatus.CANCELLED],
  [TournamentStatus.REGISTRATION_CLOSED]: [TournamentStatus.IN_PROGRESS, TournamentStatus.CANCELLED],
  [TournamentStatus.IN_PROGRESS]: [TournamentStatus.COMPLETED, TournamentStatus.CANCELLED],
  [TournamentStatus.COMPLETED]: [],
  [TournamentStatus.CANCELLED]: [],
};

export interface CreateTournamentDto {
  name: string;
  season: string;
  description?: string;
  format: TournamentFormat;
  seriesFormat?: SeriesFormat;
  startDate?: string;
  endDate?: string;
  registrationDeadline?: string;
  maxTeams?: number;
  autoApprove?: boolean;
  prizePool?: string;
  rules?: string;
}

@Injectable()
export class TournamentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
  }) {
    const { page = 1, pageSize = 12, search, status } = params;
    const skip = (page - 1) * pageSize;

    const statuses = status
      ? (status.split(",").filter(Boolean) as TournamentStatus[])
      : undefined;

    const where = {
      deletedAt: null,
      ...(statuses?.length ? { status: { in: statuses } } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [tournaments, total] = await this.prisma.$transaction([
      this.prisma.tournament.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startDate: "desc" },
        select: {
          id: true, slug: true, name: true, season: true, status: true,
          format: true, seriesFormat: true, startDate: true, endDate: true,
          maxTeams: true, bannerUrl: true, prizePool: true,
          _count: { select: { registrations: { where: { status: RegistrationStatus.APPROVED } } } },
        },
      }),
      this.prisma.tournament.count({ where }),
    ]);

    const data = tournaments.map((t) => ({
      ...t,
      registeredTeams: t._count.registrations,
    }));

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findBySlug(slug: string) {
    const t = await this.prisma.tournament.findFirst({
      where: { slug, deletedAt: null },
      include: {
        registrations: {
          where: { status: RegistrationStatus.APPROVED },
          include: { team: { select: { id: true, slug: true, name: true, tag: true, logoUrl: true } } },
        },
        stages: {
          orderBy: { order: "asc" },
          include: { groups: { include: { standings: { include: { team: true }, orderBy: { points: "desc" } } } } },
        },
      },
    });
    if (!t) throw new NotFoundException("Campeonato não encontrado");

    const registeredTeams = t.registrations.length;
    return { ...t, registeredTeams };
  }

  async getFeatured() {
    // Prioridade: REGISTRATION_OPEN > IN_PROGRESS > PUBLISHED > próximo por data
    const featured = await this.prisma.tournament.findFirst({
      where: {
        deletedAt: null,
        status: { in: [TournamentStatus.REGISTRATION_OPEN, TournamentStatus.IN_PROGRESS, TournamentStatus.PUBLISHED] },
      },
      orderBy: [
        { status: "asc" },
        { startDate: "asc" },
      ],
      select: {
        id: true, slug: true, name: true, season: true, status: true,
        format: true, startDate: true, maxTeams: true, prizePool: true,
        bannerUrl: true, description: true,
        _count: { select: { registrations: { where: { status: RegistrationStatus.APPROVED } } } },
      },
    });
    if (!featured) return null;
    return { ...featured, registeredTeams: featured._count.registrations };
  }

  async create(dto: CreateTournamentDto, actor: JwtPayload) {
    this.assertAdmin(actor);
    const slug = slugify(dto.name);
    const existing = await this.prisma.tournament.findUnique({ where: { slug } });
    if (existing) throw new ConflictException("Campeonato com este nome já existe");

    return this.prisma.tournament.create({
      data: {
        ...dto,
        slug,
        seriesFormat: dto.seriesFormat ?? SeriesFormat.BO3,
        maxTeams: dto.maxTeams ?? 16,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        registrationDeadline: dto.registrationDeadline ? new Date(dto.registrationDeadline) : undefined,
        organizerId: actor.sub,
      },
    });
  }

  async update(id: string, dto: Partial<CreateTournamentDto>, actor: JwtPayload) {
    this.assertAdmin(actor);
    await this.getTournamentOrThrow(id);
    return this.prisma.tournament.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        registrationDeadline: dto.registrationDeadline ? new Date(dto.registrationDeadline) : undefined,
      },
    });
  }

  async transition(id: string, targetStatus: TournamentStatus, actor: JwtPayload) {
    this.assertAdmin(actor);
    const tournament = await this.getTournamentOrThrow(id);
    const allowed = VALID_TRANSITIONS[tournament.status];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Transição inválida: ${tournament.status} → ${targetStatus}`,
      );
    }
    return this.prisma.tournament.update({ where: { id }, data: { status: targetStatus } });
  }

  async getStandings(id: string) {
    return this.prisma.group.findMany({
      where: { stage: { tournamentId: id } },
      include: {
        standings: {
          include: { team: { select: { id: true, slug: true, name: true, tag: true, logoUrl: true } } },
          orderBy: [{ points: "desc" }, { wins: "desc" }, { mapsWon: "desc" }],
        },
      },
    });
  }

  async getBracket(id: string) {
    return this.prisma.tournamentStage.findMany({
      where: { tournamentId: id },
      orderBy: { order: "asc" },
      include: {
        matches: {
          include: {
            teamA: { select: { id: true, slug: true, name: true, tag: true, logoUrl: true } },
            teamB: { select: { id: true, slug: true, name: true, tag: true, logoUrl: true } },
            winner: { select: { id: true, slug: true, name: true } },
            maps: true,
          },
          orderBy: { scheduledAt: "asc" },
        },
      },
    });
  }

  // ─── Utils ──────────────────────────────────────────────────────────────────

  private async getTournamentOrThrow(id: string) {
    const t = await this.prisma.tournament.findFirst({ where: { id, deletedAt: null } });
    if (!t) throw new NotFoundException("Campeonato não encontrado");
    return t;
  }

  private assertAdmin(actor: JwtPayload) {
    if (!hasAnyRole(actor.role, UserRole.ADMINISTRATOR, UserRole.SUPER_ADMIN, UserRole.TOURNAMENT_ORGANIZER)) {
      throw new ForbiddenException("Sem permissão para gerenciar campeonatos");
    }
  }
}

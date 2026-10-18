import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@/database/prisma.service";
import { UserRole } from "@prisma/client";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { slugify } from "@/common/utils/slugify";
import { hasAnyRole } from "@/common/utils/role-check";

export interface CreateTeamDto {
  name: string;
  tag?: string;
  description?: string;
  logoUrl?: string;
}

export interface UpdateTeamDto {
  name?: string;
  tag?: string;
  description?: string;
  logoUrl?: string;
}

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { page?: number; pageSize?: number; search?: string; active?: boolean }) {
    const { page = 1, pageSize = 20, search, active = true } = params;
    const skip = (page - 1) * pageSize;

    const where = {
      deletedAt: null,
      ...(active !== undefined ? { isActive: active } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { tag: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [teams, total] = await this.prisma.$transaction([
      this.prisma.team.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: "asc" },
        select: {
          id: true, slug: true, name: true, tag: true, logoUrl: true,
          captainId: true, isActive: true, createdAt: true,
          _count: { select: { memberships: { where: { leftAt: null } } } },
        },
      }),
      this.prisma.team.count({ where }),
    ]);

    return { data: teams, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findBySlug(slug: string) {
    const team = await this.prisma.team.findFirst({
      where: { slug, deletedAt: null },
      include: {
        memberships: {
          where: { leftAt: null },
          include: { player: { include: { user: { select: { id: true, displayName: true, avatarUrl: true, username: true } } } } },
        },
      },
    });
    if (!team) throw new NotFoundException("Equipe não encontrada");
    return team;
  }

  async create(dto: CreateTeamDto, actor: JwtPayload) {
    // Verifica se o usuário já tem um PlayerProfile
    const profile = await this.prisma.playerProfile.findUnique({
      where: { userId: actor.sub },
    });
    if (!profile) throw new BadRequestException("Complete seu perfil de jogador antes de criar uma equipe");

    const slug = slugify(dto.name);
    const existing = await this.prisma.team.findFirst({ where: { OR: [{ name: dto.name }, { slug }] } });
    if (existing) throw new ConflictException("Já existe uma equipe com este nome");

    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        slug,
        tag: dto.tag,
        description: dto.description,
        logoUrl: dto.logoUrl,
        captainId: profile.id,
        memberships: {
          create: { playerId: profile.id, role: "CAPTAIN" },
        },
      },
    });

    // Atualiza o papel do usuário para TEAM_CAPTAIN
    if (hasAnyRole(actor.role, UserRole.VISITOR, UserRole.PLAYER)) {
      await this.prisma.user.update({
        where: { id: actor.sub },
        data: { role: UserRole.TEAM_CAPTAIN },
      });
    }

    return team;
  }

  async update(id: string, dto: UpdateTeamDto, actor: JwtPayload) {
    const team = await this.getTeamOrThrow(id);
    await this.assertCaptainOrAdmin(team.captainId, actor);

    const data: Record<string, unknown> = { ...dto };
    if (dto.name) {
      const slug = slugify(dto.name);
      const conflict = await this.prisma.team.findFirst({ where: { slug, NOT: { id } } });
      if (conflict) throw new ConflictException("Nome já em uso por outra equipe");
      data.slug = slug;
    }

    return this.prisma.team.update({ where: { id }, data });
  }

  async invitePlayer(teamId: string, email: string, actor: JwtPayload) {
    const team = await this.getTeamOrThrow(teamId);
    await this.assertCaptainOrAdmin(team.captainId, actor);

    const existing = await this.prisma.teamInvitation.findFirst({
      where: { teamId, email, status: "PENDING", expiresAt: { gt: new Date() } },
    });
    if (existing) throw new ConflictException("Convite já enviado para este e-mail");

    const expiresAt = new Date(Date.now() + 7 * 86400000);
    return this.prisma.teamInvitation.create({
      data: { teamId, invitedById: actor.sub, email, expiresAt },
    });
  }

  async removeMember(teamId: string, playerId: string, actor: JwtPayload) {
    const team = await this.getTeamOrThrow(teamId);
    await this.assertCaptainOrAdmin(team.captainId, actor);

    const membership = await this.prisma.teamMembership.findFirst({
      where: { teamId, playerId, leftAt: null },
    });
    if (!membership) throw new NotFoundException("Jogador não encontrado na equipe");
    if (membership.role === "CAPTAIN") throw new BadRequestException("Transfira a liderança antes de remover o capitão");

    await this.prisma.teamMembership.update({
      where: { id: membership.id },
      data: { leftAt: new Date() },
    });
    return { message: "Jogador removido da equipe" };
  }

  // ─── Utils privados ──────────────────────────────────────────────────────────

  private async getTeamOrThrow(id: string) {
    const team = await this.prisma.team.findFirst({ where: { id, deletedAt: null } });
    if (!team) throw new NotFoundException("Equipe não encontrada");
    return team;
  }

  private async assertCaptainOrAdmin(captainId: string, actor: JwtPayload) {
    const isAdmin = hasAnyRole(actor.role, UserRole.ADMINISTRATOR, UserRole.SUPER_ADMIN);
    const isCaptain = actor.sub === captainId;
    if (!isAdmin && !isCaptain) throw new ForbiddenException("Apenas o capitão ou administrador pode executar esta ação");
  }
}

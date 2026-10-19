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

/** DTO para criação de times pelo admin — designa capitão e membros por userId */
export interface AdminCreateTeamDto {
  name: string;
  tag?: string;
  description?: string;
  logoUrl?: string;
  captainUserId: string;
  memberUserIds?: string[];
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

  // ─── Listagem ────────────────────────────────────────────────────────────────

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
          include: {
            player: {
              include: {
                user: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
              },
            },
          },
        },
      },
    });
    if (!team) throw new NotFoundException("Equipe não encontrada");
    return team;
  }

  // ─── Criação por usuário comum (legado) ──────────────────────────────────────

  async create(dto: CreateTeamDto, actor: JwtPayload) {
    const profile = await this.prisma.playerProfile.findUnique({
      where: { userId: actor.sub },
    });
    if (!profile) throw new BadRequestException("Complete seu perfil de jogador antes de criar uma equipe");

    const slug = slugify(dto.name);
    const existing = await this.prisma.team.findFirst({ where: { OR: [{ name: dto.name }, { slug }] } });
    if (existing) throw new ConflictException("Já existe uma equipe com este nome");

    const team = await this.prisma.team.create({
      data: {
        name: dto.name, slug, tag: dto.tag, description: dto.description,
        logoUrl: dto.logoUrl, captainId: profile.id,
        memberships: { create: { playerId: profile.id, role: "CAPTAIN" } },
      },
    });

    if (hasAnyRole(actor.role, UserRole.VISITOR, UserRole.PLAYER)) {
      await this.prisma.user.update({
        where: { id: actor.sub },
        data: { role: UserRole.TEAM_CAPTAIN },
      });
    }

    return team;
  }

  // ─── Criação pelo admin — designa capitão e membros por userId ────────────────

  async adminCreateTeam(dto: AdminCreateTeamDto, actor: JwtPayload) {
    this.assertAdminRole(actor);

    const slug = slugify(dto.name);
    const existing = await this.prisma.team.findFirst({
      where: { OR: [{ name: dto.name }, { slug }] },
    });
    if (existing) throw new ConflictException("Já existe uma equipe com este nome");

    // Garante PlayerProfile para o capitão
    const captainProfile = await this.ensurePlayerProfile(dto.captainUserId);

    // Garante PlayerProfile para os demais membros
    const extraIds = (dto.memberUserIds ?? []).filter((id) => id !== dto.captainUserId);
    const memberProfiles = await Promise.all(
      extraIds.map((userId) => this.ensurePlayerProfile(userId)),
    );

    const team = await this.prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          name: dto.name, slug, tag: dto.tag, description: dto.description,
          logoUrl: dto.logoUrl,
          captainId: captainProfile.id,
          memberships: {
            create: [
              { playerId: captainProfile.id, role: "CAPTAIN" },
              ...memberProfiles.map((p) => ({ playerId: p.id, role: "PLAYER" })),
            ],
          },
        },
        include: {
          memberships: {
            include: {
              player: {
                include: {
                  user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
                },
              },
            },
          },
        },
      });

      // Promove capitão
      await tx.user.update({
        where: { id: dto.captainUserId },
        data: { role: UserRole.TEAM_CAPTAIN },
      });

      // Promove membros VISITOR → PLAYER
      if (extraIds.length > 0) {
        await tx.user.updateMany({
          where: { id: { in: extraIds }, role: UserRole.VISITOR },
          data: { role: UserRole.PLAYER },
        });
      }

      return newTeam;
    });

    return team;
  }

  // ─── Admin adiciona membro a uma equipe existente ─────────────────────────────

  async adminAddMember(
    teamId: string,
    userId: string,
    role: "PLAYER" | "SUBSTITUTE",
    actor: JwtPayload,
  ) {
    this.assertAdminRole(actor);

    await this.getTeamOrThrow(teamId);
    const profile = await this.ensurePlayerProfile(userId);

    const existing = await this.prisma.teamMembership.findFirst({
      where: { teamId, playerId: profile.id, leftAt: null },
    });
    if (existing) throw new ConflictException("Usuário já é membro desta equipe");

    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.teamMembership.create({
        data: { teamId, playerId: profile.id, role },
      });

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user?.role === UserRole.VISITOR) {
        await tx.user.update({ where: { id: userId }, data: { role: UserRole.PLAYER } });
      }

      return membership;
    });
  }

  // ─── Admin remove membro de uma equipe ───────────────────────────────────────

  async adminRemoveMember(teamId: string, membershipId: string, actor: JwtPayload) {
    this.assertAdminRole(actor);

    const membership = await this.prisma.teamMembership.findFirst({
      where: { id: membershipId, teamId, leftAt: null },
    });
    if (!membership) throw new NotFoundException("Membro não encontrado na equipe");
    if (membership.role === "CAPTAIN") throw new BadRequestException("Não é possível remover o capitão. Transfira a liderança primeiro.");

    return this.prisma.teamMembership.update({
      where: { id: membershipId },
      data: { leftAt: new Date() },
    });
  }

  // ─── Atualização ─────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateTeamDto, actor: JwtPayload) {
    const team = await this.getTeamOrThrow(id);
    await this.assertCaptainOrAdmin(team.captainId, actor);

    const data: Record<string, unknown> = { ...dto };
    if (dto.name) {
      const newSlug = slugify(dto.name);
      const conflict = await this.prisma.team.findFirst({ where: { slug: newSlug, NOT: { id } } });
      if (conflict) throw new ConflictException("Nome já em uso por outra equipe");
      data.slug = newSlug;
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

    return this.prisma.teamInvitation.create({
      data: {
        teamId, invitedById: actor.sub, email,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
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

  // ─── Helpers privados ─────────────────────────────────────────────────────────

  /** Garante que o usuário tem PlayerProfile, criando um se não existir. */
  async ensurePlayerProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException(`Usuário ${userId} não encontrado`);

    const existing = await this.prisma.playerProfile.findUnique({ where: { userId } });
    if (existing) return existing;

    return this.prisma.playerProfile.create({ data: { userId } });
  }

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

  private assertAdminRole(actor: JwtPayload) {
    if (!hasAnyRole(actor.role, UserRole.ADMINISTRATOR, UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException("Apenas administradores podem executar esta ação");
    }
  }
}

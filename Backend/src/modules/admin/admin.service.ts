import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@/database/prisma.service";
import {
  AuditAction,
  RegistrationStatus,
  TournamentStatus,
  UserStatus,
  UserRole,
  Prisma,
} from "@prisma/client";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { hasAnyRole } from "@/common/utils/role-check";

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  async getDashboard() {
    const [
      totalUsers,
      totalTeams,
      activeTournaments,
      pendingRegistrations,
      scheduledMatches,
      awaitingResultMatches,
      disputedMatches,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.team.count({ where: { deletedAt: null } }),
      this.prisma.tournament.count({
        where: { status: { in: [TournamentStatus.REGISTRATION_OPEN, TournamentStatus.IN_PROGRESS] }, deletedAt: null },
      }),
      this.prisma.tournamentRegistration.count({ where: { status: RegistrationStatus.PENDING } }),
      this.prisma.match.count({ where: { status: "SCHEDULED" } }),
      this.prisma.match.count({ where: { status: "AWAITING_RESULT" } }),
      this.prisma.matchDispute.count({ where: { status: "OPEN" } }),
    ]);

    // Atividade recente: últimos 10 registros de auditoria
    const recentActivity = await this.prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { displayName: true, username: true } } },
    });

    // Gráficos: inscrições ao longo do tempo (últimos 30 dias)
    const registrationsOverTime = await this.prisma.$queryRaw<
      { date: string; count: bigint }[]
    >`
      SELECT DATE_TRUNC('day', "submittedAt")::text as date, COUNT(*)::bigint as count
      FROM "TournamentRegistration"
      WHERE "submittedAt" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', "submittedAt")
      ORDER BY date DESC
    `;

    // Campeonatos por status
    const tournamentsByStatus = await this.prisma.tournament.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { status: true },
    });

    // Partidas concluídas
    const matchesCompleted = await this.prisma.match.count({
      where: { status: "COMPLETED" },
    });

    return {
      indicators: {
        totalUsers,
        totalTeams,
        activeTournaments,
        pendingRegistrations,
        scheduledMatches,
        awaitingResultMatches,
        disputedMatches,
        matchesCompleted,
      },
      charts: {
        registrationsOverTime: registrationsOverTime.map((r) => ({
          date: r.date,
          count: Number(r.count),
        })),
        tournamentsByStatus: tournamentsByStatus.map((t) => ({
          status: t.status,
          count: t._count.status,
        })),
      },
      recentActivity: recentActivity.map((log) => ({
        id: log.id,
        actor: log.actor?.displayName ?? "—",
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        createdAt: log.createdAt,
      })),
    };
  }

  // ─── Gerenciamento de usuários ───────────────────────────────────────────────

  async listUsers(params: { page?: number; pageSize?: number; search?: string; role?: string; status?: string }) {
    const { page = 1, pageSize = 20, search, role, status } = params;
    const skip = (page - 1) * pageSize;

    const where = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { displayName: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(role ? { role: role as UserRole } : {}),
      ...(status ? { status: status as UserStatus } : {}),
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where, skip, take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, username: true, email: true, displayName: true,
          role: true, status: true, emailVerified: true,
          lastLoginAt: true, createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /**
   * Igual a listUsers mas inclui playerProfile.id para uso na criação de equipes.
   * Permite ao frontend saber se um usuário já tem perfil de jogador.
   */
  async listUsersWithProfile(params: { page?: number; pageSize?: number; search?: string; role?: string; status?: string }) {
    const { page = 1, pageSize = 20, search, role, status } = params;
    const skip = (page - 1) * pageSize;

    const where = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { displayName: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(role ? { role: role as UserRole } : {}),
      ...(status ? { status: status as UserStatus } : {}),
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where, skip, take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, username: true, email: true, displayName: true,
          avatarUrl: true, role: true, status: true, createdAt: true,
          playerProfile: { select: { id: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async updateUserRole(userId: string, newRole: UserRole, actor: JwtPayload) {
    this.assertAdmin(actor);

    // Impede que admin remova/rebaixe a própria conta
    if (userId === actor.sub && newRole !== UserRole.SUPER_ADMIN && newRole !== UserRole.ADMINISTRATOR) {
      throw new BadRequestException("Você não pode rebaixar a própria conta administrativa");
    }

    const target = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!target) throw new NotFoundException("Usuário não encontrado");

    const before = { role: target.role };
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { role: newRole } });

    await this.audit(actor, AuditAction.UPDATE, "User", userId, before, { role: newRole });
    return updated;
  }

  async suspendUser(userId: string, actor: JwtPayload) {
    this.assertAdmin(actor);
    if (userId === actor.sub) throw new BadRequestException("Você não pode suspender a própria conta");

    const target = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!target) throw new NotFoundException("Usuário não encontrado");
    if (target.role === UserRole.SUPER_ADMIN) throw new ForbiddenException("Não é possível suspender um super administrador");

    const before = { status: target.status };
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { status: UserStatus.SUSPENDED } });
    // Revoga todas as sessões
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null }, data: { revokedAt: new Date() },
    });
    await this.audit(actor, AuditAction.SUSPEND, "User", userId, before, { status: UserStatus.SUSPENDED });
    return updated;
  }

  async reactivateUser(userId: string, actor: JwtPayload) {
    this.assertAdmin(actor);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE },
    });
    await this.audit(actor, AuditAction.UPDATE, "User", userId, null, { status: UserStatus.ACTIVE });
    return updated;
  }

  // ─── Auditoria ──────────────────────────────────────────────────────────────

  async listAuditLogs(params: { page?: number; pageSize?: number; entity?: string; actorId?: string }) {
    const { page = 1, pageSize = 50, entity, actorId } = params;
    const skip = (page - 1) * pageSize;

    const where = {
      ...(entity ? { entity } : {}),
      ...(actorId ? { actorId } : {}),
    };

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where, skip, take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { displayName: true, username: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data: logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ─── Helper de auditoria ────────────────────────────────────────────────────

  async audit(
    actor: JwtPayload,
    action: AuditAction,
    entity: string,
    entityId: string,
    before: unknown,
    after: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId: actor.sub,
        action,
        entity,
        entityId,
        before: before as Prisma.InputJsonValue,
        after: after as Prisma.InputJsonValue,
      },
    });
    this.logger.debug(`Audit: ${actor.username} ${action} ${entity}/${entityId}`);
  }

  private assertAdmin(actor: JwtPayload) {
    if (!hasAnyRole(actor.role, UserRole.ADMINISTRATOR, UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException("Sem permissão administrativa");
    }
  }
}

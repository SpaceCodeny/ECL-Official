import { Router, type Request, type Response, type NextFunction } from "express";
import { UserRole, UserStatus, MatchStatus, TournamentStatus } from "@prisma/client";
import { prisma } from "../database/prisma";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";

export const adminRouter = Router();

// Todos os endpoints admin exigem autenticação e role admin
adminRouter.use(authenticate);
adminRouter.use(authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR));

/**
 * @openapi
 * /api/v1/admin/dashboard:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Métricas do painel administrativo
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas do dashboard
 *       403:
 *         description: Acesso negado
 */
adminRouter.get(
  "/dashboard",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [
        totalUsers,
        pendingUsers,
        totalTeams,
        totalTournaments,
        ongoingTournaments,
        pendingRegistrations,
        recentMatches,
        recentActivity,
      ] = await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.user.count({ where: { deletedAt: null, status: "PENDING_VERIFICATION" } }),
        prisma.team.count({ where: { deletedAt: null, isActive: true } }),
        prisma.tournament.count({ where: { deletedAt: null } }),
        prisma.tournament.count({
          where: {
            deletedAt: null,
            status: { in: [TournamentStatus.IN_PROGRESS, TournamentStatus.REGISTRATION_OPEN] },
          },
        }),
        prisma.tournamentRegistration.count({ where: { status: "PENDING" } }),
        prisma.match.findMany({
          where: { status: MatchStatus.COMPLETED },
          orderBy: { updatedAt: "desc" },
          take: 5,
          include: {
            teamA: { select: { name: true, logoUrl: true } },
            teamB: { select: { name: true, logoUrl: true } },
          },
        }),
        prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            actor: { select: { id: true, username: true, displayName: true } },
          },
        }),
      ]);

      const [scheduledMatches, awaitingResultMatches, disputedMatches, matchesCompleted] = await Promise.all([
        prisma.match.count({ where: { status: MatchStatus.SCHEDULED } }),
        prisma.match.count({ where: { status: MatchStatus.AWAITING_RESULT } }),
        prisma.match.count({ where: { status: MatchStatus.DISPUTED } }),
        prisma.match.count({ where: { status: MatchStatus.COMPLETED } }),
      ]);

      res.json({
        indicators: {
          totalUsers,
          totalTeams,
          activeTournaments: ongoingTournaments,
          pendingRegistrations,
          scheduledMatches,
          awaitingResultMatches,
          disputedMatches,
          matchesCompleted,
        },
        charts: {
          registrationsOverTime: [],
          tournamentsByStatus: [],
        },
        recentActivity: recentActivity.map(log => ({
          id: log.id,
          actor: log.actor?.displayName || log.actor?.username || 'Sistema',
          action: log.action,
          entity: log.entity,
          entityId: log.entityId,
          createdAt: log.createdAt.toISOString(),
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/admin/audit-logs:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Logs de auditoria
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *       - in: query
 *         name: actorId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de logs de auditoria
 */
adminRouter.get(
  "/audit-logs",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, Number(req.query["page"]) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query["limit"]) || 20));
      const skip = (page - 1) * limit;
      const entity = req.query["entity"] as string | undefined;
      const actorId = req.query["actorId"] as string | undefined;

      const where = {
        ...(entity && { entity }),
        ...(actorId && { actorId }),
      };

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            actor: { select: { id: true, username: true, displayName: true } },
          },
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({
        data: logs,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/admin/users/pending:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Listar usuários pendentes de verificação
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários pendentes
 */
adminRouter.get(
  "/users/pending",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await prisma.user.findMany({
        where: { status: "PENDING_VERIFICATION", deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          createdAt: true,
        },
      });

      res.json(users);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/admin/users:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Listar todos os usuários
 */
adminRouter.get(
  "/users",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, Number(req.query["page"]) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(req.query["pageSize"]) || 20));
      const skip = (page - 1) * pageSize;
      const search = req.query["search"] as string | undefined;
      const role = req.query["role"] as UserRole | undefined;
      const status = req.query["status"] as UserStatus | undefined;

      const where: any = {
        deletedAt: null,
        ...(search && {
          OR: [
            { username: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { displayName: { contains: search, mode: "insensitive" as const } },
          ],
        }),
        ...(role && { role }),
        ...(status && { status }),
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            username: true,
            email: true,
            displayName: true,
            role: true,
            status: true,
            emailVerified: true,
            lastLoginAt: true,
            createdAt: true,
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        data: users,
        total,
        page,
        totalPages: Math.ceil(total / pageSize),
      });
    } catch (error) {
      next(error);
    }
  }
);

adminRouter.patch(
  "/users/:userId/role",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params["userId"] as string;
      const { role } = req.body;
      const user = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: { id: true, username: true, email: true, displayName: true, role: true, status: true, emailVerified: true, lastLoginAt: true, createdAt: true },
      });
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

adminRouter.post(
  "/users/:userId/suspend",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params["userId"] as string;
      await prisma.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
      res.json({ message: "Usuário suspenso com sucesso" });
    } catch (error) {
      next(error);
    }
  }
);

adminRouter.post(
  "/users/:userId/reactivate",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params["userId"] as string;
      await prisma.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
      res.json({ message: "Usuário reativado com sucesso" });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/admin/players:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Listar jogadores
 */
adminRouter.get(
  "/players",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, Number(req.query["page"]) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(req.query["pageSize"]) || 50));
      const skip = (page - 1) * pageSize;
      const search = req.query["search"] as string | undefined;

      const userWhere: any = {
        deletedAt: null,
        playerProfile: { isNot: null },
        ...(search && {
          OR: [
            { username: { contains: search, mode: "insensitive" as const } },
            { displayName: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: userWhere,
          skip,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            username: true,
            displayName: true,
            status: true,
            createdAt: true,
            playerProfile: {
              select: {
                standoffId: true,
                country: true,
                status: true,
                memberships: {
                  where: { leftAt: null },
                  select: {
                    team: {
                      select: { id: true, name: true, tag: true, logoUrl: true },
                    },
                  },
                },
              },
            },
          },
        }),
        prisma.user.count({ where: userWhere }),
      ]);

      const playersFormatted = users.map(user => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        standoffId: user.playerProfile?.standoffId || null,
        country: user.playerProfile?.country || null,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        currentTeam: user.playerProfile?.memberships[0]?.team || null,
      }));

      res.json({
        data: playersFormatted,
        total,
        page,
        totalPages: Math.ceil(total / pageSize),
      });
    } catch (error) {
      next(error);
    }
  }
);

adminRouter.get(
  "/players/:userId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params["userId"] as string;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          status: true,
          createdAt: true,
          playerProfile: {
            select: {
              standoffId: true,
              bio: true,
              country: true,
              status: true,
              memberships: {
                orderBy: { joinedAt: "desc" },
                select: {
                  team: { select: { id: true, name: true, tag: true, logoUrl: true } },
                  joinedAt: true,
                  leftAt: true,
                },
              },
            },
          },
        },
      });
      if (!user) {
        return res.status(404).json({ message: "Jogador não encontrado" });
      }
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

adminRouter.post(
  "/players",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, email, password, displayName, standoffId, bio, country } = req.body;
      
      // Usar argon2 para hash de senha (mesmo método usado em auth)
      const argon2 = await import("argon2");
      const hashedPassword = await argon2.hash(password);
      
      const user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash: hashedPassword,
          displayName,
          role: UserRole.PLAYER,
          status: UserStatus.ACTIVE,
          playerProfile: {
            create: {
              standoffId: standoffId || null,
              bio: bio || null,
              country: country || null,
              status: "BENCH",
            },
          },
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          status: true,
          createdAt: true,
          playerProfile: {
            select: {
              standoffId: true,
              country: true,
              status: true,
            },
          },
        },
      });
      
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }
);

adminRouter.post(
  "/players/:userId/transfer",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params["userId"] as string;
      const { toTeamId, force } = req.body;
      
      // Buscar PlayerProfile
      const playerProfile = await prisma.playerProfile.findUnique({
        where: { userId },
      });
      
      if (!playerProfile) {
        return res.status(404).json({ message: "Jogador não encontrado" });
      }
      
      // Desativar membership atual
      await prisma.teamMembership.updateMany({
        where: { playerId: playerProfile.id, leftAt: null },
        data: { leftAt: new Date() },
      });
      
      // Criar novo membership se toTeamId fornecido
      if (toTeamId) {
        await prisma.teamMembership.create({
          data: {
            playerId: playerProfile.id,
            teamId: toTeamId,
            joinedAt: new Date(),
          },
        });
        
        await prisma.playerProfile.update({
          where: { id: playerProfile.id },
          data: { status: "ACTIVE" },
        });
      } else {
        await prisma.playerProfile.update({
          where: { id: playerProfile.id },
          data: { status: "BENCH" },
        });
      }
      
      res.json({ message: "Transferência realizada com sucesso" });
    } catch (error) {
      next(error);
    }
  }
);

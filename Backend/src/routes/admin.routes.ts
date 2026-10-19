import { Router, type Request, type Response, type NextFunction } from "express";
import { UserRole, MatchStatus, TournamentStatus } from "@prisma/client";
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

      res.json({
        metrics: {
          users: { total: totalUsers, pending: pendingUsers },
          teams: totalTeams,
          tournaments: { total: totalTournaments, ongoing: ongoingTournaments },
          pendingRegistrations,
        },
        recentMatches,
        recentActivity,
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

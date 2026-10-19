import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../database/prisma";
import { authenticate } from "../middlewares/auth";
import { AppError, getParam } from "../utils/app-error";

export const notificationsRouter = Router();

/**
 * @openapi
 * /api/v1/notifications:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Listar notificações do usuário autenticado
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unread
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de notificações
 */
notificationsRouter.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, Number(req.query["page"]) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query["limit"]) || 20));
      const skip = (page - 1) * limit;
      const unread = req.query["unread"] === "true";

      const where = {
        userId: req.user!.sub,
        ...(unread && { read: false }),
      };

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { userId: req.user!.sub, read: false } }),
      ]);

      res.json({
        data: notifications,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        unreadCount,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     tags:
 *       - Notifications
 *     summary: Marcar notificação como lida
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notificação marcada como lida
 */
notificationsRouter.patch(
  "/:id/read",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notification = await prisma.notification.findFirst({
        where: { id: getParam(req.params, "id"), userId: req.user!.sub },
      });
      if (!notification) throw AppError.notFound("Notificação não encontrada");

      const updated = await prisma.notification.update({
        where: { id: getParam(req.params, "id") },
        data: { read: true },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/notifications/read-all:
 *   patch:
 *     tags:
 *       - Notifications
 *     summary: Marcar todas as notificações como lidas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Todas notificações marcadas como lidas
 */
notificationsRouter.patch(
  "/read-all",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { count } = await prisma.notification.updateMany({
        where: { userId: req.user!.sub, read: false },
        data: { read: true },
      });

      res.json({ updated: count });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/notifications/{id}:
 *   delete:
 *     tags:
 *       - Notifications
 *     summary: Deletar uma notificação
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Notificação removida
 */
notificationsRouter.delete(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notification = await prisma.notification.findFirst({
        where: { id: getParam(req.params, "id"), userId: req.user!.sub },
      });
      if (!notification) throw AppError.notFound("Notificação não encontrada");

      await prisma.notification.delete({ where: { id: getParam(req.params, "id") } });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

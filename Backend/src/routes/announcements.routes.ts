import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { UserRole, AnnouncementType } from "@prisma/client";
import { prisma } from "../database/prisma";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { AppError, getParam } from "../utils/app-error";

export const announcementsRouter = Router();

const CreateAnnouncementSchema = z.object({
  title: z.string().min(3).max(200),
  summary: z.string().min(3).max(500),
  content: z.string().max(10000).optional(),
  type: z.nativeEnum(AnnouncementType).default(AnnouncementType.GENERAL),
  coverUrl: z.string().url().optional(),
  tournamentId: z.string().uuid().optional(),
});

const UpdateAnnouncementSchema = CreateAnnouncementSchema.partial();

/**
 * @openapi
 * /api/v1/announcements:
 *   get:
 *     tags:
 *       - Announcements
 *     summary: Listar comunicados
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
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: tournamentId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de comunicados
 */
announcementsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, Number(req.query["page"]) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query["limit"]) || 20));
      const skip = (page - 1) * limit;
      const type = req.query["type"] as AnnouncementType | undefined;
      const tournamentId = req.query["tournamentId"] as string | undefined;

      const where = {
        deletedAt: null,
        ...(type && { type }),
        ...(tournamentId && { tournamentId }),
      };

      const [announcements, total] = await Promise.all([
        prisma.announcement.findMany({
          where,
          skip,
          take: limit,
          orderBy: { publishedAt: "desc" },
          select: {
            id: true,
            title: true,
            summary: true,
            type: true,
            coverUrl: true,
            publishedAt: true,
            createdAt: true,
            tournamentId: true,
            tournament: { select: { id: true, name: true, slug: true } },
          },
        }),
        prisma.announcement.count({ where }),
      ]);

      res.json({
        data: announcements,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/announcements/{id}:
 *   get:
 *     tags:
 *       - Announcements
 *     summary: Detalhes de um comunicado
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dados do comunicado
 *       404:
 *         description: Comunicado não encontrado
 */
announcementsRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const announcement = await prisma.announcement.findFirst({
        where: { id: getParam(req.params, "id"), deletedAt: null },
        include: {
          tournament: { select: { id: true, name: true, slug: true } },
        },
      });

      if (!announcement) throw AppError.notFound("Comunicado não encontrado");

      res.json(announcement);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/announcements:
 *   post:
 *     tags:
 *       - Announcements
 *     summary: Criar comunicado (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - summary
 *             properties:
 *               title:
 *                 type: string
 *               summary:
 *                 type: string
 *               content:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comunicado criado
 */
announcementsRouter.post(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER),
  validate(CreateAnnouncementSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const announcement = await prisma.announcement.create({
        data: req.body,
      });

      res.status(201).json(announcement);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/announcements/{id}:
 *   patch:
 *     tags:
 *       - Announcements
 *     summary: Atualizar comunicado (admin)
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
 *         description: Comunicado atualizado
 */
announcementsRouter.patch(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER),
  validate(UpdateAnnouncementSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const announcement = await prisma.announcement.findFirst({
        where: { id: getParam(req.params, "id"), deletedAt: null },
      });
      if (!announcement) throw AppError.notFound("Comunicado não encontrado");

      const updated = await prisma.announcement.update({
        where: { id: getParam(req.params, "id") },
        data: req.body,
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/announcements/{id}:
 *   delete:
 *     tags:
 *       - Announcements
 *     summary: Deletar comunicado (soft delete, admin)
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
 *         description: Comunicado removido
 */
announcementsRouter.delete(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const announcement = await prisma.announcement.findFirst({
        where: { id: getParam(req.params, "id"), deletedAt: null },
      });
      if (!announcement) throw AppError.notFound("Comunicado não encontrado");

      await prisma.announcement.update({
        where: { id: getParam(req.params, "id") },
        data: { deletedAt: new Date() },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

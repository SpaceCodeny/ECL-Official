import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { prisma } from "../database/prisma";
import { authenticate } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { AppError, getParam } from "../utils/app-error";

export const playersRouter = Router();

const UpdatePlayerSchema = z.object({
  standoffId: z.string().max(50).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  country: z.string().max(50).optional().nullable(),
}).strict();

/**
 * @openapi
 * /api/v1/players:
 *   get:
 *     tags:
 *       - Players
 *     summary: Listar jogadores
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, BENCH]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de jogadores
 */
playersRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, Number(req.query["page"]) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query["limit"]) || 20));
      const skip = (page - 1) * limit;
      const search = req.query["search"] as string | undefined;
      const status = req.query["status"] as "ACTIVE" | "BENCH" | undefined;

      const where = {
        user: { deletedAt: null },
        ...(status && { status }),
        ...(search && {
          user: {
            deletedAt: null,
            OR: [
              { displayName: { contains: search, mode: "insensitive" as const } },
              { username: { contains: search, mode: "insensitive" as const } },
            ],
          },
        }),
      };

      const [players, total] = await Promise.all([
        prisma.playerProfile.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            memberships: {
              where: { leftAt: null },
              select: {
                role: true,
                team: { select: { id: true, name: true, slug: true, logoUrl: true } },
              },
            },
          },
        }),
        prisma.playerProfile.count({ where }),
      ]);

      res.json({
        data: players,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/players/{id}:
 *   get:
 *     tags:
 *       - Players
 *     summary: Detalhes de um jogador
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dados do jogador
 *       404:
 *         description: Jogador não encontrado
 */
playersRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const player = await prisma.playerProfile.findFirst({
        where: {
          OR: [{ id: getParam(req.params, "id") }, { userId: getParam(req.params, "id") }],
          user: { deletedAt: null },
        },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true, createdAt: true } },
          memberships: {
            where: { leftAt: null },
            include: {
              team: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
            },
          },
        },
      });

      if (!player) throw AppError.notFound("Jogador não encontrado");

      res.json(player);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/players/{id}:
 *   patch:
 *     tags:
 *       - Players
 *     summary: Atualizar perfil do jogador
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               standoffId:
 *                 type: string
 *               bio:
 *                 type: string
 *               country:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil atualizado
 */
playersRouter.patch(
  "/:id",
  authenticate,
  validate(UpdatePlayerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const player = await prisma.playerProfile.findFirst({
        where: {
          OR: [{ id: getParam(req.params, "id") }, { userId: getParam(req.params, "id") }],
          user: { deletedAt: null },
        },
      });
      if (!player) throw AppError.notFound("Jogador não encontrado");

      const isAdmin = (req.user!.role === UserRole.SUPER_ADMIN || req.user!.role === UserRole.ADMINISTRATOR);
      if (player.userId !== req.user!.sub && !isAdmin) {
        throw AppError.forbidden("Você só pode editar seu próprio perfil");
      }

      const updated = await prisma.playerProfile.update({
        where: { id: player.id },
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
 * /api/v1/players/{id}/history:
 *   get:
 *     tags:
 *       - Players
 *     summary: Histórico de transferências do jogador
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Histórico de transferências
 */
playersRouter.get(
  "/:id/history",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const player = await prisma.playerProfile.findFirst({
        where: {
          OR: [{ id: getParam(req.params, "id") }, { userId: getParam(req.params, "id") }],
          user: { deletedAt: null },
        },
      });
      if (!player) throw AppError.notFound("Jogador não encontrado");

      const history = await prisma.playerTransferHistory.findMany({
        where: { playerId: player.id },
        orderBy: { createdAt: "desc" },
      });

      res.json(history);
    } catch (error) {
      next(error);
    }
  }
);

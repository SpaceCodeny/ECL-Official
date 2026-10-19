import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "../database/prisma";
import { authenticate } from "../middlewares/auth";
import { authorize, authorizeOwnerOrAdmin } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { AppError, getParam } from "../utils/app-error";

export const usersRouter = Router();

const UpdateUserSchema = z.object({
  displayName: z.string().min(2).max(60).optional(),
  avatarUrl: z.string().url().optional().nullable(),
}).strict();

const UpdateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus).optional(),
}).strict();

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Listar todos os usuários (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de usuários
 *       403:
 *         description: Acesso negado
 */
usersRouter.get(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, Number(req.query["page"]) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query["limit"]) || 20));
      const skip = (page - 1) * limit;
      const role = req.query["role"] as UserRole | undefined;
      const status = req.query["status"] as UserStatus | undefined;

      const where = {
        deletedAt: null,
        ...(role && { role }),
        ...(status && { status }),
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            username: true,
            email: true,
            displayName: true,
            avatarUrl: true,
            role: true,
            status: true,
            createdAt: true,
            lastLoginAt: true,
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        data: users,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Detalhes de um usuário
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
 *         description: Dados do usuário
 *       404:
 *         description: Usuário não encontrado
 */
usersRouter.get(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findFirst({
        where: { id: getParam(req.params, "id"), deletedAt: null },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          status: true,
          createdAt: true,
          playerProfile: {
            select: {
              id: true,
              standoffId: true,
              bio: true,
              country: true,
              status: true,
              memberships: {
                where: { leftAt: null },
                select: {
                  role: true,
                  joinedAt: true,
                  team: { select: { id: true, name: true, slug: true, logoUrl: true } },
                },
              },
            },
          },
        },
      });

      if (!user) throw AppError.notFound("Usuário não encontrado");

      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Atualizar perfil do usuário
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
 *               displayName:
 *                 type: string
 *               avatarUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil atualizado
 *       403:
 *         description: Acesso negado
 */
usersRouter.patch(
  "/:id",
  authenticate,
  authorizeOwnerOrAdmin("id"),
  validate(UpdateUserSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findFirst({
        where: { id: getParam(req.params, "id"), deletedAt: null },
      });
      if (!user) throw AppError.notFound("Usuário não encontrado");

      const updated = await prisma.user.update({
        where: { id: getParam(req.params, "id") },
        data: req.body,
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          status: true,
          updatedAt: true,
        },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/users/{id}/role:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Atualizar role/status do usuário (admin)
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
 *         description: Role atualizado
 */
usersRouter.patch(
  "/:id/role",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR),
  validate(UpdateUserRoleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findFirst({
        where: { id: getParam(req.params, "id"), deletedAt: null },
      });
      if (!user) throw AppError.notFound("Usuário não encontrado");

      const updated = await prisma.user.update({
        where: { id: getParam(req.params, "id") },
        data: req.body,
        select: { id: true, username: true, role: true, status: true },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Remover usuário (soft delete, admin)
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
 *         description: Usuário removido
 */
usersRouter.delete(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findFirst({
        where: { id: getParam(req.params, "id"), deletedAt: null },
      });
      if (!user) throw AppError.notFound("Usuário não encontrado");

      await prisma.user.update({
        where: { id: getParam(req.params, "id") },
        data: { deletedAt: new Date(), status: UserStatus.DELETED },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

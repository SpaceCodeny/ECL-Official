import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { prisma } from "../database/prisma";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { AppError, getParam } from "../utils/app-error";

export const teamsRouter = Router();

const CreateTeamSchema = z.object({
  name: z.string().min(2).max(60),
  tag: z.string().min(2).max(6).optional(),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url().optional(),
});

const UpdateTeamSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  tag: z.string().min(2).max(6).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
}).strict();

const AddMemberSchema = z.object({
  playerId: z.string().uuid(),
  role: z.enum(["CAPTAIN", "PLAYER", "SUBSTITUTE"]).default("PLAYER"),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * @openapi
 * /api/v1/teams:
 *   get:
 *     tags:
 *       - Teams
 *     summary: Listar times
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
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de times
 */
teamsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, Number(req.query["page"]) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query["limit"]) || 20));
      const skip = (page - 1) * limit;
      const search = req.query["search"] as string | undefined;

      const where = {
        isActive: true,
        deletedAt: null,
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { tag: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [teams, total] = await Promise.all([
        prisma.team.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            tag: true,
            logoUrl: true,
            description: true,
            captainId: true,
            createdAt: true,
            _count: { select: { memberships: { where: { leftAt: null } } } },
          },
        }),
        prisma.team.count({ where }),
      ]);

      res.json({
        data: teams,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/teams:
 *   post:
 *     tags:
 *       - Teams
 *     summary: Criar time
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               tag:
 *                 type: string
 *               description:
 *                 type: string
 *               logoUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Time criado
 *       409:
 *         description: Nome já em uso
 */
teamsRouter.post(
  "/",
  authenticate,
  validate(CreateTeamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, tag, description, logoUrl } = req.body as z.infer<typeof CreateTeamSchema>;
      const captainId = req.user!.sub;
      const slug = slugify(name);

      const existing = await prisma.team.findFirst({
        where: { OR: [{ name }, { slug }], deletedAt: null },
      });
      if (existing) throw AppError.conflict("Nome de time já está em uso");

      // Verifica se o usuário tem perfil de jogador
      let player = await prisma.playerProfile.findUnique({ where: { userId: captainId } });
      if (!player) {
        player = await prisma.playerProfile.create({ data: { userId: captainId } });
      }

      const team = await prisma.$transaction(async (tx) => {
        const created = await tx.team.create({
          data: { name, slug, tag, description, logoUrl, captainId },
        });

        await tx.teamMembership.create({
          data: { teamId: created.id, playerId: player!.id, role: "CAPTAIN" },
        });

        return created;
      });

      res.status(201).json(team);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/teams/{slug}:
 *   get:
 *     tags:
 *       - Teams
 *     summary: Detalhes de um time por slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dados do time
 *       404:
 *         description: Time não encontrado
 */
teamsRouter.get(
  "/:slug",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = await prisma.team.findFirst({
        where: {
          OR: [{ slug: getParam(req.params, "slug") }, { id: getParam(req.params, "slug") }],
          deletedAt: null,
        },
        include: {
          memberships: {
            where: { leftAt: null },
            include: {
              player: {
                include: {
                  user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
                },
              },
            },
          },
        },
      });

      if (!team) throw AppError.notFound("Time não encontrado");

      res.json(team);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/teams/{id}:
 *   patch:
 *     tags:
 *       - Teams
 *     summary: Atualizar time
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
 *         description: Time atualizado
 */
teamsRouter.patch(
  "/:id",
  authenticate,
  validate(UpdateTeamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = await prisma.team.findFirst({
        where: { id: getParam(req.params, "id"), deletedAt: null },
      });
      if (!team) throw AppError.notFound("Time não encontrado");

      const isAdmin = (req.user!.role === UserRole.SUPER_ADMIN || req.user!.role === UserRole.ADMINISTRATOR);
      if (team.captainId !== req.user!.sub && !isAdmin) {
        throw AppError.forbidden("Apenas o capitão ou admin pode editar o time");
      }

      const updated = await prisma.team.update({
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
 * /api/v1/teams/{id}:
 *   delete:
 *     tags:
 *       - Teams
 *     summary: Deletar time (soft delete, admin)
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
 *         description: Time removido
 */
teamsRouter.delete(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = await prisma.team.findFirst({
        where: { id: getParam(req.params, "id"), deletedAt: null },
      });
      if (!team) throw AppError.notFound("Time não encontrado");

      await prisma.team.update({
        where: { id: getParam(req.params, "id") },
        data: { deletedAt: new Date(), isActive: false },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/teams/{id}/members:
 *   post:
 *     tags:
 *       - Teams
 *     summary: Adicionar membro ao time
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - playerId
 *             properties:
 *               playerId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [CAPTAIN, PLAYER, SUBSTITUTE]
 *     responses:
 *       201:
 *         description: Membro adicionado
 */
teamsRouter.post(
  "/:id/members",
  authenticate,
  validate(AddMemberSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = await prisma.team.findFirst({
        where: { id: getParam(req.params, "id"), deletedAt: null },
      });
      if (!team) throw AppError.notFound("Time não encontrado");

      const isAdmin = (req.user!.role === UserRole.SUPER_ADMIN || req.user!.role === UserRole.ADMINISTRATOR);
      if (team.captainId !== req.user!.sub && !isAdmin) {
        throw AppError.forbidden("Apenas o capitão ou admin pode adicionar membros");
      }

      const { playerId, role } = req.body as z.infer<typeof AddMemberSchema>;

      const player = await prisma.playerProfile.findUnique({ where: { id: playerId } });
      if (!player) throw AppError.notFound("Jogador não encontrado");

      const existing = await prisma.teamMembership.findFirst({
        where: { teamId: getParam(req.params, "id"), playerId, leftAt: null },
      });
      if (existing) throw AppError.conflict("Jogador já é membro deste time");

      const membership = await prisma.teamMembership.create({
        data: { teamId: getParam(req.params, "id"), playerId, role },
      });

      res.status(201).json(membership);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/teams/{id}/members/{playerId}:
 *   delete:
 *     tags:
 *       - Teams
 *     summary: Remover membro do time
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Membro removido
 */
teamsRouter.delete(
  "/:id/members/:playerId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = await prisma.team.findFirst({
        where: { id: getParam(req.params, "id"), deletedAt: null },
      });
      if (!team) throw AppError.notFound("Time não encontrado");

      const isAdmin = (req.user!.role === UserRole.SUPER_ADMIN || req.user!.role === UserRole.ADMINISTRATOR);
      if (team.captainId !== req.user!.sub && !isAdmin) {
        throw AppError.forbidden("Apenas o capitão ou admin pode remover membros");
      }

      const membership = await prisma.teamMembership.findFirst({
        where: { teamId: getParam(req.params, "id"), playerId: getParam(req.params, "playerId"), leftAt: null },
      });
      if (!membership) throw AppError.notFound("Membro não encontrado neste time");

      await prisma.teamMembership.update({
        where: { id: membership.id },
        data: { leftAt: new Date() },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/teams/admin:
 *   post:
 *     tags:
 *       - Teams
 *     summary: Criar time (admin) com múltiplos membros
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - captainUserId
 *             properties:
 *               name:
 *                 type: string
 *               tag:
 *                 type: string
 *               description:
 *                 type: string
 *               logoUrl:
 *                 type: string
 *               captainUserId:
 *                 type: string
 *               memberUserIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Time criado
 */
teamsRouter.post(
  "/admin",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, tag, description, logoUrl, captainUserId, memberUserIds = [] } = req.body;

      if (!name || !captainUserId) {
        throw AppError.badRequest("name e captainUserId são obrigatórios");
      }

      const slug = slugify(name);

      const existing = await prisma.team.findFirst({
        where: { OR: [{ name }, { slug }], deletedAt: null },
      });
      if (existing) throw AppError.conflict("Nome de time já está em uso");

      // Buscar ou criar perfis de jogador para capitão e membros
      const allUserIds = [captainUserId, ...memberUserIds];
      const playerProfiles = await Promise.all(
        allUserIds.map(async (userId) => {
          let profile = await prisma.playerProfile.findUnique({ where: { userId } });
          if (!profile) {
            profile = await prisma.playerProfile.create({ data: { userId } });
          }
          return { userId, profileId: profile.id };
        })
      );

      const team = await prisma.$transaction(async (tx) => {
        const created = await tx.team.create({
          data: { name, slug, tag, description, logoUrl, captainId: captainUserId },
        });

        // Adicionar capitão
        const captainProfile = playerProfiles.find(p => p.userId === captainUserId);
        await tx.teamMembership.create({
          data: { teamId: created.id, playerId: captainProfile!.profileId, role: "CAPTAIN" },
        });

        // Adicionar membros
        for (const userId of memberUserIds) {
          const memberProfile = playerProfiles.find(p => p.userId === userId);
          if (memberProfile) {
            await tx.teamMembership.create({
              data: { teamId: created.id, playerId: memberProfile.profileId, role: "PLAYER" },
            });
          }
        }

        return created;
      });

      res.status(201).json(team);
    } catch (error) {
      next(error);
    }
  }
);

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { UserRole, TournamentStatus, TournamentFormat, SeriesFormat } from "@prisma/client";
import { prisma } from "../database/prisma";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { AppError, getParam } from "../utils/app-error";

export const tournamentsRouter = Router();

const CreateTournamentSchema = z.object({
  name: z.string().min(3).max(100),
  season: z.string().min(1).max(20),
  description: z.string().max(2000).optional(),
  bannerUrl: z.string().url().optional(),
  format: z.nativeEnum(TournamentFormat),
  seriesFormat: z.nativeEnum(SeriesFormat).default(SeriesFormat.BO3),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  registrationDeadline: z.string().datetime().optional(),
  maxTeams: z.number().int().min(2).max(128).default(16),
  autoApprove: z.boolean().default(false),
  prizePool: z.string().max(100).optional(),
  rules: z.string().max(5000).optional(),
});

const UpdateTournamentSchema = CreateTournamentSchema.partial();

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
 * /api/v1/tournaments:
 *   get:
 *     tags:
 *       - Tournaments
 *     summary: Listar torneios
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
 *       - in: query
 *         name: season
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de torneios
 */
tournamentsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, Number(req.query["page"]) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query["limit"]) || 20));
      const skip = (page - 1) * limit;
      const status = req.query["status"] as string | undefined;
      const season = req.query["season"] as string | undefined;

      // Suporte para múltiplos status separados por vírgula
      const statusArray = status 
        ? status.split(',').map(s => s.trim()).filter(Boolean)
        : undefined;

      const where = {
        deletedAt: null,
        ...(statusArray && statusArray.length > 0 && {
          status: statusArray.length === 1 ? statusArray[0] as TournamentStatus : { in: statusArray as TournamentStatus[] }
        }),
        ...(season && { season }),
      };

      const [tournaments, total] = await Promise.all([
        prisma.tournament.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            slug: true,
            name: true,
            season: true,
            description: true,
            bannerUrl: true,
            status: true,
            format: true,
            seriesFormat: true,
            startDate: true,
            endDate: true,
            registrationDeadline: true,
            maxTeams: true,
            prizePool: true,
            createdAt: true,
            _count: { select: { registrations: true } },
          },
        }),
        prisma.tournament.count({ where }),
      ]);

      res.json({
        data: tournaments,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/tournaments:
 *   post:
 *     tags:
 *       - Tournaments
 *     summary: Criar torneio (admin/organizador)
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
 *               - season
 *               - format
 *             properties:
 *               name:
 *                 type: string
 *               season:
 *                 type: string
 *               format:
 *                 type: string
 *                 enum: [SINGLE_ELIMINATION, DOUBLE_ELIMINATION, ROUND_ROBIN, GROUP_STAGE_PLAYOFFS]
 *     responses:
 *       201:
 *         description: Torneio criado
 */
tournamentsRouter.post(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER),
  validate(CreateTournamentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as z.infer<typeof CreateTournamentSchema>;
      const slug = slugify(data.name);

      const existing = await prisma.tournament.findFirst({
        where: { OR: [{ name: data.name }, { slug }], deletedAt: null },
      });
      if (existing) throw AppError.conflict("Já existe um torneio com este nome");

      const tournament = await prisma.tournament.create({
        data: {
          ...data,
          slug,
          organizerId: req.user!.sub,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline) : undefined,
        },
      });

      res.status(201).json(tournament);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/tournaments/{slug}:
 *   get:
 *     tags:
 *       - Tournaments
 *     summary: Detalhes de um torneio por slug ou id
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dados do torneio
 *       404:
 *         description: Torneio não encontrado
 */
tournamentsRouter.get(
  "/:slug",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tournament = await prisma.tournament.findFirst({
        where: {
          OR: [{ slug: getParam(req.params, "slug") }, { id: getParam(req.params, "slug") }],
          deletedAt: null,
        },
        include: {
          registrations: {
            where: { status: "APPROVED" },
            include: {
              team: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
            },
          },
          stages: {
            orderBy: { order: "asc" },
            include: { groups: true },
          },
          _count: { select: { registrations: true } },
        },
      });

      if (!tournament) throw AppError.notFound("Torneio não encontrado");

      res.json(tournament);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/tournaments/{id}:
 *   patch:
 *     tags:
 *       - Tournaments
 *     summary: Atualizar torneio
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
 *         description: Torneio atualizado
 */
tournamentsRouter.patch(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER),
  validate(UpdateTournamentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id: getParam(req.params, "id"), deletedAt: null },
      });
      if (!tournament) throw AppError.notFound("Torneio não encontrado");

      const data = req.body;
      if (data.startDate) data.startDate = new Date(data.startDate);
      if (data.endDate) data.endDate = new Date(data.endDate);
      if (data.registrationDeadline) data.registrationDeadline = new Date(data.registrationDeadline);
      if (data.name) data.slug = slugify(data.name);

      const updated = await prisma.tournament.update({
        where: { id: getParam(req.params, "id") },
        data,
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/tournaments/{id}:
 *   delete:
 *     tags:
 *       - Tournaments
 *     summary: Deletar torneio (soft delete)
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
 *         description: Torneio removido
 */
tournamentsRouter.delete(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id: getParam(req.params, "id"), deletedAt: null },
      });
      if (!tournament) throw AppError.notFound("Torneio não encontrado");

      await prisma.tournament.update({
        where: { id: getParam(req.params, "id") },
        data: { deletedAt: new Date(), status: TournamentStatus.CANCELLED },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/tournaments/{id}/publish:
 *   post:
 *     tags:
 *       - Tournaments
 *     summary: Publicar torneio
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
 *         description: Torneio publicado
 */
tournamentsRouter.post(
  "/:id/publish",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id: getParam(req.params, "id"), deletedAt: null },
      });
      if (!tournament) throw AppError.notFound("Torneio não encontrado");
      if (tournament.status !== TournamentStatus.DRAFT) {
        throw AppError.badRequest("Apenas torneios em rascunho podem ser publicados");
      }

      const updated = await prisma.tournament.update({
        where: { id: getParam(req.params, "id") },
        data: { status: TournamentStatus.PUBLISHED },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/tournaments/{id}/open-registrations:
 *   post:
 *     tags:
 *       - Tournaments
 *     summary: Abrir inscrições do torneio
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
 *         description: Inscrições abertas
 */
tournamentsRouter.post(
  "/:id/open-registrations",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id: getParam(req.params, "id"), deletedAt: null },
      });
      if (!tournament) throw AppError.notFound("Torneio não encontrado");

      const updated = await prisma.tournament.update({
        where: { id: getParam(req.params, "id") },
        data: { status: TournamentStatus.REGISTRATION_OPEN },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /tournaments/:id/close-registrations ───────────────────────────────
tournamentsRouter.post(
  "/:id/close-registrations",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id: getParam(req.params, "id"), deletedAt: null },
      });
      if (!tournament) throw AppError.notFound("Torneio não encontrado");
      if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
        throw AppError.badRequest("Apenas torneios com inscrições abertas podem ter as inscrições encerradas");
      }

      const updated = await prisma.tournament.update({
        where: { id: getParam(req.params, "id") },
        data: { status: TournamentStatus.REGISTRATION_CLOSED },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /tournaments/:id/start ─────────────────────────────────────────────
tournamentsRouter.post(
  "/:id/start",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id: getParam(req.params, "id"), deletedAt: null },
      });
      if (!tournament) throw AppError.notFound("Torneio não encontrado");
      if (tournament.status !== TournamentStatus.REGISTRATION_CLOSED) {
        throw AppError.badRequest("Apenas torneios com inscrições encerradas podem ser iniciados");
      }

      const updated = await prisma.tournament.update({
        where: { id: getParam(req.params, "id") },
        data: { status: TournamentStatus.IN_PROGRESS },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /tournaments/:id/complete ──────────────────────────────────────────
tournamentsRouter.post(
  "/:id/complete",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id: getParam(req.params, "id"), deletedAt: null },
      });
      if (!tournament) throw AppError.notFound("Torneio não encontrado");
      if (tournament.status !== TournamentStatus.IN_PROGRESS) {
        throw AppError.badRequest("Apenas torneios em andamento podem ser finalizados");
      }

      const updated = await prisma.tournament.update({
        where: { id: getParam(req.params, "id") },
        data: { status: TournamentStatus.COMPLETED },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /tournaments/:id/cancel ────────────────────────────────────────────
// Cancela o torneio sem soft delete: permanece visível no admin como CANCELLED
// e invisível para usuários (a listagem pública filtra por status ativos).
tournamentsRouter.post(
  "/:id/cancel",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tournament = await prisma.tournament.findFirst({
        where: { id: getParam(req.params, "id"), deletedAt: null },
      });
      if (!tournament) throw AppError.notFound("Torneio não encontrado");
      if (tournament.status === TournamentStatus.CANCELLED) {
        throw AppError.badRequest("Torneio já está cancelado");
      }
      if (tournament.status === TournamentStatus.COMPLETED) {
        throw AppError.badRequest("Torneios finalizados não podem ser cancelados");
      }

      const updated = await prisma.tournament.update({
        where: { id: getParam(req.params, "id") },
        data: { status: TournamentStatus.CANCELLED },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /tournaments/:id/bracket ────────────────────────────────────────────
// Retorna as fases do torneio com suas partidas para montar o chaveamento.
// Fases de grupo (type=GROUP) incluem standings; fases eliminatórias incluem
// o bracket tradicional de mata-mata.
tournamentsRouter.get(
  "/:id/bracket",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stages = await prisma.tournamentStage.findMany({
        where: { tournamentId: getParam(req.params, "id") },
        orderBy: { order: "asc" },
        include: {
          groups: {
            orderBy: { order: "asc" },
            include: {
              standings: {
                orderBy: { points: "desc" },
                include: {
                  team: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
                },
              },
            },
          },
          matches: {
            orderBy: { scheduledAt: "asc" },
            include: {
              teamA: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
              teamB: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
              winner: { select: { id: true, name: true, slug: true } },
              group: { select: { id: true, name: true } },
            },
          },
        },
      });

      res.json(stages);
    } catch (error) {
      next(error);
    }
  }
);

// ─── PATCH /matches/:id/status ────────────────────────────────────────────────
// Atualiza o status de uma partida (iniciar, finalizar) com validação.

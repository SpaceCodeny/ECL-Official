import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { UserRole, RegistrationStatus, TournamentStatus } from "@prisma/client";
import { prisma } from "../database/prisma";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { AppError, getParam } from "../utils/app-error";

export const registrationsRouter = Router();

const CreateRegistrationSchema = z.object({
  teamId: z.string().uuid(),
});

const ReviewRegistrationSchema = z.object({
  notes: z.string().max(500).optional(),
});

/**
 * @openapi
 * /api/v1/registrations:
 *   get:
 *     tags:
 *       - Registrations
 *     summary: Listar inscrições (admin) ou por torneio via query param
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tournamentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de inscrições
 */
registrationsRouter.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tournamentId, teamId, status } = req.query;

      const isAdmin = [UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER]
        .includes(req.user!.role as any);

      const where = {
        ...(tournamentId && { tournamentId: tournamentId as string }),
        ...(teamId && { teamId: teamId as string }),
        ...(status && { status: status as RegistrationStatus }),
      };

      const registrations = await prisma.tournamentRegistration.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        include: {
          team: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
          tournament: { select: { id: true, name: true, slug: true, status: true } },
        },
      });

      res.json(registrations);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/registrations:
 *   post:
 *     tags:
 *       - Registrations
 *     summary: Inscrever time em torneio
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teamId
 *               - tournamentId
 *             properties:
 *               teamId:
 *                 type: string
 *               tournamentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Inscrição realizada
 *       409:
 *         description: Time já inscrito
 */
registrationsRouter.post(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { teamId, tournamentId } = z.object({
        teamId: z.string().uuid(),
        tournamentId: z.string().uuid(),
      }).parse(req.body);

      const tournament = await prisma.tournament.findFirst({
        where: { id: tournamentId, deletedAt: null },
      });
      if (!tournament) throw AppError.notFound("Torneio não encontrado");
      if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
        throw AppError.badRequest("As inscrições não estão abertas para este torneio");
      }

      const team = await prisma.team.findFirst({
        where: { id: teamId, deletedAt: null },
      });
      if (!team) throw AppError.notFound("Time não encontrado");

      const isAdmin = (req.user!.role === UserRole.SUPER_ADMIN || req.user!.role === UserRole.ADMINISTRATOR);
      if (team.captainId !== req.user!.sub && !isAdmin) {
        throw AppError.forbidden("Apenas o capitão pode inscrever o time");
      }

      const existing = await prisma.tournamentRegistration.findUnique({
        where: { tournamentId_teamId: { tournamentId, teamId } },
      });
      if (existing) throw AppError.conflict("Time já está inscrito neste torneio");

      const count = await prisma.tournamentRegistration.count({
        where: { tournamentId, status: RegistrationStatus.APPROVED },
      });
      if (count >= tournament.maxTeams) {
        throw AppError.badRequest("Torneio já atingiu o número máximo de times");
      }

      const registration = await prisma.tournamentRegistration.create({
        data: {
          tournamentId,
          teamId,
          status: tournament.autoApprove ? RegistrationStatus.APPROVED : RegistrationStatus.PENDING,
        },
        include: {
          team: { select: { id: true, name: true, slug: true, logoUrl: true } },
          tournament: { select: { id: true, name: true, slug: true } },
        },
      });

      res.status(201).json(registration);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/registrations/{id}/approve:
 *   patch:
 *     tags:
 *       - Registrations
 *     summary: Aprovar inscrição (admin)
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
 *         description: Inscrição aprovada
 */
registrationsRouter.patch(
  "/:id/approve",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER),
  validate(ReviewRegistrationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reg = await prisma.tournamentRegistration.findUnique({
        where: { id: getParam(req.params, "id") },
      });
      if (!reg) throw AppError.notFound("Inscrição não encontrada");
      if (reg.status !== RegistrationStatus.PENDING) {
        throw AppError.badRequest("Apenas inscrições pendentes podem ser aprovadas");
      }

      const updated = await prisma.tournamentRegistration.update({
        where: { id: getParam(req.params, "id") },
        data: {
          status: RegistrationStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedById: req.user!.sub,
          notes: req.body.notes,
        },
        include: {
          team: { select: { id: true, name: true, slug: true } },
          tournament: { select: { id: true, name: true } },
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
 * /api/v1/registrations/{id}/reject:
 *   patch:
 *     tags:
 *       - Registrations
 *     summary: Rejeitar inscrição (admin)
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
 *         description: Inscrição rejeitada
 */
registrationsRouter.patch(
  "/:id/reject",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER),
  validate(ReviewRegistrationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reg = await prisma.tournamentRegistration.findUnique({
        where: { id: getParam(req.params, "id") },
      });
      if (!reg) throw AppError.notFound("Inscrição não encontrada");
      if (reg.status !== RegistrationStatus.PENDING) {
        throw AppError.badRequest("Apenas inscrições pendentes podem ser rejeitadas");
      }

      const updated = await prisma.tournamentRegistration.update({
        where: { id: getParam(req.params, "id") },
        data: {
          status: RegistrationStatus.REJECTED,
          reviewedAt: new Date(),
          reviewedById: req.user!.sub,
          notes: req.body.notes,
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
 * /api/v1/registrations/{id}/withdraw:
 *   patch:
 *     tags:
 *       - Registrations
 *     summary: Retirar inscrição (capitão do time)
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
 *         description: Inscrição retirada
 */
registrationsRouter.patch(
  "/:id/withdraw",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reg = await prisma.tournamentRegistration.findUnique({
        where: { id: getParam(req.params, "id") },
        include: { team: true },
      });
      if (!reg) throw AppError.notFound("Inscrição não encontrada");
      if (reg.status === RegistrationStatus.WITHDRAWN) {
        throw AppError.badRequest("Inscrição já foi retirada");
      }

      const isAdmin = (req.user!.role === UserRole.SUPER_ADMIN || req.user!.role === UserRole.ADMINISTRATOR);
      if (reg.team.captainId !== req.user!.sub && !isAdmin) {
        throw AppError.forbidden("Apenas o capitão pode retirar a inscrição");
      }

      const updated = await prisma.tournamentRegistration.update({
        where: { id: getParam(req.params, "id") },
        data: { status: RegistrationStatus.WITHDRAWN },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { prisma } from "../database/prisma";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { AppError, getParam } from "../utils/app-error";

export const presetsRouter = Router();

const CreatePresetSchema = z.object({
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  version: z.string().default("1.0"),
  isActive: z.boolean().default(true),
  config: z.record(z.any()), // JSON flexível
});

const UpdatePresetSchema = CreatePresetSchema.partial();

/**
 * @openapi
 * /api/v1/presets:
 *   get:
 *     tags:
 *       - Presets
 *     summary: Listar presets de campeonatos
 *     parameters:
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de presets
 */
presetsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const activeOnly = req.query.activeOnly === "true";

      const presets = await prisma.tournamentPreset.findMany({
        where: activeOnly ? { isActive: true } : {},
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          version: true,
          isActive: true,
          config: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json(presets);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/presets/{slug}:
 *   get:
 *     tags:
 *       - Presets
 *     summary: Detalhes de um preset por slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dados do preset
 *       404:
 *         description: Preset não encontrado
 */
presetsRouter.get(
  "/:slug",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const preset = await prisma.tournamentPreset.findUnique({
        where: { slug: getParam(req.params, "slug") },
      });

      if (!preset) throw AppError.notFound("Preset não encontrado");

      res.json(preset);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/presets:
 *   post:
 *     tags:
 *       - Presets
 *     summary: Criar preset (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slug
 *               - name
 *               - config
 *             properties:
 *               slug:
 *                 type: string
 *               name:
 *                 type: string
 *               config:
 *                 type: object
 *     responses:
 *       201:
 *         description: Preset criado
 */
presetsRouter.post(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR),
  validate(CreatePresetSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as z.infer<typeof CreatePresetSchema>;

      const existing = await prisma.tournamentPreset.findUnique({
        where: { slug: data.slug },
      });
      if (existing) throw AppError.conflict("Já existe um preset com este slug");

      const preset = await prisma.tournamentPreset.create({
        data,
      });

      res.status(201).json(preset);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/presets/{id}:
 *   patch:
 *     tags:
 *       - Presets
 *     summary: Atualizar preset (admin)
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
 *         description: Preset atualizado
 */
presetsRouter.patch(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR),
  validate(UpdatePresetSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const preset = await prisma.tournamentPreset.findUnique({
        where: { id: getParam(req.params, "id") },
      });
      if (!preset) throw AppError.notFound("Preset não encontrado");

      const updated = await prisma.tournamentPreset.update({
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
 * /api/v1/presets/{id}:
 *   delete:
 *     tags:
 *       - Presets
 *     summary: Deletar preset (admin)
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
 *         description: Preset removido
 */
presetsRouter.delete(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const preset = await prisma.tournamentPreset.findUnique({
        where: { id: getParam(req.params, "id") },
      });
      if (!preset) throw AppError.notFound("Preset não encontrado");

      // Verifica se há campeonatos usando este preset
      const tournamentsCount = await prisma.tournament.count({
        where: { presetId: getParam(req.params, "id") },
      });

      if (tournamentsCount > 0) {
        throw AppError.badRequest(
          `Não é possível deletar este preset pois ${tournamentsCount} campeonato(s) o utilizam`
        );
      }

      await prisma.tournamentPreset.delete({
        where: { id: getParam(req.params, "id") },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/presets/{id}/duplicate:
 *   post:
 *     tags:
 *       - Presets
 *     summary: Duplicar preset com nova versão (admin)
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
 *               - slug
 *               - version
 *             properties:
 *               slug:
 *                 type: string
 *               version:
 *                 type: string
 *     responses:
 *       201:
 *         description: Preset duplicado
 */
presetsRouter.post(
  "/:id/duplicate",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug, version } = req.body as { slug: string; version: string };

      const original = await prisma.tournamentPreset.findUnique({
        where: { id: getParam(req.params, "id") },
      });
      if (!original) throw AppError.notFound("Preset não encontrado");

      const existing = await prisma.tournamentPreset.findUnique({
        where: { slug },
      });
      if (existing) throw AppError.conflict("Já existe um preset com este slug");

      const duplicated = await prisma.tournamentPreset.create({
        data: {
          slug,
          name: original.name,
          description: original.description,
          version,
          isActive: false, // Duplicado começa inativo
          config: original.config as any,
        },
      });

      res.status(201).json(duplicated);
    } catch (error) {
      next(error);
    }
  }
);

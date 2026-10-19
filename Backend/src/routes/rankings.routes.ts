import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../database/prisma";
import { getParam } from "../utils/app-error";

export const rankingsRouter = Router();

/**
 * @openapi
 * /api/v1/rankings:
 *   get:
 *     tags:
 *       - Rankings
 *     summary: Ranking geral (snapshot mais recente)
 *     parameters:
 *       - in: query
 *         name: season
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Ranking de times
 */
rankingsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(100, Math.max(1, Number(req.query["limit"]) || 20));
      const season = req.query["season"] as string | undefined;

      // Se informou season, busca por ela; caso contrário pega a mais recente
      let rankings;

      if (season) {
        rankings = await prisma.rankingSnapshot.findMany({
          where: { season },
          orderBy: { position: "asc" },
          take: limit,
          include: {
            team: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
          },
        });
      } else {
        // Pega o snapshot mais recente de cada time
        const latest = await prisma.rankingSnapshot.findFirst({
          orderBy: { snapshotAt: "desc" },
        });

        if (!latest) {
          return res.json({ data: [], season: null });
        }

        rankings = await prisma.rankingSnapshot.findMany({
          where: { season: latest.season },
          orderBy: { position: "asc" },
          take: limit,
          include: {
            team: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
          },
        });
      }

      res.json({ data: rankings, season: rankings[0]?.season ?? null });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/rankings/seasons:
 *   get:
 *     tags:
 *       - Rankings
 *     summary: Listar temporadas disponíveis
 *     responses:
 *       200:
 *         description: Lista de temporadas
 */
rankingsRouter.get(
  "/seasons",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const seasons = await prisma.rankingSnapshot.findMany({
        select: { season: true },
        distinct: ["season"],
        orderBy: { season: "desc" },
      });

      res.json(seasons.map((s) => s.season));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/rankings/season/{season}:
 *   get:
 *     tags:
 *       - Rankings
 *     summary: Ranking por temporada
 *     parameters:
 *       - in: path
 *         name: season
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ranking da temporada
 */
rankingsRouter.get(
  "/season/:season",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rankings = await prisma.rankingSnapshot.findMany({
        where: { season: getParam(req.params, "season") },
        orderBy: { position: "asc" },
        include: {
          team: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
        },
      });

      res.json({ data: rankings, season: getParam(req.params, "season") });
    } catch (error) {
      next(error);
    }
  }
);

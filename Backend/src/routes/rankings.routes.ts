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
 *     summary: Ranking geral (todos os times, com ou sem dados de ranking)
 *     parameters:
 *       - in: query
 *         name: season
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 200
 *     responses:
 *       200:
 *         description: Ranking de times (inclui times sem dados, ordenados por nome)
 */
rankingsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(500, Math.max(1, Number(req.query["limit"]) || 200));
      const season = req.query["season"] as string | undefined;

      // Busca TODOS os times ativos
      const allTeams = await prisma.team.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, slug: true, logoUrl: true, tag: true },
        orderBy: { name: "asc" },
      });

      // Determina qual season usar
      let targetSeason = season;
      if (!targetSeason) {
        const latest = await prisma.rankingSnapshot.findFirst({
          orderBy: { snapshotAt: "desc" },
        });
        targetSeason = latest?.season ?? new Date().getFullYear().toString();
      }

      // Busca os dados de ranking existentes para esta season
      const rankingData = await prisma.rankingSnapshot.findMany({
        where: { season: targetSeason },
        include: {
          team: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
        },
      });

      // Cria um Map para acesso rápido aos dados de ranking por teamId
      const rankingMap = new Map(rankingData.map((r) => [r.teamId, r]));

      // Monta o resultado final: combina todos os times com seus dados de ranking
      const rankings = allTeams.map((team) => {
        const ranking = rankingMap.get(team.id);
        if (ranking) {
          // Time tem dados no ranking
          return {
            ...ranking,
            matchesPlayed: ranking.wins + ranking.losses, // Calcula matches played
          };
        } else {
          // Time não tem dados — cria entrada virtual com zeros
          return {
            id: `virtual-${team.id}`, // ID temporário para não conflitar
            teamId: team.id,
            season: targetSeason,
            position: 9999, // Posição alta para ir para o final
            previousPosition: null,
            points: 0,
            wins: 0,
            losses: 0,
            titles: 0,
            matchesPlayed: 0,
            snapshotAt: new Date(),
            team,
          };
        }
      });

      // Ordena: primeiro por pontos decrescentes, depois por vitórias, depois por nome
      rankings.sort((a, b) => {
        // Times com dados de ranking primeiro
        const aHasData = a.points > 0 || a.wins > 0 || a.losses > 0;
        const bHasData = b.points > 0 || b.wins > 0 || b.losses > 0;
        
        if (aHasData !== bHasData) return bHasData ? 1 : -1;
        
        // Dentro do mesmo grupo, ordena por pontos, vitórias e nome
        if (a.points !== b.points) return b.points - a.points;
        if (a.wins !== b.wins) return b.wins - a.wins;
        return a.team.name.localeCompare(b.team.name);
      });

      // Recalcula as posições corretamente após a ordenação
      rankings.forEach((ranking, index) => {
        ranking.position = index + 1;
      });

      // Limita o resultado se necessário
      const limited = rankings.slice(0, limit);

      res.json({ data: limited, season: targetSeason });
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
 *     summary: Ranking por temporada (todos os times)
 *     parameters:
 *       - in: path
 *         name: season
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ranking da temporada (inclui todos os times)
 */
rankingsRouter.get(
  "/season/:season",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const season = getParam(req.params, "season");

      // Busca TODOS os times ativos
      const allTeams = await prisma.team.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, slug: true, logoUrl: true, tag: true },
        orderBy: { name: "asc" },
      });

      // Busca os dados de ranking existentes para esta season
      const rankingData = await prisma.rankingSnapshot.findMany({
        where: { season },
        include: {
          team: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
        },
      });

      // Cria um Map para acesso rápido aos dados de ranking por teamId
      const rankingMap = new Map(rankingData.map((r) => [r.teamId, r]));

      // Monta o resultado final: combina todos os times com seus dados de ranking
      const rankings = allTeams.map((team) => {
        const ranking = rankingMap.get(team.id);
        if (ranking) {
          // Time tem dados no ranking
          return {
            ...ranking,
            matchesPlayed: ranking.wins + ranking.losses, // Calcula matches played
          };
        } else {
          // Time não tem dados — cria entrada virtual com zeros
          return {
            id: `virtual-${team.id}`,
            teamId: team.id,
            season,
            position: 9999,
            previousPosition: null,
            points: 0,
            wins: 0,
            losses: 0,
            titles: 0,
            matchesPlayed: 0,
            snapshotAt: new Date(),
            team,
          };
        }
      });

      // Ordena: primeiro por pontos decrescentes, depois por vitórias, depois por nome
      rankings.sort((a, b) => {
        // Times com dados de ranking primeiro
        const aHasData = a.points > 0 || a.wins > 0 || a.losses > 0;
        const bHasData = b.points > 0 || b.wins > 0 || b.losses > 0;
        
        if (aHasData !== bHasData) return bHasData ? 1 : -1;
        
        // Dentro do mesmo grupo, ordena por pontos, vitórias e nome
        if (a.points !== b.points) return b.points - a.points;
        if (a.wins !== b.wins) return b.wins - a.wins;
        return a.team.name.localeCompare(b.team.name);
      });

      // Recalcula as posições corretamente após a ordenação
      rankings.forEach((ranking, index) => {
        ranking.position = index + 1;
      });

      res.json({ data: rankings, season });
    } catch (error) {
      next(error);
    }
  }
);

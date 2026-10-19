import { Router, type Request, type Response, type NextFunction } from "express";
import { MatchStatus, TournamentStatus } from "@prisma/client";
import { prisma } from "../database/prisma";
import { AppError, getParam } from "../utils/app-error";

export const statsRouter = Router();

/**
 * @openapi
 * /api/v1/stats/overview:
 *   get:
 *     tags:
 *       - Stats
 *     summary: Estatísticas gerais da liga
 *     responses:
 *       200:
 *         description: Estatísticas gerais
 */
statsRouter.get(
  "/overview",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [
        totalUsers,
        totalTeams,
        totalPlayers,
        totalTournaments,
        activeTournaments,
        totalMatches,
        completedMatches,
      ] = await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.team.count({ where: { deletedAt: null, isActive: true } }),
        prisma.playerProfile.count({ where: { user: { deletedAt: null } } }),
        prisma.tournament.count({ where: { deletedAt: null } }),
        prisma.tournament.count({
          where: {
            deletedAt: null,
            status: { in: [TournamentStatus.IN_PROGRESS, TournamentStatus.REGISTRATION_OPEN] },
          },
        }),
        prisma.match.count(),
        prisma.match.count({ where: { status: MatchStatus.COMPLETED } }),
      ]);

      res.json({
        users: totalUsers,
        teams: totalTeams,
        players: totalPlayers,
        tournaments: { total: totalTournaments, active: activeTournaments },
        matches: { total: totalMatches, completed: completedMatches },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/stats/teams/{id}:
 *   get:
 *     tags:
 *       - Stats
 *     summary: Estatísticas de um time
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estatísticas do time
 *       404:
 *         description: Time não encontrado
 */
statsRouter.get(
  "/teams/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = await prisma.team.findFirst({
        where: {
          OR: [{ id: getParam(req.params, "id") }, { slug: getParam(req.params, "id") }],
          deletedAt: null,
        },
      });
      if (!team) throw AppError.notFound("Time não encontrado");

      const [matchesA, matchesB, standings, rankingHistory] = await Promise.all([
        prisma.match.count({
          where: { teamAId: team.id, status: MatchStatus.COMPLETED },
        }),
        prisma.match.count({
          where: { teamBId: team.id, status: MatchStatus.COMPLETED },
        }),
        prisma.standing.findMany({
          where: { teamId: team.id },
          include: { group: { include: { stage: { include: { tournament: { select: { name: true, season: true } } } } } } },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.rankingSnapshot.findMany({
          where: { teamId: team.id },
          orderBy: { snapshotAt: "desc" },
          take: 10,
        }),
      ]);

      // Wins/losses totais
      const wins = await prisma.match.count({
        where: { winnerTeamId: team.id, status: MatchStatus.COMPLETED },
      });
      const totalMatches = matchesA + matchesB;
      const losses = totalMatches - wins;

      res.json({
        team: { id: team.id, name: team.name, slug: team.slug, logoUrl: team.logoUrl },
        matches: { total: totalMatches, wins, losses, winRate: totalMatches > 0 ? (wins / totalMatches * 100).toFixed(1) : 0 },
        standings,
        rankingHistory,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/stats/players/{id}:
 *   get:
 *     tags:
 *       - Stats
 *     summary: Estatísticas de um jogador
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estatísticas do jogador
 *       404:
 *         description: Jogador não encontrado
 */
statsRouter.get(
  "/players/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const player = await prisma.playerProfile.findFirst({
        where: {
          OR: [{ id: getParam(req.params, "id") }, { userId: getParam(req.params, "id") }],
          user: { deletedAt: null },
        },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      });
      if (!player) throw AppError.notFound("Jogador não encontrado");

      const [memberships, transferHistory] = await Promise.all([
        prisma.teamMembership.findMany({
          where: { playerId: player.id },
          include: { team: { select: { id: true, name: true, slug: true, logoUrl: true } } },
          orderBy: { joinedAt: "desc" },
        }),
        prisma.playerTransferHistory.findMany({
          where: { playerId: player.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

      res.json({
        player: {
          id: player.id,
          user: player.user,
          standoffId: player.standoffId,
          country: player.country,
          status: player.status,
        },
        teamsHistory: memberships,
        transferHistory,
        stats: {
          totalTeams: new Set(memberships.map(m => m.teamId)).size,
          currentTeam: memberships.find(m => m.leftAt === null)?.team ?? null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

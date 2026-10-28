import express from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, authorize } from '../../middleware/auth';

export const teamsRouter = express.Router();

// GET /api/v1/teams
teamsRouter.get('/', async (req, res, next) => {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { name: 'asc' },
    });

    res.json({ teams });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/teams
teamsRouter.post('/', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      slug: z.string().regex(/^[a-z0-9-]+$/),
      shortName: z.string().optional(),
      logoUrl: z.string().url().optional(),
    });

    const data = schema.parse(req.body);

    const team = await prisma.team.create({
      data,
    });

    res.json({ team });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/teams/:id
teamsRouter.get('/:id', async (req, res, next) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        tournaments: {
          include: {
            tournament: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: 'Time não encontrado' });
    }

    res.json({ team });
  } catch (error) {
    next(error);
  }
});

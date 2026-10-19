import { Router, type Request, type Response } from "express";
import { prisma } from "../database/prisma";

export const healthRouter = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check
 *     description: Verifica se a API está respondendo e se o banco de dados está acessível
 *     responses:
 *       200:
 *         description: API saudável
 *       503:
 *         description: Serviço indisponível
 */
healthRouter.get("/", async (req: Request, res: Response) => {
  try {
    // Testa conexão com o banco
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "connected",
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * @openapi
 * /health/ready:
 *   get:
 *     tags:
 *       - Health
 *     summary: Readiness check
 *     description: Verifica se a aplicação está pronta para receber requisições
 *     responses:
 *       200:
 *         description: Aplicação pronta
 */
healthRouter.get("/ready", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ready",
    timestamp: new Date().toISOString(),
  });
});

/**
 * @openapi
 * /health/live:
 *   get:
 *     tags:
 *       - Health
 *     summary: Liveness check
 *     description: Verifica se a aplicação está viva
 *     responses:
 *       200:
 *         description: Aplicação viva
 */
healthRouter.get("/live", (req: Request, res: Response) => {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
  });
});

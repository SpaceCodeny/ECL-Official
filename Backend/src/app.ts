import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { config } from "./config/environment";
import { errorHandler } from "./middlewares/error-handler";
import { notFoundHandler } from "./middlewares/not-found-handler";
import { requestLogger } from "./middlewares/request-logger";

// Rotas
import { healthRouter } from "./routes/health.routes";
import { authRouter } from "./routes/auth.routes";
import { usersRouter } from "./routes/users.routes";
import { teamsRouter } from "./routes/teams.routes";
import { tournamentsRouter } from "./routes/tournaments.routes";
import { registrationsRouter } from "./routes/registrations.routes";
import { matchesRouter } from "./routes/matches.routes";
import { rankingsRouter } from "./routes/rankings.routes";
import { announcementsRouter } from "./routes/announcements.routes";
import { statsRouter } from "./routes/stats.routes";
import { adminRouter } from "./routes/admin.routes";
import { notificationsRouter } from "./routes/notifications.routes";
import { uploadsRouter } from "./routes/uploads.routes";
import { playersRouter } from "./routes/players.routes";

export function createApp(): Express {
  const app = express();

  // ─── Trust proxy (necessário para Vercel/Railway/etc.) ─────────────────────
  app.set("trust proxy", 1);

  // ─── Segurança e performance ────────────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: false, // Desabilitado para permitir Swagger UI
    crossOriginEmbedderPolicy: false,
  }));
  app.use(compression());

  // ─── CORS ───────────────────────────────────────────────────────────────────
  app.use(cors({
    origin: config.CORS_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));

  // ─── Body parsing ───────────────────────────────────────────────────────────
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // ─── Rate limiting ──────────────────────────────────────────────────────────
  const limiter = rateLimit({
    windowMs: config.THROTTLE_TTL * 1000,
    max: config.THROTTLE_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Muitas requisições deste IP, tente novamente mais tarde",
  });
  app.use(limiter);

  // ─── Request logging ────────────────────────────────────────────────────────
  app.use(requestLogger);

  // ─── Arquivos estáticos (uploads locais) ───────────────────────────────────
  if (config.UPLOAD_PROVIDER !== "supabase") {
    app.use("/uploads", express.static(config.UPLOAD_DIR));
  }

  // ─── Swagger/OpenAPI documentation ──────────────────────────────────────────
  const swaggerOptions: swaggerJsdoc.Options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: config.APP_NAME,
        version: "1.0.0",
        description: "API REST da Elite Champions League — torneios de Standoff 2",
      },
      servers: [
        {
          url: config.APP_URL,
          description: `${config.NODE_ENV} server`,
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    apis: ["./src/routes/*.ts", "./dist/routes/*.js"],
  };
  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // ─── Health check (sem prefixo) ─────────────────────────────────────────────
  app.use("/health", healthRouter);

  // ─── API routes (com prefixo /api/v1) ──────────────────────────────────────
  const apiRouter = express.Router();
  apiRouter.use("/auth", authRouter);
  apiRouter.use("/users", usersRouter);
  apiRouter.use("/teams", teamsRouter);
  apiRouter.use("/tournaments", tournamentsRouter);
  apiRouter.use("/registrations", registrationsRouter);
  apiRouter.use("/matches", matchesRouter);
  apiRouter.use("/rankings", rankingsRouter);
  apiRouter.use("/announcements", announcementsRouter);
  apiRouter.use("/stats", statsRouter);
  apiRouter.use("/admin", adminRouter);
  apiRouter.use("/notifications", notificationsRouter);
  apiRouter.use("/uploads", uploadsRouter);
  apiRouter.use("/players", playersRouter);

  app.use("/api/v1", apiRouter);

  // ─── 404 handler ────────────────────────────────────────────────────────────
  app.use(notFoundHandler);

  // ─── Error handler (deve ser o último middleware) ───────────────────────────
  app.use(errorHandler);

  return app;
}

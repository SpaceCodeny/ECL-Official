/**
 * Vercel Serverless Function — Elite Champions League API
 *
 * Estratégia para cold start rápido:
 * - O NestJS inicializa de forma assíncrona
 * - Requests que chegam durante o bootstrap ficam em fila (queue)
 * - Quando o app fica pronto, todos são processados
 */

// ① Path aliases ANTES de qualquer import
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tsconfigPaths = require("tsconfig-paths") as typeof import("tsconfig-paths");
tsconfigPaths.register({
  baseUrl: require("path").resolve(__dirname, ".."),
  paths: { "@/*": ["src/*"] },
});

process.env.SERVERLESS = "true";

import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { IncomingMessage, ServerResponse } from "http";
import type { Express } from "express";
import { AppServerlessModule } from "../src/app-serverless.module";

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

// Estado do bootstrap
let appHandler: Handler | null = null;
let bootstrapError: Error | null = null;
let bootstrapPromise: Promise<void> | null = null;

// Fila de requests que chegaram durante o cold start
const pendingRequests: Array<{ req: IncomingMessage; res: ServerResponse }> = [];

function flushPending() {
  while (pendingRequests.length > 0) {
    const item = pendingRequests.shift();
    if (item && appHandler) appHandler(item.req, item.res);
  }
}

async function startBootstrap(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    try {
      const app = await NestFactory.create<NestExpressApplication>(AppServerlessModule, {
        logger: ["error", "warn"],
        bufferLogs: false,
        abortOnError: false,
      });

      const config = app.get(ConfigService);
      const rawOrigins = config.get<string>("CORS_ORIGINS") ?? "";
      const origins = rawOrigins.split(",").map((s: string) => s.trim()).filter(Boolean);

      app.enableCors({
        origin: origins.length ? origins : true,
        credentials: true,
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS", "HEAD"],
        allowedHeaders: ["Content-Type", "Authorization"],
      });

      (app.getHttpAdapter().getInstance() as Express).set("trust proxy", true);
      app.useBodyParser("json", { limit: "1mb" });
      app.setGlobalPrefix("api/v1", { exclude: ["health/(.*)", "health"] });

      const swaggerCfg = new DocumentBuilder()
        .setTitle("Elite Champions League API")
        .setVersion("1.0.0")
        .addBearerAuth()
        .build();
      SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swaggerCfg));

      await app.init();

      const expressInstance = app.getHttpAdapter().getInstance() as Express;
      appHandler = (req, res) => expressInstance(req as never, res as never);

      flushPending();
    } catch (err) {
      bootstrapError = err instanceof Error ? err : new Error(String(err));
      console.error("[Bootstrap] FATAL:", bootstrapError.message);
      // Responde todos os pendentes com 503
      while (pendingRequests.length > 0) {
        const item = pendingRequests.shift();
        if (item) {
          item.res.writeHead(503, { "Content-Type": "application/json" });
          item.res.end(JSON.stringify({
            statusCode: 503,
            message: "Service starting up, please retry",
            error: bootstrapError.message,
          }));
        }
      }
    }
  })();

  return bootstrapPromise;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  // Se já está pronto, processa direto
  if (appHandler) {
    appHandler(req, res);
    return;
  }

  // Se houve erro fatal no bootstrap
  if (bootstrapError) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      statusCode: 503,
      message: "Bootstrap failed",
      error: bootstrapError.message,
    }));
    return;
  }

  // Ainda inicializando — coloca na fila e inicia o bootstrap se necessário
  pendingRequests.push({ req, res });
  void startBootstrap();

  // Aguarda até 25s (limite Vercel pro = 60s, free = 10s)
  // Se ultrapassar, responde com 503
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      const idx = pendingRequests.findIndex((p) => p.req === req);
      if (idx !== -1) {
        pendingRequests.splice(idx, 1);
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          statusCode: 503,
          message: "Cold start timeout — retry in a few seconds",
        }));
      }
      resolve();
    }, 8000); // 8s — dentro do limite de 10s do plano free

    // Polling: checa se o app ficou pronto
    const check = setInterval(() => {
      if (appHandler || bootstrapError) {
        clearTimeout(timeout);
        clearInterval(check);
        resolve();
      }
    }, 100);
  });
}

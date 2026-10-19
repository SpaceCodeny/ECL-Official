/**
 * Vercel Serverless Function — Elite Champions League API
 *
 * A Vercel compila este arquivo com @vercel/node.
 * tsconfig-paths/register resolve os aliases @/* antes de qualquer import.
 */

// ① Registrar path aliases ANTES de qualquer import que use @/
// A Vercel executa a função a partir da raiz do projeto,
// então o tsconfig.json da raiz do Backend é encontrado automaticamente.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tsconfigPaths = require("tsconfig-paths") as typeof import("tsconfig-paths");
const tsconfigJson = require("../tsconfig.json") as { compilerOptions: { baseUrl?: string; paths?: Record<string, string[]> } };
tsconfigPaths.register({
  baseUrl: require("path").resolve(__dirname, ".."),
  paths: tsconfigJson.compilerOptions.paths ?? {},
});

// ② Sinalizar modo serverless
process.env.SERVERLESS = "true";

import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { IncomingMessage, ServerResponse } from "http";
import type { Express } from "express";
import { AppModule } from "../src/app.module";

type Handler = (req: IncomingMessage, res: ServerResponse) => void;
let cachedHandler: Handler | null = null;

async function getHandler(): Promise<Handler> {
  if (cachedHandler) return cachedHandler;

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ["error", "warn"],
    bufferLogs: false,
  });

  const config = app.get(ConfigService);
  const rawOrigins = config.get<string>("CORS_ORIGINS") ?? "";
  const origins = rawOrigins.split(",").map((s: string) => s.trim()).filter(Boolean);

  app.enableCors({
    origin: origins,
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
  cachedHandler = (req: IncomingMessage, res: ServerResponse) => {
    expressInstance(req as never, res as never);
  };

  return cachedHandler;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const fn = await getHandler();
    fn(req, res);
  } catch (err) {
    console.error("[Vercel] Bootstrap error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ statusCode: 500, message: "Internal Server Error" }));
  }
}

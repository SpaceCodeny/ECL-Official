/**
 * Entry point serverless para Vercel.
 *
 * Usa @vendia/serverless-express para adaptar o app NestJS/Express ao
 * modelo de funções da Vercel (request/response stateless).
 *
 * A instância do NestJS é cacheada entre invocações (warm start),
 * evitando o overhead de bootstrap em cada request.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import type { EnvConfig } from "./config/configuration";
import type { IncomingMessage, ServerResponse } from "http";

type VendiaHandler = (req: IncomingMessage, res: ServerResponse) => void;

let cachedHandler: VendiaHandler | null = null;

async function bootstrap(): Promise<VendiaHandler> {
  if (cachedHandler) return cachedHandler;

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
    logger: ["error", "warn"],
  });

  const config = app.get(ConfigService<EnvConfig, true>);
  const origins = config.get("CORS_ORIGINS", { infer: true });
  const appName = config.get("APP_NAME", { infer: true });

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.useBodyParser("json", { limit: "1mb" });

  app.setGlobalPrefix("api/v1", {
    exclude: ["health/(.*)", "health"],
  });

  const swaggerCfg = new DocumentBuilder()
    .setTitle(appName)
    .setDescription("API REST da Elite Champions League")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerCfg);
  SwaggerModule.setup("docs", app, document);

  await app.init();

  // Obtém o Express instance e envolve com @vendia/serverless-express
  const expressApp = app.getHttpAdapter().getInstance() as any;
  const serverlessExpress = require("@vendia/serverless-express") as (opts: { app: any }) => VendiaHandler;
  cachedHandler = serverlessExpress({ app: expressApp });

  return cachedHandler;
}

/**
 * Handler exportado — Vercel chama esta função para cada request.
 */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const fn = await bootstrap();
  fn(req, res);
}

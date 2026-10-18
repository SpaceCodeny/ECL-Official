import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import type { EnvConfig } from "./config/configuration";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService<EnvConfig, true>);
  const port = config.get("PORT", { infer: true });
  const origins = config.get("CORS_ORIGINS", { infer: true });
  const appName = config.get("APP_NAME", { infer: true });
  const env = config.get("NODE_ENV", { infer: true });

  // CORS restritivo — apenas origens explicitamente autorizadas.
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.useBodyParser("json", { limit: "1mb" });

  // Prefixo versionado da API; health permanece acessível na raiz.
  app.setGlobalPrefix("api/v1", {
    exclude: ["health/(.*)", "health"],
  });

  // Documentação OpenAPI/Swagger.
  const swaggerConfig = new DocumentBuilder()
    .setTitle(appName)
    .setDescription("API REST da Elite Champions League — torneios de Standoff 2")
    .setVersion("1.0.0")
    .addBearerAuth()
    .setExternalDoc("Documentação completa", "./README.md")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  await app.listen(port, () => {
    new Logger("Bootstrap").log(
      `${appName} rodando em ${env} na porta ${port} · API: /api/v1 · Docs: /docs`,
    );
  });
}

void bootstrap();

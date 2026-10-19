import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Wrapper do PrismaClient como provider injetável do NestJS.
 *
 * Em modo serverless (SERVERLESS=true), a conexão é lazy — o Prisma
 * conecta automaticamente no primeiro query. Isso reduz o cold start
 * em ~500ms evitando o $connect() explícito durante o bootstrap.
 *
 * Em modo servidor contínuo (dev/Railway), conecta ao iniciar para
 * validar as credenciais do banco imediatamente.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly isServerless = process.env.SERVERLESS === "true";

  async onModuleInit(): Promise<void> {
    if (this.isServerless) {
      // Serverless: conexão lazy — Prisma conecta no primeiro query.
      // Não bloqueia o bootstrap da função.
      this.logger.log("PrismaService pronto (modo serverless — conexão lazy)");
      return;
    }
    await this.$connect();
    this.logger.log("Conexão com PostgreSQL estabelecida");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

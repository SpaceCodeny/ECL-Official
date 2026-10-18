import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../database/prisma.service";
import { Public } from "@/common/decorators/public.decorator";

export interface HealthStatus {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  uptime: number;
  services: Record<string, "ok" | "down">;
}

/**
 * Health check da aplicação — usado por orquestradores e monitoramento.
 */
@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Verifica a saúde da aplicação e do banco de dados" })
  async check(): Promise<HealthStatus> {
    let db: "ok" | "down" = "ok";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = "down";
    }

    return {
      status: db === "ok" ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: db,
      },
    };
  }

  @Public()
  @Get("live")
  @ApiOperation({ summary: "Liveness probe simples" })
  liveness(): { status: string } {
    return { status: "alive" };
  }
}

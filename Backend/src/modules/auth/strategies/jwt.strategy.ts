import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "@/database/prisma.service";
import type { JwtPayload } from "../interfaces/jwt-payload.interface";
import type { EnvConfig } from "@/config/configuration";
import { UserStatus } from "@prisma/client";

/**
 * Estratégia JWT para access tokens.
 * Valida assinatura e verifica se o usuário ainda está ativo.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    configService: ConfigService<EnvConfig, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get("JWT_ACCESS_SECRET", { infer: true }),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Verifica no banco se o usuário ainda está ativo (não suspenso/deletado).
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true, role: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Conta inativa ou não encontrada");
    }

    return { ...payload, role: user.role, status: user.status };
  }
}

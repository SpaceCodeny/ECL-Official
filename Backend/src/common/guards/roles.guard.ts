import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { UserRole } from "@prisma/client";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { JwtPayload } from "@/modules/auth/interfaces/jwt-payload.interface";
import type { Request } from "express";

/**
 * Guard de autorização por papel.
 * Deve ser usado APÓS o JwtAuthGuard (exige usuário autenticado no request).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload }>();
    const user = request.user;

    if (!user) throw new ForbiddenException("Acesso negado");

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Esta operação requer um dos papéis: ${requiredRoles.join(", ")}`,
      );
    }

    return true;
  }
}

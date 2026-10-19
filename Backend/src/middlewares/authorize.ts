import type { Request, Response, NextFunction } from "express";
import { UserRole, UserStatus } from "@prisma/client";
import { AppError } from "../utils/app-error";

/**
 * Middleware de autorização por roles.
 * Verifica se o usuário autenticado possui uma das roles permitidas.
 * DEVE ser usado após o middleware authenticate.
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError("Autenticação necessária", 401, "Unauthorized");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        "Você não tem permissão para acessar este recurso",
        403,
        "Forbidden"
      );
    }

    // Verifica se a conta está ativa
    if (req.user.status !== UserStatus.ACTIVE) {
      throw new AppError(
        "Conta inativa ou suspensa",
        403,
        "AccountInactive"
      );
    }

    next();
  };
}

/**
 * Middleware para verificar se o usuário é o dono do recurso ou admin.
 * Útil para rotas como PATCH /users/:id onde o usuário pode editar apenas seu próprio perfil,
 * mas admins podem editar qualquer um.
 */
export function authorizeOwnerOrAdmin(userIdParam: string = "id") {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError("Autenticação necessária", 401, "Unauthorized");
    }

    const resourceUserId = req.params[userIdParam];
    const isOwner = req.user.sub === resourceUserId;
    const isAdmin = req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.ADMINISTRATOR;

    if (!isOwner && !isAdmin) {
      throw new AppError(
        "Você não tem permissão para acessar este recurso",
        403,
        "Forbidden"
      );
    }

    next();
  };
}

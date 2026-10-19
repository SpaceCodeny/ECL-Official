import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/environment";
import { AppError } from "../utils/app-error";
import type { JwtPayload } from "../types/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware de autenticação JWT.
 * Extrai e valida o token do header Authorization.
 * Anexa os dados do usuário em req.user.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError("Token não fornecido", 401, "Unauthorized");
    }

    const [bearer, token] = authHeader.split(" ");

    if (bearer !== "Bearer" || !token) {
      throw new AppError("Formato de token inválido", 401, "Unauthorized");
    }

    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError("Token expirado", 401, "TokenExpired"));
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError("Token inválido", 401, "InvalidToken"));
      return;
    }
    next(error);
  }
}

/**
 * Middleware opcional de autenticação.
 * Se houver token, valida e anexa em req.user.
 * Se não houver, continua sem erros.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  try {
    const [bearer, token] = authHeader.split(" ");

    if (bearer === "Bearer" && token) {
      const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;
      req.user = decoded;
    }
  } catch (error) {
    // Ignora erros de token no modo opcional
  }

  next();
}

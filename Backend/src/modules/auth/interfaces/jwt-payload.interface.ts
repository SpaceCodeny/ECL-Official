import type { UserRole, UserStatus } from "@prisma/client";

/**
 * Payload do JWT de acesso.
 * Inclui apenas dados não sensíveis e necessários para autorização imediata.
 * Nunca inclui senha, hash ou token.
 */
export interface JwtPayload {
  sub: string;           // userId
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  iat?: number;
  exp?: number;
}

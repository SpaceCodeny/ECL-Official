import { UserRole } from "@prisma/client";

/**
 * Verifica se um papel está entre os papéis permitidos.
 * Evita problemas de narrowing do TypeScript com Array.includes e enums.
 */
export function hasAnyRole(role: UserRole, ...allowed: UserRole[]): boolean {
  return (allowed as string[]).includes(role as string);
}

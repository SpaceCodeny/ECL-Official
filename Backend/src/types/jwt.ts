import type { UserRole, UserStatus } from "@prisma/client";

export interface JwtPayload {
  sub: string;        // user ID
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  iat?: number;       // issued at
  exp?: number;       // expiration time
}

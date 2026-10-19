import { z } from "zod";
import { UserRole, UserStatus } from "@prisma/client";

export const UpdateUserSchema = z.object({
  displayName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").optional(),
  avatarUrl: z.string().url("URL inválida").optional(),
  email: z.string().email("E-mail inválido").optional(),
});

export const UpdateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

export const UpdateUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
export type UpdateUserRoleDto = z.infer<typeof UpdateUserRoleSchema>;
export type UpdateUserStatusDto = z.infer<typeof UpdateUserStatusSchema>;

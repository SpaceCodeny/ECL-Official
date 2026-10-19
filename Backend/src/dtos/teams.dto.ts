import { z } from "zod";

export const CreateTeamSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(50, "Nome muito longo"),
  tag: z.string().max(6, "Tag deve ter no máximo 6 caracteres").optional(),
  description: z.string().optional(),
  logoUrl: z.string().url("URL inválida").optional(),
});

export const UpdateTeamSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  tag: z.string().max(6).optional(),
  description: z.string().optional(),
  logoUrl: z.string().url("URL inválida").optional(),
  captainId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

export const AddTeamMemberSchema = z.object({
  playerId: z.string().uuid("ID de jogador inválido"),
  role: z.enum(["CAPTAIN", "PLAYER", "SUBSTITUTE"]).default("PLAYER"),
});

export type CreateTeamDto = z.infer<typeof CreateTeamSchema>;
export type UpdateTeamDto = z.infer<typeof UpdateTeamSchema>;
export type AddTeamMemberDto = z.infer<typeof AddTeamMemberSchema>;

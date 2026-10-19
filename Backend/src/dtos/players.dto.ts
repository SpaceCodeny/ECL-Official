import { z } from "zod";
import { PlayerStatus } from "@prisma/client";

export const UpdatePlayerProfileSchema = z.object({
  standoffId: z.string().optional(),
  bio: z.string().max(500, "Bio muito longa").optional(),
  country: z.string().length(2, "Código de país deve ter 2 caracteres").optional(),
  status: z.nativeEnum(PlayerStatus).optional(),
});

export type UpdatePlayerProfileDto = z.infer<typeof UpdatePlayerProfileSchema>;

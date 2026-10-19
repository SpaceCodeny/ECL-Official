import { z } from "zod";

export const CreateRegistrationSchema = z.object({
  teamId: z.string().uuid("ID de time inválido"),
  notes: z.string().optional(),
});

export const ReviewRegistrationSchema = z.object({
  notes: z.string().optional(),
});

export type CreateRegistrationDto = z.infer<typeof CreateRegistrationSchema>;
export type ReviewRegistrationDto = z.infer<typeof ReviewRegistrationSchema>;

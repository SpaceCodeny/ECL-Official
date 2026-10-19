import { z } from "zod";
import { TournamentFormat, SeriesFormat } from "@prisma/client";

export const CreateTournamentSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  season: z.string().min(1, "Temporada obrigatória"),
  description: z.string().optional(),
  bannerUrl: z.string().url("URL inválida").optional(),
  format: z.nativeEnum(TournamentFormat),
  seriesFormat: z.nativeEnum(SeriesFormat).default("BO3"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  registrationDeadline: z.string().datetime().optional(),
  maxTeams: z.number().int().positive().default(16),
  autoApprove: z.boolean().default(false),
  prizePool: z.string().optional(),
  rules: z.string().optional(),
});

export const UpdateTournamentSchema = z.object({
  name: z.string().min(3).optional(),
  season: z.string().min(1).optional(),
  description: z.string().optional(),
  bannerUrl: z.string().url("URL inválida").optional(),
  format: z.nativeEnum(TournamentFormat).optional(),
  seriesFormat: z.nativeEnum(SeriesFormat).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  registrationDeadline: z.string().datetime().optional(),
  maxTeams: z.number().int().positive().optional(),
  autoApprove: z.boolean().optional(),
  prizePool: z.string().optional(),
  rules: z.string().optional(),
});

export type CreateTournamentDto = z.infer<typeof CreateTournamentSchema>;
export type UpdateTournamentDto = z.infer<typeof UpdateTournamentSchema>;

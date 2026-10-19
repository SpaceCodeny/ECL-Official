import { z } from "zod";
import { AnnouncementType } from "@prisma/client";

export const CreateAnnouncementSchema = z.object({
  tournamentId: z.string().uuid().optional(),
  title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
  summary: z.string().min(10, "Resumo deve ter no mínimo 10 caracteres"),
  content: z.string().optional(),
  type: z.nativeEnum(AnnouncementType).default("GENERAL"),
  coverUrl: z.string().url("URL inválida").optional(),
});

export const UpdateAnnouncementSchema = z.object({
  tournamentId: z.string().uuid().optional(),
  title: z.string().min(3).optional(),
  summary: z.string().min(10).optional(),
  content: z.string().optional(),
  type: z.nativeEnum(AnnouncementType).optional(),
  coverUrl: z.string().url("URL inválida").optional(),
});

export type CreateAnnouncementDto = z.infer<typeof CreateAnnouncementSchema>;
export type UpdateAnnouncementDto = z.infer<typeof UpdateAnnouncementSchema>;

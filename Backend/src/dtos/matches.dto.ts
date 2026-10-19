import { z } from "zod";
import { MatchStatus, SeriesFormat } from "@prisma/client";

export const CreateMatchSchema = z.object({
  stageId: z.string().uuid("ID de fase inválido"),
  groupId: z.string().uuid().optional(),
  round: z.string().optional(),
  teamAId: z.string().uuid("ID de time A inválido"),
  teamBId: z.string().uuid("ID de time B inválido"),
  scheduledAt: z.string().datetime().optional(),
  seriesFormat: z.nativeEnum(SeriesFormat).default("BO3"),
  streamUrl: z.string().url("URL inválida").optional(),
  notes: z.string().optional(),
});

export const UpdateMatchSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  status: z.nativeEnum(MatchStatus).optional(),
  seriesFormat: z.nativeEnum(SeriesFormat).optional(),
  streamUrl: z.string().url("URL inválida").optional(),
  notes: z.string().optional(),
});

export const MatchResultSchema = z.object({
  winnerTeamId: z.string().uuid("ID do vencedor inválido"),
  scoreA: z.number().int().nonnegative(),
  scoreB: z.number().int().nonnegative(),
  maps: z.array(z.object({
    mapName: z.string(),
    order: z.number().int(),
    scoreA: z.number().int().optional(),
    scoreB: z.number().int().optional(),
    winnerId: z.string().uuid().optional(),
    played: z.boolean().default(false),
  })).optional(),
});

export type CreateMatchDto = z.infer<typeof CreateMatchSchema>;
export type UpdateMatchDto = z.infer<typeof UpdateMatchSchema>;
export type MatchResultDto = z.infer<typeof MatchResultSchema>;

import type { TournamentStatus, TournamentFormat, SeriesFormat } from "@/types/tournament";
import type { MatchStatus } from "@/types/match";
import type { AnnouncementType } from "@/types/domain";

export const tournamentStatusLabel: Record<TournamentStatus, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  REGISTRATION_OPEN: "Inscrições Abertas",
  REGISTRATION_CLOSED: "Inscrições Encerradas",
  IN_PROGRESS: "Em Andamento",
  COMPLETED: "Encerrado",
  CANCELLED: "Cancelado",
};

export const tournamentFormatLabel: Record<TournamentFormat, string> = {
  SINGLE_ELIMINATION: "Eliminação Simples",
  DOUBLE_ELIMINATION: "Eliminação Dupla",
  ROUND_ROBIN: "Points Race",
  GROUP_STAGE_PLAYOFFS: "Grupos + Playoffs",
};

export const seriesFormatLabel: Record<SeriesFormat, string> = {
  BO1: "Melhor de 1",
  BO3: "Melhor de 3",
  BO5: "Melhor de 5",
};

export const matchStatusLabel: Record<MatchStatus, string> = {
  SCHEDULED: "Agendada",
  READY: "Pronta",
  LIVE: "Ao Vivo",
  AWAITING_RESULT: "Aguardando Resultado",
  COMPLETED: "Finalizada",
  DISPUTED: "Em Disputa",
  CANCELLED: "Cancelada",
};

export const announcementTypeLabel: Record<AnnouncementType, string> = {
  GENERAL: "Geral",
  REGISTRATION_OPEN: "Inscrições",
  RESULT: "Resultado",
  SCHEDULE: "Agenda",
  ANNOUNCEMENT: "Comunicado",
};

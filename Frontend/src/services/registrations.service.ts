import { api } from "@/lib/api-client";

export interface Registration {
  id: string;
  tournamentId: string;
  teamId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewedById: string | null;
  notes: string | null;
  team: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    tag: string | null;
  };
  tournament: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
}

export interface CreateRegistrationDto {
  teamId: string;
  tournamentId: string;
}

export interface ReviewRegistrationDto {
  notes?: string;
}

export const registrationsService = {
  // Listar inscrições
  getRegistrations: (params: { 
    tournamentId?: string; 
    teamId?: string; 
    status?: string;
  } = {}) =>
    api.get<Registration[]>("/registrations", params),

  // Criar inscrição
  createRegistration: (data: CreateRegistrationDto) =>
    api.post<Registration>("/registrations", data),

  // Aprovar inscrição (admin)
  approveRegistration: (id: string, data?: ReviewRegistrationDto) =>
    api.patch<Registration>(`/registrations/${id}/approve`, data),

  // Rejeitar inscrição (admin)
  rejectRegistration: (id: string, data?: ReviewRegistrationDto) =>
    api.patch<Registration>(`/registrations/${id}/reject`, data),

  // Retirar inscrição (capitão)
  withdrawRegistration: (id: string) =>
    api.patch<Registration>(`/registrations/${id}/withdraw`, {}),
};

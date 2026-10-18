import { api } from "@/lib/api-client";

export interface AdminDashboard {
  indicators: {
    totalUsers: number;
    totalTeams: number;
    activeTournaments: number;
    pendingRegistrations: number;
    scheduledMatches: number;
    awaitingResultMatches: number;
    disputedMatches: number;
    matchesCompleted: number;
  };
  charts: {
    registrationsOverTime: { date: string; count: number }[];
    tournamentsByStatus: { status: string; count: number }[];
  };
  recentActivity: {
    id: string;
    actor: string;
    action: string;
    entity: string;
    entityId: string;
    createdAt: string;
  }[];
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  emailVerified: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export const adminService = {
  dashboard: () => api.get<AdminDashboard>("/admin/dashboard"),
  listUsers: (params?: { search?: string; role?: string; status?: string; page?: number; pageSize?: number }) =>
    api.get<{ data: AdminUser[]; total: number; page: number; totalPages: number }>("/admin/users", params),
  updateUserRole: (userId: string, role: string) =>
    api.patch(`/admin/users/${userId}/role`, { role }, true),
  suspendUser: (userId: string) => api.post(`/admin/users/${userId}/suspend`, undefined, true),
  reactivateUser: (userId: string) => api.post(`/admin/users/${userId}/reactivate`, undefined, true),
  auditLogs: (params?: { entity?: string; page?: number; pageSize?: number }) =>
    api.get<{ data: unknown[]; total: number }>("/admin/audit-logs", params),
};

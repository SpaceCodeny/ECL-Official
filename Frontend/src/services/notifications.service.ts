import { api } from "@/lib/api-client";

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  entityId: string | null;
  read: boolean;
  createdAt: string;
}

export const notificationsService = {
  list: (params?: { unreadOnly?: boolean; page?: number }) =>
    api.get<{ data: Notification[]; unreadCount: number; total: number }>(
      "/notifications",
      params,
    ),
  markAsRead: (id: string) => api.post<{ message: string }>(`/notifications/${id}/read`, undefined, true),
  markAllRead: () => api.post<{ message: string }>("/notifications/read-all", undefined, true),
};

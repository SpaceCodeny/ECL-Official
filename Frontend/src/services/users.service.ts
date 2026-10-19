import { api } from "@/lib/api-client";
import type { Paginated } from "@/types/common";

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  emailVerified: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithProfile extends User {
  playerProfile?: {
    id: string;
    standoffId: string | null;
    bio: string | null;
    country: string | null;
    status: string;
  };
}

export interface UpdateUserDto {
  displayName?: string;
  avatarUrl?: string | null;
  email?: string;
}

export interface UpdateUserRoleDto {
  role: string;
  status?: string;
}

export const usersService = {
  // Listar usuários (admin)
  getUsers: (params: { page?: number; limit?: number; role?: string; status?: string } = {}) =>
    api.get<Paginated<User>>("/users", params),

  // Buscar usuário por ID
  getUser: (id: string) =>
    api.get<UserWithProfile>(`/users/${id}`),

  // Atualizar perfil do usuário
  updateUser: (id: string, data: UpdateUserDto) =>
    api.patch<User>(`/users/${id}`, data),

  // Atualizar role do usuário (admin)
  updateUserRole: (id: string, data: UpdateUserRoleDto) =>
    api.patch<User>(`/users/${id}/role`, data),

  // Deletar usuário (admin)
  deleteUser: (id: string) =>
    api.delete<void>(`/users/${id}`),
};

import { api } from "@/lib/api-client";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  AuthTokens,
  AuthUser,
} from "@/types/auth";

export const authService = {
  register: (dto: RegisterRequest) =>
    api.post<{ message: string }>("/auth/register", dto),

  login: (dto: LoginRequest) =>
    api.post<LoginResponse>("/auth/login", dto),

  logout: (refreshToken: string) =>
    api.post<{ message: string }>("/auth/logout", { refreshToken }),

  refresh: (refreshToken: string) =>
    api.post<AuthTokens>("/auth/refresh", { refreshToken }),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>("/auth/forgot-password", { email }),

  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>("/auth/reset-password", { token, password }),

  me: (_accessToken: string) =>
    api.get<AuthUser>("/auth/me"),
};

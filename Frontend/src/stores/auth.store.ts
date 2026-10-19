"use client";

/**
 * Store de autenticação — Zustand.
 *
 * Estratégia de armazenamento de tokens:
 * - Access token: sessionStorage (limpo quando a aba fecha, não localStorage).
 * - Refresh token: sessionStorage (idem).
 *
 * Em produção, a abordagem mais segura é cookies HttpOnly (configurada no backend).
 * Este store gerencia o estado no cliente para SSR-friendly reading via contexto.
 *
 * Nunca expor tokens por variáveis NEXT_PUBLIC_* ou em logs.
 */
import { create } from "zustand";
import { authService } from "@/services/auth.service";
import type { AuthUser, LoginRequest, RegisterRequest } from "@/types/auth";

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;

  login: (dto: LoginRequest) => Promise<void>;
  register: (dto: RegisterRequest) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
  hydrate: () => void;
}

const ACCESS_KEY = "ecl_at";
const REFRESH_KEY = "ecl_rt";
const SESSION_COOKIE = "ecl_session";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return sessionStorage;
}

function saveTokens(access: string, refresh: string) {
  const s = getStorage();
  if (!s) return;
  s.setItem(ACCESS_KEY, access);
  s.setItem(REFRESH_KEY, refresh);
  // Cookie indicador de sessão (não HttpOnly — apenas para o proxy de rotas).
  // Não contém o token em si; apenas sinaliza que há uma sessão ativa.
  document.cookie = `${SESSION_COOKIE}=1; path=/; SameSite=Lax`;
}

function clearTokens() {
  const s = getStorage();
  if (!s) return;
  s.removeItem(ACCESS_KEY);
  s.removeItem(REFRESH_KEY);
  // Remove o cookie de sessão
  document.cookie = `${SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function getAccessToken(): string | null {
  return getStorage()?.getItem(ACCESS_KEY) ?? null;
}

export function getRefreshToken(): string | null {
  return getStorage()?.getItem(REFRESH_KEY) ?? null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: "idle",
  error: null,

  hydrate: () => {
    const token = getAccessToken();
    if (!token) {
      set({ status: "unauthenticated" });
      return;
    }
    // Token presente — tenta validar via /auth/me.
    set({ status: "loading" });
    // Garante que o cookie de sessão existe (caso tenha sido perdido num reload).
    document.cookie = `${SESSION_COOKIE}=1; path=/; SameSite=Lax`;
    authService
      .me(token)
      .then((user) => set({ user, status: "authenticated" }))
      .catch(() => {
        clearTokens();
        set({ user: null, status: "unauthenticated" });
      });
  },

  login: async (dto) => {
    set({ status: "loading", error: null });
    try {
      const res = await authService.login(dto);
      saveTokens(res.accessToken, res.refreshToken);
      set({ user: res.user, status: "authenticated", error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao fazer login";
      set({ status: "unauthenticated", error: msg });
      throw e;
    }
  },

  register: async (dto) => {
    set({ status: "loading", error: null });
    try {
      const result = await authService.register(dto);
      set({ status: "unauthenticated", error: null });
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao criar conta";
      set({ status: "unauthenticated", error: msg });
      throw e;
    }
  },

  logout: async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try { await authService.logout(refreshToken); } catch { /* silencioso */ }
    }
    clearTokens();
    set({ user: null, status: "unauthenticated", error: null });
  },

  clearError: () => set({ error: null }),
}));

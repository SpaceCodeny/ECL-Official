import type { ApiError } from "@/types/common";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

/**
 * Erro padronizado de API, espelhando o AllExceptionsFilter do backend.
 */
export class FetchError extends Error {
  readonly status: number;
  readonly details?: Record<string, string>;

  constructor(status: number, message: string, details?: Record<string, string>) {
    super(message);
    this.name = "FetchError";
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Envia credenciais (cookies HttpOnly) — necessário para sessões autenticadas. */
  withAuth?: boolean;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

/**
 * Cliente HTTP centralizado. Todos os serviços passam por aqui.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, withAuth = false } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  // Injeta o access token quando disponível (client-side only).
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("ecl_at");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: withAuth ? "include" : "same-origin",
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = data as Partial<ApiError> | undefined;
    const message = err?.message ?? `Erro ${res.status}`;
    throw new FetchError(res.status, message, err?.details);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"]) => apiRequest<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: unknown, withAuth = false) =>
    apiRequest<T>(path, { method: "POST", body, withAuth }),
  patch: <T>(path: string, body?: unknown, withAuth = false) =>
    apiRequest<T>(path, { method: "PATCH", body, withAuth }),
  put: <T>(path: string, body?: unknown, withAuth = false) =>
    apiRequest<T>(path, { method: "PUT", body, withAuth }),
  delete: <T>(path: string, withAuth = false) => apiRequest<T>(path, { method: "DELETE", withAuth }),
};

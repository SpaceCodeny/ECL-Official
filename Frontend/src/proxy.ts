/**
 * Middleware de proteção de rotas do Next.js.
 *
 * Estratégia: o token de acesso fica no sessionStorage (cliente), que o
 * middleware não consegue ler. A proteção real de segurança vive no backend.
 * O middleware aqui redireciona usuários não autenticados apenas com base em
 * cookie de sessão leve (indicador de sessão), sem expor o token em si.
 *
 * Rotas protegidas: /dashboard/**, /admin/**
 * Rotas de auth: /login, /register, /forgot-password, /reset-password
 *   → Redireciona para /dashboard se já autenticado.
 */
import { type NextRequest, NextResponse } from "next/server";

// Cookie indicador de sessão — definido como HttpOnly pelo backend em produção.
// Em desenvolvimento (sessionStorage), não é possível verificar no middleware.
// O middleware usa um cookie auxiliar "ecl_session" definido no login.
const SESSION_COOKIE = "ecl_session";

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];
const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Trophy, Users, Gamepad2, ShieldAlert,
  ClipboardList, LogOut, Menu, X, Home,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useAuthStore } from "@/stores/auth.store";
import { hasRole } from "@/types/user";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/tournaments", label: "Campeonatos", icon: Trophy },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/registrations", label: "Inscrições", icon: ClipboardList },
  { href: "/admin/matches", label: "Partidas", icon: Gamepad2 },
  { href: "/admin/audit", label: "Auditoria", icon: ShieldAlert },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const canAccess = user && hasRole(user.role as never, "ADMINISTRATOR");

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center bg-ink text-muted">Carregando…</div>;
  }

  if (!canAccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-4 text-center">
        <ShieldAlert className="h-12 w-12 text-amber-400" />
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-paper">Acesso negado</h1>
        <p className="text-muted">Você não tem permissão para acessar o painel administrativo.</p>
        <Link href="/" className="text-gold hover:text-gold-light">Voltar ao início</Link>
      </div>
    );
  }

  function isActive(href: string) {
    return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen bg-ink">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-navy/40 lg:flex">
        <div className="border-b border-border p-5">
          <Link href="/admin"><Logo size="sm" /></Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium uppercase tracking-wide transition-colors",
                isActive(item.href)
                  ? "bg-gold/10 text-gold"
                  : "text-muted hover:bg-surface hover:text-paper",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <Link href="/" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted hover:text-paper">
            <Home className="h-4 w-4" /> Voltar ao site
          </Link>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted hover:text-red-400">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header mobile */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
          <Link href="/admin"><Logo size="sm" /></Link>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-md p-2 text-paper"
            aria-label="Abrir menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Sidebar mobile */}
        {sidebarOpen && (
          <div className="border-b border-border bg-navy/60 lg:hidden">
            <nav className="space-y-1 p-3">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium uppercase tracking-wide",
                    isActive(item.href) ? "bg-gold/10 text-gold" : "text-muted",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

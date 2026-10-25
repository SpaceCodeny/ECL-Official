"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth.store";
import { NotificationsBell } from "@/components/navigation/notifications-bell";
import { MatchesTicker } from "@/components/home/matches-ticker";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Início" },
  { href: "/tournaments", label: "Campeonatos" },
  { href: "/matches", label: "Partidas" },
  { href: "/teams", label: "Equipes" },
  { href: "/rankings", label: "Ranking" },
];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, status, logout } = useAuthStore();
  const isAuthenticated = status === "authenticated" && Boolean(user);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-colors duration-300",
        scrolled
          ? "border-b border-white/10 bg-black/70 backdrop-blur-md"
          : "border-b border-transparent bg-black/30 backdrop-blur-sm",
      )}
    >
      {/* ── Linha principal: logo + nav + auth ── */}
      <div className="container-ecl flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Elite Champions League — início" className="shrink-0">
          <Logo size="sm" />
        </Link>

        {/* Navegação desktop */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação principal">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium uppercase tracking-wide transition-colors",
                isActive(link.href) ? "text-gold" : "text-white/60 hover:text-white",
              )}
              aria-current={isActive(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Ações de auth desktop */}
        <div className="hidden items-center gap-2 lg:flex">
          {isAuthenticated && user ? (
            <>
              <NotificationsBell />
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/60 transition-colors hover:text-white"
              >
                <Avatar name={user.displayName} src={user.avatarUrl} size="sm" />
                <span className="max-w-[8rem] truncate">{user.displayName}</span>
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Sair
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Entrar
              </Link>
              <Link href="/register" className={buttonVariants({ variant: "primary", size: "sm" })}>
                Criar conta
              </Link>
            </>
          )}
        </div>

        {/* Toggle mobile */}
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white lg:hidden"
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* ── Linha secundária: ticker de partidas ao vivo ── */}
      <MatchesTicker />

      {/* Menu mobile */}
      {mobileOpen ? (
        <div className="border-t border-white/10 bg-black/95 lg:hidden">
          <nav className="container-ecl flex flex-col gap-1 py-4" aria-label="Navegação mobile">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2.5 text-sm font-medium uppercase tracking-wide transition-colors",
                  isActive(link.href)
                    ? "bg-gold/10 text-gold"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-4">
              {isAuthenticated && user ? (
                <>
                  <Link href="/dashboard" className={buttonVariants({ variant: "secondary", size: "md" })}>
                    <Avatar name={user.displayName} src={user.avatarUrl} size="sm" />
                    {user.displayName}
                  </Link>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className={buttonVariants({ variant: "ghost", size: "md" })}
                  >
                    <LogOut className="h-4 w-4" aria-hidden />
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className={buttonVariants({ variant: "secondary", size: "md" })}>
                    Entrar
                  </Link>
                  <Link href="/register" className={buttonVariants({ variant: "primary", size: "md" })}>
                    Criar conta
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

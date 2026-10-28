"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Shield, Trophy, Users, Shuffle } from "lucide-react";
import { Logo } from "@/components/Logo";

const NAV_LINKS = [
  { href: "/", label: "Início", icon: Trophy },
  { href: "/admin/tournaments", label: "Campeonatos", icon: Trophy },
  { href: "/admin/teams", label: "Equipes", icon: Users },
  { href: "/admin/draws", label: "Sorteios", icon: Shuffle },
];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-black/70 backdrop-blur-md shadow-lg shadow-black/50"
          : "border-b border-transparent bg-black/30 backdrop-blur-sm"
      }`}
    >
      {/* Linha principal */}
      <div className="container-ecl flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="ECL Draw System — início" className="shrink-0">
          <Logo size="sm" />
        </Link>

        {/* Navegação desktop */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação principal">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  rounded-md px-3 py-2 text-sm font-medium uppercase tracking-wide transition-all flex items-center gap-2
                  ${
                    isActive(link.href)
                      ? "text-gold bg-gold/10"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }
                `}
                aria-current={isActive(link.href) ? "page" : undefined}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Admin badge */}
        <div className="hidden items-center gap-3 lg:flex">
          <div className="flex items-center gap-2 rounded-md bg-gold/10 px-3 py-1.5 border border-gold/30">
            <Shield className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium text-gold">Admin</span>
          </div>
        </div>

        {/* Toggle mobile */}
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white lg:hidden hover:bg-white/10 transition-colors"
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Menu mobile */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-black/95 lg:hidden animate-fade-in">
          <nav className="container-ecl flex flex-col gap-1 py-4" aria-label="Navegação mobile">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    rounded-md px-3 py-2.5 text-sm font-medium uppercase tracking-wide transition-colors flex items-center gap-2
                    ${
                      isActive(link.href)
                        ? "bg-gold/10 text-gold"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}

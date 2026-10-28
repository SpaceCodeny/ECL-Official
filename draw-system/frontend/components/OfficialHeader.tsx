'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ECLLogo } from './ECLLogo';
import { Trophy, Users, Settings, Menu, X } from 'lucide-react';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: Trophy },
  { href: '/admin/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/admin/teams', label: 'Teams', icon: Users },
  { href: '/admin/draws', label: 'Draws', icon: Settings },
];

export function OfficialHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <header className="header-ecl">
      <div className="container-ecl">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/admin" className="shrink-0">
            <ECLLogo size="sm" />
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium uppercase tracking-wide transition-colors
                    ${
                      isActive(link.href)
                        ? 'bg-electric/20 text-electric'
                        : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Admin badge */}
          <div className="hidden items-center gap-3 lg:flex">
            <div className="flex items-center gap-2 rounded-md border border-electric/30 bg-electric/10 px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-electric" />
              <span className="text-sm font-bold uppercase tracking-wider text-electric">Admin</span>
            </div>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden btn-ghost"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="animate-fade-in border-t border-surface-border py-4 lg:hidden">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      flex items-center gap-2 rounded-md px-4 py-3 text-sm font-medium uppercase tracking-wide transition-colors
                      ${
                        isActive(link.href)
                          ? 'bg-electric/20 text-electric'
                          : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

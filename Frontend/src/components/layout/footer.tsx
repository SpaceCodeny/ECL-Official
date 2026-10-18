import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const FOOTER_LINKS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Plataforma",
    links: [
      { href: "/tournaments", label: "Campeonatos" },
      { href: "/matches", label: "Partidas" },
      { href: "/teams", label: "Equipes" },
      { href: "/rankings", label: "Ranking" },
    ],
  },
  {
    title: "Organização",
    links: [
      { href: "/rules", label: "Regras" },
      { href: "/about", label: "Sobre a ECL" },
      { href: "/announcements", label: "Comunicados" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Política de privacidade" },
      { href: "/terms", label: "Termos de uso" },
      { href: "/lgpd", label: "LGPD" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-ink">
      <div className="container-ecl grid grid-cols-2 gap-8 py-12 sm:grid-cols-3 lg:grid-cols-5">
        <div className="col-span-2 space-y-3 lg:col-span-2">
          <Logo size="md" />
          <p className="max-w-xs text-sm text-muted">
            A plataforma oficial de torneios competitivos de Standoff 2. The Road to Glory.
          </p>
        </div>
        {FOOTER_LINKS.map((section) => (
          <nav key={section.title} aria-label={section.title} className="flex flex-col gap-2">
            <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-gold">
              {section.title}
            </h2>
            {section.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted transition-colors hover:text-paper"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container-ecl flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted/70 sm:flex-row">
          <p>© {new Date().getFullYear()} Elite Champions League. Todos os direitos reservados.</p>
          <p className="uppercase tracking-widest">The Road to Glory</p>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, BarChart3 } from "lucide-react";

/**
 * Hero principal da homepage — estático, sem dependência de API.
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-ink">
      {/* Glow de fundo cinematográfico */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(13,20,38,0.95)_0%,_rgba(8,10,15,1)_65%)]"
      />
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[48rem] -translate-x-1/2 rounded-full bg-gold/10 blur-[140px]" />
      {/* Linha de grade sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #D6B15E 1px, transparent 1px), linear-gradient(to bottom, #D6B15E 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="container-ecl relative z-10 flex flex-col items-center py-24 text-center sm:py-32 lg:py-40">
        <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-gold">
          Elite Champions League · Standoff 2
        </span>

        <h1 className="font-display text-5xl font-bold uppercase leading-[1.05] tracking-tight text-paper sm:text-7xl lg:text-8xl">
          The Road to <span className="text-gradient-gold">Glory</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base text-muted sm:text-lg">
          A plataforma oficial de torneios competitivos de Standoff 2. Campeonatos, equipes,
          partidas e rankings reunidos em um só ecossistema de esports.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link href="/tournaments" className={buttonVariants({ variant: "primary", size: "lg" })}>
            Explorar campeonatos
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href="/rankings" className={buttonVariants({ variant: "secondary", size: "lg" })}>
            <BarChart3 className="h-4 w-4" aria-hidden />
            Ver classificação
          </Link>
        </div>
      </div>
    </section>
  );
}

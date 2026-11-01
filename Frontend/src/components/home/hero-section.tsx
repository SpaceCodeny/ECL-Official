import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, BarChart3 } from "lucide-react";

/**
 * Hero principal da homepage — imagem de fundo do jogo com gradiente.
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* ── Imagem de fundo ─────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/desktop.png"
          alt="Standoff 2 — Elite Champions League"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Gradiente sutil: topo transparente, base escura para texto */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/70"
        />
        {/* Vinheta lateral muito sutil */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30"
        />
      </div>

      {/* ── Conteúdo ────────────────────────────────────────── */}
      <div className="container-ecl relative z-10 flex min-h-[75vh] sm:min-h-[85vh] md:min-h-[90vh] lg:min-h-screen flex-col items-center justify-center pb-12 pt-8 sm:pb-16 sm:pt-12 md:pb-24 md:pt-16 lg:pb-32 lg:pt-20 text-center px-4">
        {/* Badge */}
        <span className="mb-4 sm:mb-6 md:mb-8 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-black/40 px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.15em] sm:tracking-[0.2em] text-gold backdrop-blur-sm">
          Elite Champions League · Standoff 2
        </span>

        {/* Título */}
        <h1 className="font-display font-bold uppercase leading-[1.0] tracking-tight text-white">
          <span className="block text-4xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl">
            The Road to
          </span>
          <span className="block text-4xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl text-gold"
            style={{ textShadow: "0 0 40px rgba(214,177,94,0.5)" }}>
            Glory
          </span>
        </h1>

        {/* Descrição */}
        <p className="mt-4 sm:mt-6 max-w-xs sm:max-w-sm md:max-w-xl text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed text-white px-4 sm:px-0">
          A plataforma oficial de torneios competitivos de Standoff 2. Campeonatos, equipes,
          partidas e rankings em um só ecossistema de esports.
        </p>

        {/* CTAs */}
        <div className="mt-6 sm:mt-8 flex w-full max-w-xs sm:max-w-sm md:max-w-none flex-col gap-2 sm:gap-3 md:flex-row md:justify-center md:gap-4 px-4 sm:px-0">
          <Link
            href="/tournaments"
            className={buttonVariants({ variant: "primary", size: "lg" })}
          >
            Explorar campeonatos
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/rankings"
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            <BarChart3 className="h-4 w-4" aria-hidden />
            Ver classificação
          </Link>
        </div>
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import { Shield } from "lucide-react";
import { TeamsListClient } from "@/components/teams/teams-list-client";

export const metadata: Metadata = {
  title: "Equipes",
  description: "Conheça todas as equipes competitivas da Elite Champions League.",
};

export default function TeamsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-navy/40">
        {/* Glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/3 h-64 w-64 rounded-full bg-gold/10 blur-[100px]"
        />
        {/* Grid sutil */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right,#D6B15E 1px,transparent 1px),linear-gradient(to bottom,#D6B15E 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="container-ecl relative z-10 flex flex-col gap-3 py-12 sm:py-16">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gold/30 bg-gold/10">
              <Shield className="h-5 w-5 text-gold" />
            </div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
              Elite Champions League
            </span>
          </div>
          <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-paper sm:text-5xl">
            Equipes
          </h1>
          <p className="max-w-xl text-base text-muted">
            Todas as organizações competitivas inscritas na plataforma.
            Conheça elencos, histórico e estatísticas.
          </p>
        </div>
      </section>

      {/* Lista */}
      <div className="container-ecl py-10">
        <TeamsListClient />
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { SectionHeader } from "@/components/ui/section-header";

export const metadata: Metadata = { title: "Partidas" };

export default function MatchesPage() {
  return (
    <div className="container-ecl py-12">
      <SectionHeader title="Partidas" description="Partidas agendadas, ao vivo e finalizadas." />
      <p className="text-muted">Página em construção — Fase 4.</p>
    </div>
  );
}

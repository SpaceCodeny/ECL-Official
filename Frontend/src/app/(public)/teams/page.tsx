import type { Metadata } from "next";
import { TeamsListClient } from "@/components/teams/teams-list-client";

export const metadata: Metadata = { title: "Equipes" };

export default function TeamsPage() {
  return (
    <div className="container-ecl py-12">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-paper">Equipes</h1>
        <p className="mt-2 text-muted">Todas as equipes competitivas da Elite Champions League.</p>
      </div>
      <TeamsListClient />
    </div>
  );
}

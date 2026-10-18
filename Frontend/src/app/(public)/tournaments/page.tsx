import type { Metadata } from "next";
import { TournamentsListClient } from "@/components/tournaments/tournaments-list-client";

export const metadata: Metadata = { title: "Campeonatos" };

export default function TournamentsPage() {
  return (
    <div className="container-ecl py-12">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-paper">
          Campeonatos
        </h1>
        <p className="mt-2 text-muted">
          Todos os campeonatos da Elite Champions League — abertos, em andamento e encerrados.
        </p>
      </div>
      <TournamentsListClient />
    </div>
  );
}

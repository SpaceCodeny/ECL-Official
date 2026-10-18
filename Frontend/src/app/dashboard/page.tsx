import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="container-ecl py-12">
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-paper">
        Dashboard
      </h1>
      <p className="mt-2 text-muted">Área protegida — Fase 5.</p>
    </div>
  );
}

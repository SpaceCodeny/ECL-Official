import Link from "next/link";
import { Shield } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-ink via-navy to-ink">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <Shield className="mx-auto mb-6 h-20 w-20 text-gold" />
        <h1 className="mb-4 font-display text-5xl font-bold uppercase tracking-tight text-paper">
          ECL Pick & Ban
        </h1>
        <p className="mb-8 text-xl text-muted">
          Sistema de Pick & Ban em tempo real para treinos
        </p>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/admin"
            className="rounded-lg bg-gold px-8 py-4 font-display text-lg font-bold uppercase tracking-wide text-ink transition-all hover:bg-gold-light hover:shadow-lg hover:shadow-gold/30"
          >
            Criar Sessão (Admin)
          </Link>
        </div>

        <div className="mt-12 text-sm text-muted">
          <p>Powered by Elite Champions League</p>
        </div>
      </div>
    </div>
  );
}

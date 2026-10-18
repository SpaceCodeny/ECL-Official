import { Info } from "lucide-react";

/**
 * Indicador visual de que a seção exibe dados de demonstração (fictícios).
 * Usado quando a API ainda não está disponível ou não há dados reais.
 */
export function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-amber-400">
      <Info className="h-3 w-3" aria-hidden />
      Demonstração
    </span>
  );
}

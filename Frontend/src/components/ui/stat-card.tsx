import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  /** Destaque dourado para o card. */
  accent?: boolean;
  className?: string;
}

export function StatCard({ icon: Icon, value, label, accent, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "card-ecl flex flex-col gap-2 p-5",
        accent && "border-gold/30",
        className,
      )}
    >
      <Icon className={cn("h-6 w-6", accent ? "text-gold" : "text-muted")} aria-hidden />
      <span className={cn("font-display text-3xl font-bold tracking-tight", accent ? "text-gold" : "text-paper")}>
        {value}
      </span>
      <span className="text-xs font-medium uppercase tracking-widest text-muted">{label}</span>
    </div>
  );
}

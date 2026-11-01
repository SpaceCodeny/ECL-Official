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
        "card-ecl flex flex-col gap-1.5 sm:gap-2 p-3 sm:p-4 md:p-5",
        accent && "border-gold/30",
        className,
      )}
    >
      <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", accent ? "text-gold" : "text-muted")} aria-hidden />
      <span className={cn("font-display text-2xl sm:text-3xl font-bold tracking-tight", accent ? "text-gold" : "text-paper")}>
        {value}
      </span>
      <span className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-muted">{label}</span>
    </div>
  );
}

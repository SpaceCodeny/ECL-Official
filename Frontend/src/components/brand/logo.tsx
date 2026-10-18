import { cn } from "@/lib/utils";

interface LogoProps {
  /** "full" = marca + wordmark; "mark" = somente o escudo. */
  variant?: "full" | "mark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const markSize = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-12 w-12",
};

const wordSize = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
};

/**
 * Marca visual da Elite Champions League — identidade própria.
 * Escudo dourado com caminho ascendente (the road to glory) e estrela de campeão.
 */
export function Logo({ variant = "full", size = "md", className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 48 48"
        className={cn(markSize[size])}
        fill="none"
        role="img"
        aria-label="Elite Champions League"
      >
        <defs>
          <linearGradient id="ecl-gold" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E8C97F" />
            <stop offset="1" stopColor="#B8923F" />
          </linearGradient>
        </defs>
        {/* Escudo */}
        <path
          d="M24 3L6 9v13.5C6 31.6 13.8 39.3 24 45c10.2-5.7 18-13.4 18-22.5V9L24 3z"
          stroke="url(#ecl-gold)"
          strokeWidth="2.5"
          fill="#0B1426"
        />
        {/* Caminho ascendente (road to glory) */}
        <path
          d="M13 30l7-9 5 5 10-12"
          stroke="url(#ecl-gold)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Estrela de campeão no topo do caminho */}
        <path
          d="M33 13.5l1.1 2.4 2.6.3-1.9 1.8.5 2.6-2.3-1.2-2.3 1.2.5-2.6-1.9-1.8 2.6-.3 1.1-2.4z"
          fill="url(#ecl-gold)"
        />
      </svg>
      {variant === "full" ? (
        <span className={cn("flex flex-col leading-none", wordSize[size])}>
          <span className="font-display font-bold uppercase tracking-tight text-paper">
            Elite Champions
          </span>
          <span className="font-display text-[0.7em] font-medium uppercase tracking-[0.2em] text-gold">
            League
          </span>
        </span>
      ) : null}
    </span>
  );
}

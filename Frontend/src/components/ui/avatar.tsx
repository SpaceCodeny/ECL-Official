import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

/** Logo/marca de equipe ou avatar de jogador com fallback de iniciais. */
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const hasImage = Boolean(src);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-bold uppercase text-gold",
        // Só mostra borda/fundo quando não tem imagem (fallback de iniciais)
        !hasImage && "border border-border bg-surface",
        sizeMap[size],
        className,
      )}
      aria-label={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}

import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  /**
   * "full" = logo ECL + texto "Elite Champions League"
   * "mark" = apenas a logo ECL (sem texto ao lado)
   */
  variant?: "full" | "mark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Tamanho da imagem da logo em px
const imgSize = {
  sm: { w: 28, h: 28 },
  md: { w: 36, h: 36 },
  lg: { w: 52, h: 52 },
};

// Tamanho do texto ao lado
const wordSize = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
};

/**
 * Marca visual oficial da Elite Champions League.
 *
 * A logo PNG tem fundo branco — usamos mix-blend-mode: screen para
 * tornar o branco transparente sobre fundos escuros, deixando as
 * letras metálicas visíveis naturalmente.
 */
export function Logo({ variant = "full", size = "md", className }: LogoProps) {
  const { w, h } = imgSize[size];

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* Logo oficial — blend screen elimina o fundo branco sobre escuro */}
      <span
        className="relative shrink-0 overflow-hidden"
        style={{ width: w, height: h, mixBlendMode: "screen" }}
      >
        <Image
          src="/images/logo.png"
          alt="Elite Champions League"
          width={w}
          height={h}
          className="object-contain"
          priority
        />
      </span>

      {/* Wordmark ao lado — apenas no variant "full" */}
      {variant === "full" && (
        <span className={cn("flex flex-col leading-none", wordSize[size])}>
          <span className="font-display font-bold uppercase tracking-tight text-paper">
            Elite Champions
          </span>
          <span className="font-display text-[0.7em] font-medium uppercase tracking-[0.2em] text-gold">
            League
          </span>
        </span>
      )}
    </span>
  );
}

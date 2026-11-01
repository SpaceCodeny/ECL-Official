"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Remove o padding padrão do body — útil para conteúdo full-bleed. */
  noPadding?: boolean;
}

export function Modal({ open, onClose, title, description, children, size = "md", noPadding = false }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Fecha com Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Bloqueia scroll do body
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const sizeClass = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  }[size];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />

      {/* Painel */}
      <div
        ref={panelRef}
        className={cn(
          "relative z-10 w-full animate-fade-in overflow-hidden my-4 sm:my-auto",
          "rounded-none sm:rounded-2xl border-0 sm:border border-gold/20 shadow-2xl shadow-black/60",
          // Glassmorphism com fundo profundo
          "bg-[#0d1117]/95 backdrop-blur-xl",
          "min-h-[100vh] sm:min-h-0 max-h-[100vh] sm:max-h-[90vh] flex flex-col",
          sizeClass,
        )}
      >
        {/* Linha decorativa superior — gradiente gold */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

        {/* Glow sutil no topo */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-gold/5 to-transparent" />

        {/* Cabeçalho */}
        <div className="relative flex items-start justify-between gap-4 px-4 sm:px-7 py-4 sm:py-6 shrink-0">
          <div className="space-y-1">
            <h2
              id="modal-title"
              className="font-display text-lg sm:text-xl font-bold uppercase tracking-widest text-paper"
            >
              {title}
            </h2>
            {description && (
              <p className="text-xs sm:text-sm leading-relaxed text-muted">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "mt-0.5 shrink-0 rounded-lg p-1.5",
              "text-muted/60 transition-all duration-200",
              "hover:bg-white/5 hover:text-paper",
            )}
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Separador */}
        <div className="mx-4 sm:mx-7 h-px bg-gradient-to-r from-transparent via-border to-transparent shrink-0" />

        {/* Conteúdo com scroll */}
        <div className={cn("flex-1 overflow-y-auto", noPadding ? "" : "px-4 sm:px-7 py-4 sm:py-6")}>{children}</div>

        {/* Linha decorativa inferior */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
    </div>
  );
}

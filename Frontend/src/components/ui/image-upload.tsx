"use client";

import { useState } from "react";
import { Link2, X, ImageIcon, Check } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  /** URL atual da imagem (pode ser null se ainda não houver logo) */
  value: string | null;
  /** Chamado com a URL fornecida */
  onChange: (url: string | null) => void;
  label?: string;
  hint?: string;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  label = "Logo",
  hint = "Cole a URL de uma imagem (Pinterest, Imgur, etc.)",
  className,
}: ImageUploadProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function validateAndSetUrl(url: string) {
    setError(null);
    
    if (!url.trim()) {
      onChange(null);
      return;
    }

    // Validação básica de URL
    try {
      new URL(url);
    } catch {
      setError("URL inválida");
      return;
    }

    // Verifica se é uma imagem testando carregar
    setLoading(true);
    const img = new Image();
    
    img.onload = () => {
      onChange(url);
      setInputUrl("");
      setLoading(false);
    };
    
    img.onerror = () => {
      setError("Não foi possível carregar a imagem desta URL");
      setLoading(false);
    };
    
    img.src = url;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inputUrl.trim()) {
      void validateAndSetUrl(inputUrl);
    }
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <span className="text-sm font-medium text-paper">{label}</span>}

      <div className="rounded-xl border-2 border-dashed border-border p-4 transition-colors hover:border-gold/30">
        {/* Preview ou placeholder */}
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-ink/50">
            {loading ? (
              <Spinner className="h-5 w-5" />
            ) : value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt="Logo preview"
                className="h-full w-full object-contain"
              />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted/50" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm text-paper">
              {value ? "Imagem carregada" : "Cole a URL de uma imagem"}
            </p>
            <p className="text-xs text-muted">{hint}</p>
          </div>

          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-red-400/70 transition-colors hover:border-red-500/40 hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" />
              Remover
            </button>
          )}
        </div>

        {/* Input de URL */}
        {!value && (
          <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="url"
                placeholder="https://i.pinimg.com/..."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                disabled={loading}
                className="h-9 w-full rounded-md border border-border bg-ink/50 pl-10 pr-3 text-sm text-paper placeholder:text-muted/60 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30 disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputUrl.trim()}
              className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-paper transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-50"
            >
              {loading ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Aplicar
            </button>
          </form>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

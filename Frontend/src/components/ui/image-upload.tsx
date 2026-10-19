"use client";

import { useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { getAccessToken } from "@/stores/auth.store";

interface ImageUploadProps {
  /** URL atual da imagem (pode ser null se ainda não houver logo) */
  value: string | null;
  /** Chamado com a URL retornada pelo backend após upload bem-sucedido */
  onChange: (url: string | null) => void;
  /** Endpoint de upload. Default: /uploads/team-logo */
  endpoint?: string;
  label?: string;
  hint?: string;
  className?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export function ImageUpload({
  value,
  onChange,
  endpoint = "/uploads/team-logo",
  label = "Logo",
  hint = "PNG, JPG, WEBP, SVG · Máx 5 MB",
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function upload(file: File) {
    setError(null);

    // Validações client-side rápidas
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setError("Tipo de arquivo não permitido. Use PNG, JPG, WEBP, GIF ou SVG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Arquivo muito grande. Máximo 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const token = getAccessToken();
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? `Erro ${res.status}`);
      }

      const { url } = (await res.json()) as { url: string };
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void upload(file);
    e.target.value = ""; // reset para permitir re-seleção do mesmo arquivo
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <span className="text-sm font-medium text-paper">{label}</span>}

      <div
        className={cn(
          "relative flex items-center gap-4 rounded-xl border-2 border-dashed p-4 transition-colors",
          dragOver ? "border-gold/60 bg-gold/5" : "border-border hover:border-gold/30",
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Preview ou placeholder */}
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-ink/50">
          {uploading ? (
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

        {/* Texto + botão */}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-paper">
            {value ? "Logo carregada" : "Arraste ou selecione uma imagem"}
          </p>
          <p className="text-xs text-muted">{hint}</p>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-paper transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Enviando…" : "Escolher"}
          </button>

          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-red-400/70 transition-colors hover:border-red-500/40 hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" />
              Remover
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Selecionar imagem"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  label: string;
  /** Renderiza o conteúdo da célula */
  render: (item: T) => ReactNode;
  /** Classes adicionais para a célula */
  className?: string;
  /** Esconder em mobile (padrão: false) */
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  /** Função para gerar key única de cada row */
  getRowKey: (item: T) => string;
  /** Classes adicionais para a tabela */
  className?: string;
  /** Mensagem quando não há dados */
  emptyMessage?: string;
}

/**
 * Tabela responsiva que:
 * - Em desktop: tabela tradicional
 * - Em mobile: cards empilhados
 */
export function ResponsiveTable<T>({
  data,
  columns,
  getRowKey,
  className,
  emptyMessage = "Nenhum registro encontrado",
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-border bg-navy/20 p-8 text-center">
        <p className="text-sm text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className={cn("hidden overflow-x-auto rounded-lg border border-border lg:block", className)}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-navy/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted",
                    col.className,
                    col.hideOnMobile && "hidden lg:table-cell",
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item) => (
              <tr key={getRowKey(item)} className="transition-colors hover:bg-surface/50">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-sm text-paper",
                      col.className,
                      col.hideOnMobile && "hidden lg:table-cell",
                    )}
                  >
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="flex flex-col gap-3 lg:hidden">
        {data.map((item) => (
          <div
            key={getRowKey(item)}
            className="rounded-lg border border-border bg-navy/20 p-4 space-y-3"
          >
            {columns
              .filter((col) => !col.hideOnMobile)
              .map((col) => (
                <div key={col.key} className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {col.label}
                  </span>
                  <div className={cn("text-sm text-paper", col.className)}>
                    {col.render(item)}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}

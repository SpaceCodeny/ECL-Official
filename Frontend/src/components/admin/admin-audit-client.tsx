"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { adminService } from "@/services/admin.service";
import { formatDateTime } from "@/lib/utils";

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  createdAt: string;
  actor: { displayName: string; username: string };
}

export function AdminAuditClient() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: () => adminService.auditLogs({ pageSize: 100 }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-paper">Auditoria</h1>
        <p className="mt-1 text-sm text-muted">Histórico de ações críticas na plataforma.</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-md" />)}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data?.data.length ? (
        <EmptyState icon={ShieldAlert} title="Sem registros de auditoria" description="As ações críticas aparecerão aqui." />
      ) : (
        <div className="card-ecl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-widest text-muted">
                <th className="py-3 pl-4 text-left">Ator</th>
                <th className="py-3 text-left">Ação</th>
                <th className="py-3 text-left">Entidade</th>
                <th className="py-3 pr-4 text-right">Data</th>
              </tr>
            </thead>
            <tbody>
              {(data.data as AuditEntry[]).map((log) => (
                <tr key={log.id} className="border-b border-border/50 last:border-0 transition-colors hover:bg-surfaceHover">
                  <td className="py-3 pl-4 font-medium text-paper">{log.actor?.displayName ?? "—"}</td>
                  <td className="py-3"><Badge variant="neutral">{log.action}</Badge></td>
                  <td className="py-3 text-muted">{log.entity}</td>
                  <td className="py-3 pr-4 text-right text-xs text-muted">{formatDateTime(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

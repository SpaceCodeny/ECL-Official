"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users, Trophy, ClipboardList, Gamepad2,
  Clock, ShieldAlert, CheckCircle2,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { adminService } from "@/services/admin.service";
import { tournamentStatusLabel } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";

export function AdminDashboardClient() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: adminService.dashboard,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const ind = data.indicators;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-paper">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Visão geral da plataforma Elite Champions League.</p>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} value={ind.totalUsers} label="Usuários" />
        <StatCard icon={Trophy} value={ind.totalTeams} label="Equipes" accent />
        <StatCard icon={Gamepad2} value={ind.activeTournaments} label="Campeonatos ativos" />
        <StatCard icon={ClipboardList} value={ind.pendingRegistrations} label="Inscrições pendentes" />
        <StatCard icon={Clock} value={ind.scheduledMatches} label="Partidas agendadas" />
        <StatCard icon={CheckCircle2} value={ind.awaitingResultMatches} label="Aguardando resultado" />
        <StatCard icon={ShieldAlert} value={ind.disputedMatches} label="Em disputa" />
        <StatCard icon={CheckCircle2} value={ind.matchesCompleted} label="Partidas concluídas" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card-ecl p-6">
          <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-gold">
            Inscrições (últimos 30 dias)
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.charts.registrationsOverTime}>
              <defs>
                <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D6B15E" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#D6B15E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="date" stroke="#9299A8" fontSize={11} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis stroke="#9299A8" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 8 }} />
              <Area type="monotone" dataKey="count" stroke="#D6B15E" fill="url(#regGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card-ecl p-6">
          <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-gold">
            Campeonatos por status
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.charts.tournamentsByStatus.map((t) => ({
              name: tournamentStatusLabel[t.status as keyof typeof tournamentStatusLabel] ?? t.status,
              total: t.count,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="name" stroke="#9299A8" fontSize={11} />
              <YAxis stroke="#9299A8" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 8 }} />
              <Bar dataKey="total" fill="#D6B15E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Atividade recente */}
      <div className="card-ecl p-6">
        <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-gold">
          Atividade recente
        </h3>
        {data.recentActivity.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Nenhuma atividade registrada.</p>
        ) : (
          <div className="space-y-2">
            {data.recentActivity.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-4 rounded-md bg-ink/40 px-4 py-2.5 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant="neutral" className="shrink-0">{log.action}</Badge>
                  <span className="text-paper">{log.actor}</span>
                  <span className="text-muted truncate">→ {log.entity}</span>
                </div>
                <span className="shrink-0 text-xs text-muted">{formatDateTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

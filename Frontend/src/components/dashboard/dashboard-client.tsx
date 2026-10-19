"use client";

import Link from "next/link";
import {
  Trophy, Shield, LogOut, User, Settings,
  ChevronRight, Gamepad2, Users, BarChart2,
  Bell, ClipboardList,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuthStore } from "@/stores/auth.store";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { hasRole } from "@/types/user";
import { formatDate } from "@/lib/utils";
import { tournamentStatusLabel } from "@/lib/labels";
import type { TournamentListItem } from "@/types/tournament";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Atalhos por papel ────────────────────────────────────────────────────────

const ADMIN_SHORTCUTS = [
  { href: "/admin", icon: Shield, label: "Painel Admin", description: "Dashboard, campeonatos e usuários" },
  { href: "/admin/tournaments", icon: Trophy, label: "Campeonatos", description: "Criar e gerenciar" },
  { href: "/admin/registrations", icon: ClipboardList, label: "Inscrições", description: "Aprovar e rejeitar" },
  { href: "/admin/users", icon: Users, label: "Usuários", description: "Contas e permissões" },
];

const PLAYER_SHORTCUTS = [
  { href: "/tournaments", icon: Trophy, label: "Campeonatos", description: "Ver todos os torneios" },
  { href: "/teams", icon: Users, label: "Equipes", description: "Encontrar ou criar equipe" },
  { href: "/rankings", icon: BarChart2, label: "Ranking", description: "Classificação geral" },
  { href: "/matches", icon: Gamepad2, label: "Partidas", description: "Agendadas e ao vivo" },
];

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMINISTRATOR: "Administrador",
  TOURNAMENT_ORGANIZER: "Organizador",
  REFEREE: "Árbitro",
  TEAM_CAPTAIN: "Capitão",
  PLAYER: "Jogador",
  VISITOR: "Visitante",
};

const ROLE_BADGE: Record<string, "gold" | "success" | "neutral"> = {
  SUPER_ADMIN: "gold",
  ADMINISTRATOR: "gold",
  TOURNAMENT_ORGANIZER: "neutral",
  REFEREE: "neutral",
  TEAM_CAPTAIN: "success",
  PLAYER: "success",
  VISITOR: "neutral",
};

// ─── Componente principal ─────────────────────────────────────────────────────

export function DashboardClient() {
  const { user, status, logout } = useAuthStore();

  const isAdmin = user ? hasRole(user.role as never, "ADMINISTRATOR") : false;
  const shortcuts = isAdmin ? ADMIN_SHORTCUTS : PLAYER_SHORTCUTS;

  // Campeonatos ativos (para mostrar acompanhamento rápido)
  const { data: tournamentsData, isLoading: loadingTournaments } = useQuery({
    queryKey: ["dashboard-tournaments"],
    queryFn: () =>
      api.get<{ data: TournamentListItem[] }>(
        "/tournaments?status=REGISTRATION_OPEN,IN_PROGRESS&pageSize=3",
      ),
    enabled: Boolean(user),
  });

  // Notificações não lidas
  const { data: notifData } = useQuery({
    queryKey: ["dashboard-notifications"],
    queryFn: () =>
      api.get<{ unreadCount: number }>("/notifications?unreadOnly=true&pageSize=1"),
    enabled: Boolean(user),
  });

  if (status === "loading" || status === "idle") {
    return <LoadingState className="min-h-[60vh]" />;
  }

  if (!user) return null;

  const unread = notifData?.unreadCount ?? 0;
  const activeTournaments = tournamentsData?.data ?? [];

  return (
    <div className="container-ecl py-10 space-y-8">

      {/* ── Cabeçalho do perfil ── */}
      <div className="card-ecl p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <Avatar
              name={user.displayName}
              src={user.avatarUrl}
              size="lg"
              className="h-16 w-16 text-xl"
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-paper">
                  {user.displayName}
                </h1>
                <Badge variant={ROLE_BADGE[user.role] ?? "neutral"}>
                  {ROLE_LABEL[user.role] ?? user.role}
                </Badge>
                {unread > 0 && (
                  <Link href="/notifications" className="flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                    <Bell className="h-3 w-3" />
                    {unread} nova{unread !== 1 ? "s" : ""}
                  </Link>
                )}
              </div>
              <p className="text-sm text-muted">@{user.username} · {user.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/profile" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <User className="h-3.5 w-3.5" /> Perfil
            </Link>
            <button
              onClick={() => { void logout().then(() => { window.location.href = "/"; }); }}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>
      </div>

      {/* ── Atalhos rápidos ── */}
      <div>
        <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-tight text-paper">
          {isAdmin ? "Administração" : "Atalhos rápidos"}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {shortcuts.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="card-ecl group flex items-center gap-4 p-5 transition-colors hover:border-gold/40"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/10">
                <s.icon className="h-5 w-5 text-gold" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold uppercase tracking-tight text-paper transition-colors group-hover:text-gold">
                  {s.label}
                </p>
                <p className="truncate text-xs text-muted">{s.description}</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted/40 group-hover:text-gold" />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Campeonatos em andamento ── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold uppercase tracking-tight text-paper">
            Campeonatos ativos
          </h2>
          <Link href="/tournaments" className="text-xs font-medium uppercase tracking-wide text-gold hover:text-gold-light">
            Ver todos →
          </Link>
        </div>

        {loadingTournaments ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : activeTournaments.length === 0 ? (
          <div className="card-ecl flex flex-col items-center gap-2 py-10 text-center">
            <Trophy className="h-8 w-8 text-muted/40" />
            <p className="text-sm text-muted">Nenhum campeonato ativo no momento.</p>
            <Link href="/tournaments" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-2")}>
              Ver todos os campeonatos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {activeTournaments.map((t) => (
              <Link
                key={t.id}
                href={`/tournaments/${t.slug}`}
                className="card-ecl group flex flex-col gap-3 p-5 transition-colors hover:border-gold/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display font-bold uppercase tracking-tight text-paper transition-colors group-hover:text-gold">
                      {t.name}
                    </p>
                    <p className="text-xs text-muted">{t.season}</p>
                  </div>
                  <Badge variant={t.status === "IN_PROGRESS" ? "live" : "success"} className="shrink-0">
                    {tournamentStatusLabel[t.status]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{t.registeredTeams}/{t.maxTeams} equipes</span>
                  {t.startDate && <span>{formatDate(t.startDate)}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Acesso rápido ao admin (só para admins) ── */}
      {isAdmin && (
        <div className="rounded-lg border border-gold/20 bg-gold/5 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-gold" />
              <div>
                <p className="font-display font-semibold uppercase tracking-tight text-paper">
                  Painel Administrativo
                </p>
                <p className="text-sm text-muted">
                  Gerencie campeonatos, usuários, partidas e muito mais.
                </p>
              </div>
            </div>
            <Link href="/admin" className={buttonVariants({ variant: "primary", size: "md" })}>
              Acessar painel
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}

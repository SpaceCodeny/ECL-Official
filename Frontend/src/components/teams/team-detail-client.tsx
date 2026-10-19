"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft, Users, Crown, User as UserIcon,
  Calendar, Shield, Swords,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/lib/api-client";
import { formatDate, cn } from "@/lib/utils";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  role: string;
  joinedAt: string;
  player: {
    id: string;
    user: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
  };
}

interface TeamDetail {
  id: string;
  slug: string;
  name: string;
  tag: string | null;
  logoUrl: string | null;
  description: string | null;
  createdAt: string;
  isActive: boolean;
  memberships: TeamMember[];
}

const ROLE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; badge: "gold" | "neutral" | "success" }
> = {
  CAPTAIN: { label: "Capitão", icon: Crown, badge: "gold" },
  PLAYER: { label: "Jogador", icon: UserIcon, badge: "success" },
  SUBSTITUTE: { label: "Reserva", icon: UserIcon, badge: "neutral" },
};

// ─── Componente principal ─────────────────────────────────────────────────────

export function TeamDetailClient({ slug }: { slug: string }) {
  const { data: team, isLoading, isError, refetch } = useQuery({
    queryKey: ["team", slug],
    queryFn: () => api.get<TeamDetail>(`/teams/${slug}`),
  });

  if (isLoading) return <LoadingState label="Carregando equipe…" className="min-h-[60vh]" />;
  if (isError || !team) return <ErrorState onRetry={() => void refetch()} className="min-h-[60vh]" />;

  const captain = team.memberships.find((m) => m.role === "CAPTAIN");
  const players = team.memberships.filter((m) => m.role === "PLAYER");
  const substitutes = team.memberships.filter((m) => m.role === "SUBSTITUTE");

  return (
    <div>
      {/* ── Banner hero ── */}
      <div className="relative overflow-hidden border-b border-border bg-navy/50">
        {/* Glow de fundo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-gold/10 blur-[120px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right,#D6B15E 1px,transparent 1px),linear-gradient(to bottom,#D6B15E 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="container-ecl relative z-10 py-10">
          <Link
            href="/teams"
            className="mb-8 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted/70 transition-colors hover:text-paper"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Todas as equipes
          </Link>

          <div className="flex flex-col gap-8 sm:flex-row sm:items-end">
            {/* Logo grande */}
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gold/20 blur-xl opacity-60" aria-hidden />
              <Avatar
                name={team.name}
                src={team.logoUrl}
                size="lg"
                className="relative h-24 w-24 rounded-2xl border border-border/80 text-3xl font-bold shadow-xl sm:h-28 sm:w-28"
              />
            </div>

            {/* Info principal */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                {team.tag && (
                  <span className="rounded-md border border-gold/40 bg-gold/10 px-3 py-1 font-display text-xs font-bold uppercase tracking-[0.2em] text-gold">
                    {team.tag}
                  </span>
                )}
                {!team.isActive && (
                  <Badge variant="neutral">Inativa</Badge>
                )}
              </div>
              <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-paper sm:text-5xl">
                {team.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-gold/60" />
                  Fundada em {formatDate(team.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-gold/60" />
                  {team.memberships.length} membro{team.memberships.length !== 1 ? "s" : ""}
                </span>
              </div>
              {team.description && (
                <p className="max-w-xl text-sm text-muted/80 leading-relaxed">
                  {team.description}
                </p>
              )}
            </div>

            {/* Stat chips */}
            <div className="ml-auto hidden gap-3 sm:flex">
              <StatChip label="Jogadores" value={players.length} icon={Swords} />
              {substitutes.length > 0 && (
                <StatChip label="Reservas" value={substitutes.length} icon={Shield} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Corpo ── */}
      <div className="container-ecl py-10 space-y-12">

        {/* Capitão */}
        {captain && (
          <section>
            <SectionTitle icon={Crown} label="Capitão" />
            <div className="mt-4 max-w-xs">
              <MemberCard member={captain} featured />
            </div>
          </section>
        )}

        {/* Elenco principal */}
        {players.length > 0 && (
          <section>
            <SectionTitle icon={Swords} label={`Elenco (${players.length})`} />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {players.map((m) => (
                <MemberCard key={m.id} member={m} />
              ))}
            </div>
          </section>
        )}

        {/* Reservas */}
        {substitutes.length > 0 && (
          <section>
            <SectionTitle icon={Shield} label={`Reservas (${substitutes.length})`} />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {substitutes.map((m) => (
                <MemberCard key={m.id} member={m} />
              ))}
            </div>
          </section>
        )}

        {/* Vazio */}
        {team.memberships.length === 0 && (
          <EmptyState icon={Users} title="Sem membros" description="Esta equipe ainda não tem jogadores cadastrados." />
        )}
      </div>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gold/10">
        <Icon className="h-4 w-4 text-gold" />
      </div>
      <h2 className="font-display text-sm font-bold uppercase tracking-[0.15em] text-gold">
        {label}
      </h2>
      <div className="h-px flex-1 bg-gradient-to-r from-gold/20 to-transparent" />
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-surface/60 px-5 py-4 text-center">
      <Icon className="h-4 w-4 text-gold/70" />
      <span className="font-display text-2xl font-bold text-paper">{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-widest text-muted/70">{label}</span>
    </div>
  );
}

function MemberCard({ member, featured = false }: { member: TeamMember; featured?: boolean }) {
  const config = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.PLAYER!;
  const { user } = member.player;

  return (
    <Link
      href={`/players/${user.username}`}
      className={cn(
        "group relative overflow-hidden rounded-xl border transition-all duration-300",
        featured
          ? "border-gold/40 bg-gradient-to-br from-gold/10 via-surface to-surface hover:border-gold/70 hover:shadow-md hover:shadow-gold/10"
          : "border-border bg-surface hover:border-gold/40 hover:shadow-sm hover:shadow-gold/5",
      )}
    >
      {/* Linha superior dourada para o capitão */}
      {featured && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold/60 to-transparent" aria-hidden />
      )}

      <div className="flex items-center gap-4 p-4">
        {/* Avatar com glow no hover */}
        <div className="relative shrink-0">
          <div
            className={cn(
              "absolute inset-0 rounded-full blur-md transition-opacity duration-300",
              featured ? "bg-gold/20 opacity-60 group-hover:opacity-100" : "bg-gold/10 opacity-0 group-hover:opacity-60",
            )}
            aria-hidden
          />
          <Avatar
            name={user.displayName}
            src={user.avatarUrl}
            size="md"
            className="relative border border-border/60"
          />
        </div>

        {/* Dados */}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate font-display text-sm font-bold uppercase tracking-tight transition-colors",
              featured ? "text-gold" : "text-paper group-hover:text-gold",
            )}
          >
            {user.displayName}
          </p>
          <p className="text-xs text-muted/70">@{user.username}</p>
        </div>

        {/* Badge de papel */}
        <Badge variant={config.badge} className="shrink-0 text-[10px] px-1.5 py-0.5">
          {config.label}
        </Badge>
      </div>
    </Link>
  );
}

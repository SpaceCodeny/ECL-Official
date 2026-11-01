"use client";

import Link from "next/link";
import { Users, Trophy, TrendingUp, Star, Crown } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface TeamEntry {
  id: string;
  name: string;
  tag: string | null;
  slug: string;
  logoUrl: string | null;
}

interface RegisteredTeam {
  team: TeamEntry;
}

interface InvitedTeamEntry {
  id: string;
  team: TeamEntry;
  bracketSlot: number;
}

interface TournamentTeamsViewProps {
  registrations: RegisteredTeam[];
  invitedTeams: InvitedTeamEntry[];
  rankingMap: Map<string, number>;
  isLoadingInvited?: boolean;
}

// Card de time inscrito (borda azul marinho)
function RegisteredTeamCard({
  reg,
  index,
  rankingPosition,
}: {
  reg: RegisteredTeam;
  index: number;
  rankingPosition: number;
}) {
  return (
    <Link
      href={`/teams/${reg.team.slug}`}
      className="group flex flex-col items-center gap-2 rounded-2xl border-2 border-[#1a3a6e] bg-gradient-to-b from-[#0d1e3d]/80 to-[#0a1628]/60 p-3 text-center transition-all duration-300 hover:border-[#2a5ab8] hover:shadow-xl hover:shadow-[#1a3a6e]/30 hover:scale-[1.04]"
    >
      {/* Posição de inscrição e ranking */}
      <div className="flex w-full items-center justify-between gap-1">
        <span className="rounded bg-[#1a3a6e]/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#4d7ecf] leading-none">
          #{index + 1}
        </span>
        {rankingPosition <= 3 ? (
          <span className="flex items-center gap-0.5 rounded bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold text-gold leading-none">
            <Crown className="h-2 w-2 shrink-0" />
            #{rankingPosition}
          </span>
        ) : (
          <span className="flex items-center gap-0.5 rounded bg-[#1a3a6e]/40 px-1.5 py-0.5 text-[9px] font-semibold text-[#4d7ecf] leading-none">
            <TrendingUp className="h-2 w-2 shrink-0" />
            #{rankingPosition}
          </span>
        )}
      </div>

      {/* Avatar circular com glow */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-[#1a3a6e]/60 blur-md transition-all duration-300 group-hover:bg-[#2a5ab8]/50 group-hover:blur-lg" />
        <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-[#1a3a6e] bg-[#0d1e3d] transition-all duration-300 group-hover:border-[#2a5ab8] group-hover:shadow-md group-hover:shadow-[#2a5ab8]/40">
          {reg.team.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={reg.team.logoUrl} alt={reg.team.name} className="h-full w-full object-contain p-1" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-base font-bold text-[#4d7ecf]">
              {reg.team.name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Nome e tag */}
      <div className="w-full space-y-0.5">
        <h3 className="w-full truncate font-display text-[11px] font-bold uppercase tracking-tight text-paper transition-colors duration-300 group-hover:text-[#6a9fe8]">
          {reg.team.name}
        </h3>
        {reg.team.tag && (
          <p className="text-[9px] font-medium uppercase tracking-widest text-[#4d7ecf]/70">
            {reg.team.tag}
          </p>
        )}
      </div>
    </Link>
  );
}

// Card de time convidado (borda dourada)
function InvitedTeamCard({
  invited,
  rankingPosition,
}: {
  invited: InvitedTeamEntry;
  rankingPosition?: number;
}) {
  return (
    <Link
      href={`/teams/${invited.team.slug}`}
      className="group flex flex-col items-center gap-2 rounded-2xl border-2 border-[#b8973a] bg-gradient-to-b from-[#2a1f06]/80 to-[#1a1200]/60 p-3 text-center transition-all duration-300 hover:border-gold hover:shadow-xl hover:shadow-gold/25 hover:scale-[1.04]"
    >
      {/* Slot e ranking */}
      <div className="flex w-full items-center justify-between gap-1">
        <span className="flex min-w-0 items-center gap-0.5 rounded bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gold leading-none">
          <Star className="h-2 w-2 shrink-0 fill-gold" />
          <span className="truncate">#{invited.bracketSlot}</span>
        </span>
        {rankingPosition && (
          <span className="flex items-center gap-0.5 rounded bg-gold/10 px-1.5 py-0.5 text-[9px] font-semibold text-gold/80 leading-none">
            <TrendingUp className="h-2 w-2 shrink-0" />
            #{rankingPosition}
          </span>
        )}
      </div>

      {/* Avatar circular com glow dourado */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gold/20 blur-md transition-all duration-300 group-hover:bg-gold/35 group-hover:blur-lg" />
        <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-[#b8973a] bg-[#1a1200] transition-all duration-300 group-hover:border-gold group-hover:shadow-md group-hover:shadow-gold/40">
          {invited.team.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={invited.team.logoUrl} alt={invited.team.name} className="h-full w-full object-contain p-1" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-base font-bold text-gold">
              {invited.team.name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Nome e tag */}
      <div className="w-full space-y-0.5">
        <h3 className="w-full truncate font-display text-[11px] font-bold uppercase tracking-tight text-paper transition-colors duration-300 group-hover:text-gold">
          {invited.team.name}
        </h3>
        {invited.team.tag && (
          <p className="text-[9px] font-medium uppercase tracking-widest text-gold/50">
            {invited.team.tag}
          </p>
        )}
        <p className="text-[9px] font-semibold uppercase tracking-widest text-gold/60">
          Convidado
        </p>
      </div>
    </Link>
  );
}

// Header de seção reutilizável
function SectionHeader({
  accentColor,
  title,
  badge,
}: {
  accentColor: "blue" | "gold";
  title: string;
  badge: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col items-center gap-2 text-center">
      <div className="flex items-center gap-3">
        <div
          className={`h-8 w-1 rounded-full ${
            accentColor === "gold"
              ? "bg-gradient-to-b from-gold to-[#b8973a]"
              : "bg-gradient-to-b from-[#2a5ab8] to-[#1a3a6e]"
          }`}
        />
        <h2 className="font-display text-lg font-bold uppercase tracking-tight text-paper sm:text-xl">
          {title}
        </h2>
        <div
          className={`h-8 w-1 rounded-full ${
            accentColor === "gold"
              ? "bg-gradient-to-b from-gold to-[#b8973a]"
              : "bg-gradient-to-b from-[#2a5ab8] to-[#1a3a6e]"
          }`}
        />
      </div>
      {badge}
    </div>
  );
}

// Grid centralizado: usa flex wrap para centralizar quando não preenche a linha inteira
function TeamsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {children}
    </div>
  );
}

// Skeleton para loading dos convidados
function InvitedSkeleton() {
  return (
    <TeamsGrid>
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-44 w-[140px] animate-pulse rounded-2xl border-2 border-[#b8973a]/20 bg-[#1a1200]/40"
        />
      ))}
    </TeamsGrid>
  );
}

export function TournamentTeamsView({
  registrations,
  invitedTeams,
  rankingMap,
  isLoadingInvited,
}: TournamentTeamsViewProps) {
  const hasRegistered = registrations.length > 0;
  const hasInvited = invitedTeams.length > 0;

  return (
    <div className="space-y-12">

      {/* ── 1. Times Convidados (primeiro) ───────────────────── */}
      {(hasInvited || isLoadingInvited) && (
        <section>
          <SectionHeader
            accentColor="gold"
            title="Times Convidados"
            badge={
              !isLoadingInvited ? (
                <span className="rounded-full border border-[#b8973a] bg-[#2a1f06]/60 px-3.5 py-1 text-sm font-semibold text-gold">
                  {invitedTeams.length} {invitedTeams.length === 1 ? "time" : "times"}
                </span>
              ) : null
            }
          />
          {isLoadingInvited ? (
            <InvitedSkeleton />
          ) : (
            <TeamsGrid>
              {invitedTeams.map((invited) => (
                <div key={invited.id} className="w-[140px] sm:w-[155px]">
                  <InvitedTeamCard
                    invited={invited}
                    rankingPosition={rankingMap.get(invited.team.id)}
                  />
                </div>
              ))}
            </TeamsGrid>
          )}
        </section>
      )}

      {/* ── Divisor ──────────────────────────────────────────── */}
      {(hasInvited || isLoadingInvited) && hasRegistered && (
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          <Trophy className="h-4 w-4 text-muted/30" />
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
      )}

      {/* ── 2. Times Inscritos (segundo) ─────────────────────── */}
      <section>
        <SectionHeader
          accentColor="blue"
          title="Times Inscritos"
          badge={
            <span className="rounded-full border border-[#1a3a6e] bg-[#0d1e3d]/60 px-3.5 py-1 text-sm font-semibold text-[#4d7ecf]">
              {registrations.length} {registrations.length === 1 ? "time" : "times"}
            </span>
          }
        />
        {!hasRegistered ? (
          <EmptyState
            icon={Users}
            title="Nenhuma equipe inscrita"
            description="As equipes aprovadas aparecerão aqui."
          />
        ) : (
          <TeamsGrid>
            {registrations.map((r, index) => {
              const rankingPosition = rankingMap.get(r.team.id) ?? index + 1;
              return (
                <div key={r.team.id} className="w-[140px] sm:w-[155px]">
                  <RegisteredTeamCard
                    reg={r}
                    index={index}
                    rankingPosition={rankingPosition}
                  />
                </div>
              );
            })}
          </TeamsGrid>
        )}
      </section>

      {/* ── Vazio total ──────────────────────────────────────── */}
      {!hasRegistered && !hasInvited && !isLoadingInvited && (
        <EmptyState
          icon={Users}
          title="Nenhuma equipe no campeonato"
          description="Times inscritos e convidados aparecerão aqui."
        />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Calendar, Users, Trophy, Layers, FileText,
  GitBranch, List, ArrowLeft, TrendingUp,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { TournamentStatusBadge } from "./status-badge";
import { BracketView } from "@/components/matches/bracket-view";
import { MatchCard } from "@/components/matches/match-card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { getTournamentBySlug } from "@/services/tournaments.service";
import { api } from "@/lib/api-client";
import { formatDate, cn } from "@/lib/utils";
import { tournamentFormatLabel, seriesFormatLabel } from "@/lib/labels";
import { useAuthStore } from "@/stores/auth.store";
import { hasRole } from "@/types/user";

type Tab = "overview" | "teams" | "matches" | "bracket" | "rules";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Visão geral", icon: List },
  { id: "teams", label: "Equipes", icon: Users },
  { id: "matches", label: "Partidas", icon: Calendar },
  { id: "bracket", label: "Chaveamento", icon: GitBranch },
  { id: "rules", label: "Regras", icon: FileText },
];

export function TournamentDetailClient({ slug }: { slug: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const { user } = useAuthStore();
  const isAdmin = user ? hasRole(user.role as never, "ADMINISTRATOR") : false;

  const { data: tournament, isLoading, isError, refetch } = useQuery({
    queryKey: ["tournament", slug],
    queryFn: () => getTournamentBySlug(slug),
  });

  const { data: matchesData, isLoading: isLoadingMatches } = useQuery({
    queryKey: ["tournament-matches", tournament?.id],
    queryFn: () => api.get<{ data: unknown[]; pagination: unknown }>(`/matches?tournamentId=${tournament!.id}&limit=100`),
    enabled: Boolean(tournament?.id) && activeTab === "matches",
  });

  const { data: bracketStages, isLoading: isLoadingBracket } = useQuery({
    queryKey: ["tournament-bracket", tournament?.id],
    queryFn: () => api.get<BracketStageData[]>(`/tournaments/${tournament!.id}/bracket`),
    enabled: Boolean(tournament?.id) && activeTab === "bracket",
  });

  // Buscar rankings dos times inscritos (sempre, não só quando aba está ativa)
  const { data: rankingsData } = useQuery({
    queryKey: ["rankings"],
    queryFn: () => api.get<{ data: Array<{ teamId: string; position: number }> }>("/rankings"),
  });

  if (isLoading) return <LoadingState label="Carregando campeonato…" className="min-h-[60vh]" />;
  if (isError || !tournament) return <ErrorState onRetry={() => void refetch()} className="min-h-[60vh]" />;

  const registrations = (tournament as unknown as { registrations?: { team: { id: string; slug: string; name: string; tag: string | null; logoUrl: string | null } }[] }).registrations ?? [];
  
  // Criar mapa de posições de ranking
  const rankingMap = new Map<string, number>();
  if (rankingsData?.data) {
    rankingsData.data.forEach((r: { teamId: string; position: number }) => {
      rankingMap.set(r.teamId, r.position);
    });
  }

  return (
    <div className="pb-20">
      {/* Header do campeonato */}
      <div className="border-b border-border bg-navy/40">
        <div className="container-ecl py-6 sm:py-8">
          <Link href="/tournaments" className="mb-4 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-paper">
            <ArrowLeft className="h-4 w-4" />
            Todos os campeonatos
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <TournamentStatusBadge status={tournament.status} />
              <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-paper sm:text-4xl">
                {tournament.name}
              </h1>
              <p className="text-sm uppercase tracking-widest text-gold">{tournament.season}</p>
              {tournament.description && (
                <p className="max-w-2xl text-sm text-muted">{tournament.description}</p>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-3 text-sm text-muted lg:items-end">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-gold/70" />
                {tournamentFormatLabel[tournament.format]} · {seriesFormatLabel[tournament.seriesFormat]}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gold/70" />
                Início: {tournament.startDate ? formatDate(tournament.startDate) : "A definir"}
              </span>
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gold/70" />
                {tournament.registeredTeams}/{tournament.maxTeams} equipes
              </span>
              {tournament.prizePool && (
                <span className="flex items-center gap-2 text-gold">
                  <Trophy className="h-4 w-4" />
                  {tournament.prizePool}
                </span>
              )}
            </div>
          </div>

          {tournament.status === "REGISTRATION_OPEN" && isAdmin && (
            <div className="mt-6">
              <Link href={`/tournaments/${slug}/register`} className={buttonVariants({ variant: "primary", size: "lg" })}>
                Inscrever equipe
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Abas de navegação */}
      <div className="sticky top-16 z-30 border-b border-border bg-ink/95 backdrop-blur">
        <div className="container-ecl">
          <nav className="flex gap-1 overflow-x-auto" aria-label="Seções do campeonato">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-xs font-medium uppercase tracking-wide transition-colors sm:gap-2 sm:px-4 sm:text-sm",
                  activeTab === tab.id
                    ? "border-gold text-gold"
                    : "border-transparent text-muted hover:text-paper",
                )}
              >
                <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Conteúdo das abas */}
      <div className="container-ecl py-6 sm:py-8">
        {activeTab === "overview" && (
          <div className="max-w-3xl space-y-6">
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-paper">Sobre o campeonato</h2>
            <p className="text-muted">{tournament.description ?? "Sem descrição disponível."}</p>
            {tournament.registrationDeadline && (
              <p className="text-sm text-muted">
                <strong className="text-paper">Prazo de inscrição:</strong>{" "}
                {formatDate(tournament.registrationDeadline)}
              </p>
            )}
          </div>
        )}

        {activeTab === "teams" && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold uppercase tracking-tight text-paper">
                Equipes Inscritas
              </h2>
              <span className="rounded-full bg-gold/10 px-3 py-1 text-sm font-semibold text-gold">
                {registrations.length} {registrations.length === 1 ? "equipe" : "equipes"}
              </span>
            </div>
            {registrations.length === 0 ? (
              <EmptyState icon={Users} title="Nenhuma equipe inscrita" description="As equipes aprovadas aparecerão aqui." />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {registrations.map((r, index) => {
                  const rankingPosition = rankingMap.get(r.team.id) ?? index + 1;
                  
                  return (
                    <Link
                      key={r.team.id}
                      href={`/teams/${r.team.slug}`}
                      className="group relative overflow-hidden rounded-xl border border-border bg-surface transition-all hover:border-gold/40 hover:shadow-lg hover:shadow-gold/10"
                    >
                      {/* Número de inscrição */}
                      <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-ink/80 backdrop-blur">
                        <span className="font-display text-sm font-bold text-muted">#{index + 1}</span>
                      </div>

                      <div className="p-5">
                        <div className="mb-4 flex items-center gap-4">
                          <div className="relative">
                            <Avatar name={r.team.name} src={r.team.logoUrl} size="lg" className="ring-2 ring-border transition-colors group-hover:ring-gold/40" />
                            {/* Indicador de ranking top 3 */}
                            {rankingPosition <= 3 && (
                              <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-ink">
                                {rankingPosition}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-display text-base font-bold uppercase tracking-tight text-paper transition-colors group-hover:text-gold">
                              {r.team.name}
                            </h3>
                            {r.team.tag && (
                              <p className="text-xs uppercase tracking-wide text-muted">{r.team.tag}</p>
                            )}
                          </div>
                        </div>

                        {/* Informações adicionais */}
                        <div className="flex items-center justify-between border-t border-border/50 pt-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted">
                            <TrendingUp className="h-3.5 w-3.5 text-gold/70" />
                            <span>Ranking: <span className="font-semibold text-paper">#{rankingPosition}</span></span>
                          </div>
                          <span className="text-xs text-gold opacity-0 transition-opacity group-hover:opacity-100">
                            Ver perfil →
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "matches" && (
          <div>
            <h2 className="mb-6 font-display text-xl font-bold uppercase tracking-tight text-paper">Partidas</h2>
            {isLoadingMatches ? (
              <LoadingState label="Carregando partidas…" />
            ) : !matchesData?.data.length ? (
              <EmptyState icon={Calendar} title="Nenhuma partida" description="As partidas serão exibidas quando criadas." />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(matchesData.data as Parameters<typeof MatchCard>[0]["match"][]).map((m) => (
                  <MatchCard key={(m as { id: string }).id} match={m} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "bracket" && (
          isLoadingBracket ? (
            <LoadingState label="Carregando chaveamento…" />
          ) : (
            <BracketView stages={bracketStages} />
          )
        )}

        {activeTab === "rules" && (
          <div className="prose prose-invert max-w-3xl">
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-paper">Regulamento</h2>
            {tournament.rules ? (
              <p className="mt-4 whitespace-pre-wrap text-muted">{tournament.rules}</p>
            ) : (
              <EmptyState icon={FileText} title="Regulamento não publicado" description="O regulamento será disponibilizado em breve." />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Tipos para o bracket
interface StandingRow {
  team: { id: string; name: string; slug: string; logoUrl: string | null; tag: string | null };
  played: number; wins: number; losses: number; mapsWon: number; mapsLost: number; points: number;
}
interface GroupData {
  id: string; name: string; order: number;
  standings: StandingRow[];
}
interface BracketMatchData {
  id: string; status: string; scheduledAt: string | null; seriesFormat: string;
  scoreA: number | null; scoreB: number | null; winnerTeamId: string | null;
  teamA: { id: string; name: string; tag: string | null; logoUrl: string | null } | null;
  teamB: { id: string; name: string; tag: string | null; logoUrl: string | null } | null;
  group: { id: string; name: string } | null;
}
export interface BracketStageData {
  id: string; name: string; order: number; type: string;
  groups: GroupData[];
  matches: BracketMatchData[];
}

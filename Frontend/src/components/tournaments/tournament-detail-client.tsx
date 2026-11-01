"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar, Users, Trophy, Layers, FileText,
  GitBranch, List, ArrowLeft, Target, Clock,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { TournamentStatusBadge } from "./status-badge";
import { MatchCard } from "@/components/matches/match-card";
import { PlayoffBracketView, InvitedTeamsPanel } from "./playoff-bracket-view";
import type { PlayoffBracketData } from "./playoff-bracket-view";
import { MatchesGroupedView } from "@/components/matches/matches-grouped-view";
import { EmptyState } from "@/components/ui/empty-state";
import { getTournamentBySlug } from "@/services/tournaments.service";
import { api } from "@/lib/api-client";
import { formatDate, cn } from "@/lib/utils";
import { tournamentFormatLabel, seriesFormatLabel } from "@/lib/labels";
import { useAuthStore } from "@/stores/auth.store";
import { hasRole } from "@/types/user";
import { TournamentRegistrationModal } from "./tournament-registration-modal";
import { SwissStandingsView } from "./swiss-standings-view";
import { SwissAdminPanel } from "./swiss-admin-panel";
import { SwissMatchesView } from "./swiss-matches-view";
import { SwissRoundsBracket } from "./swiss-rounds-bracket";
import { SwissSystemBracket } from "./swiss-system-bracket";
import { SwissBracketHLTV } from "./swiss-bracket-hltv";
import { TournamentTeamsView } from "./tournament-teams-view";

type Tab = "overview" | "teams" | "matches" | "swiss" | "bracket" | "rules";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Visão geral", icon: List },
  { id: "teams", label: "Equipes", icon: Users },
  { id: "matches", label: "Partidas", icon: Calendar },
  { id: "swiss", label: "Swiss System", icon: Target },
  { id: "bracket", label: "Playoffs", icon: GitBranch },
  { id: "rules", label: "Regras", icon: FileText },
];

export function TournamentDetailClient({ slug }: { slug: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const { user } = useAuthStore();
  const isAdmin = user ? hasRole(user.role as never, "ADMINISTRATOR") : false;
  const router = useRouter();
  const searchParams = useSearchParams();

  // Lê o parâmetro ?tab= da URL para abrir a aba correta ao navegar do modal de pagamento
  useEffect(() => {
    const tabParam = searchParams.get("tab") as Tab | null;
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const { data: tournament, isLoading, isError, refetch } = useQuery({
    queryKey: ["tournament", slug],
    queryFn: () => getTournamentBySlug(slug),
  });

  const { data: matchesData, isLoading: isLoadingMatches } = useQuery({
    queryKey: ["tournament-matches", tournament?.id],
    queryFn: () => api.get<{ data: unknown[]; pagination: unknown }>(`/matches?tournamentId=${tournament!.id}&limit=100`),
    enabled: Boolean(tournament?.id) && activeTab === "matches",
  });

  const { data: bracketData, isLoading: isLoadingBracket, refetch: refetchBracket } = useQuery({
    queryKey: ["tournament-bracket", tournament?.id],
    queryFn: () => api.get<PlayoffBracketData>(`/tournaments/${tournament!.id}/bracket`),
    enabled: Boolean(tournament?.id) && activeTab === "bracket",
    refetchInterval: activeTab === "bracket" ? 10000 : false,
  });

  // Buscar partidas da fase suíça separadamente
  const { data: swissRounds, isLoading: isLoadingSwissRounds } = useQuery({
    queryKey: ["swiss-rounds", tournament?.id],
    queryFn: () => api.get<Array<{
      id: string;
      roundNumber: number;
      isComplete: boolean;
      matches: Array<{
        id: string;
        teamAId: string;
        teamBId: string;
        teamA: { id: string; name: string; slug: string; logoUrl: string | null; tag: string | null };
        teamB: { id: string; name: string; slug: string; logoUrl: string | null; tag: string | null };
        winnerId: string | null;
        status: string;
        scoreA: number | null;
        scoreB: number | null;
      }>;
    }>>(`/tournaments/${tournament!.id}/swiss/rounds`),
    enabled: Boolean(tournament?.id) && activeTab === "swiss",
  });

  // Buscar campanhas da fase suíça
  const { data: swissCampaigns, refetch: refetchSwiss } = useQuery({
    queryKey: ["swiss-campaigns", tournament?.id],
    queryFn: () => api.get<Array<{
      id: string;
      teamId: string;
      team: {
        id: string;
        name: string;
        slug: string;
        tag: string | null;
        logoUrl: string | null;
      };
      wins: number;
      losses: number;
      roundsPlayed: number;
      roundDiff: number;
      isEliminated: boolean;
    }>>(`/tournaments/${tournament!.id}/swiss/campaigns`),
    enabled: Boolean(tournament?.id) && activeTab === "swiss",
    refetchInterval: 5000, // Atualiza a cada 5 segundos
  });

  // Buscar rankings dos times inscritos (sempre, não só quando aba está ativa)
  const { data: rankingsData } = useQuery({
    queryKey: ["rankings"],
    queryFn: () => api.get<{ data: Array<{ teamId: string; position: number }> }>("/rankings"),
  });

  // Buscar equipes convidadas (usadas na aba Equipes E no Bracket)
  const { data: invitedTeams, isLoading: isLoadingInvited } = useQuery({
    queryKey: ["invited-teams", tournament?.id],
    queryFn: () => api.get<Array<{ id: string; team: { id: string; name: string; tag: string | null; slug: string; logoUrl: string | null }; bracketSlot: number; createdAt: string }>>(`/tournaments/${tournament!.id}/invited`),
    enabled: Boolean(tournament?.id), // SEMPRE buscar, não só quando aba está ativa
  });

  if (isLoading) return <LoadingState label="Carregando campeonato…" className="min-h-[60vh]" />;
  if (isError || !tournament) return <ErrorState onRetry={() => void refetch()} className="min-h-[60vh]" />;

  // Campeonatos cancelados não são acessíveis para usuários comuns.
  if (tournament.status === "CANCELLED" && !isAdmin) {
    router.replace("/tournaments");
    return null;
  }

  const registrations = (tournament as unknown as { registrations?: { team: { id: string; slug: string; name: string; tag: string | null; logoUrl: string | null } }[] }).registrations ?? [];
  
  // Criar mapa de posições de ranking
  const rankingMap = new Map<string, number>();
  if (rankingsData?.data) {
    rankingsData.data.forEach((r: { teamId: string; position: number }) => {
      rankingMap.set(r.teamId, r.position);
    });
  }

  return (
    <>
    <div className="pb-20">
      {/* Header do campeonato */}
      <div className="border-b border-border bg-navy/40">
        <div className="container-ecl py-6 sm:py-8">
          <Link href="/tournaments" className="mb-4 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-paper">
            <ArrowLeft className="h-4 w-4" />
            Todos os campeonatos
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2 sm:space-y-3">
              <TournamentStatusBadge status={tournament.status} />
              <h1 className="font-display text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold uppercase tracking-tight text-paper">
                {tournament.name}
              </h1>
              <p className="text-xs sm:text-sm uppercase tracking-widest text-gold">{tournament.season}</p>
              {tournament.description && (
                <p className="max-w-2xl text-xs sm:text-sm text-muted">{tournament.description}</p>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:gap-3 text-xs sm:text-sm text-muted lg:items-end">
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
            <div className="mt-4 sm:mt-6">
              <Link href={`/tournaments/${slug}/register`} className={buttonVariants({ variant: "primary", size: "lg" })}>
                Inscrever equipe
              </Link>
            </div>
          )}

          {tournament.status === "REGISTRATION_OPEN" && !isAdmin && (
            <div className="mt-4 sm:mt-6">
              <button
                onClick={() => setRegistrationOpen(true)}
                className={buttonVariants({ variant: "primary", size: "lg" })}
              >
                <Users className="h-4 w-4" />
                Inscrever meu time
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Abas de navegação */}
      <div className="sticky top-16 z-30 border-b border-border bg-ink/95 backdrop-blur">
        <div className="container-ecl">
          <nav className="flex gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide" aria-label="Seções do campeonato">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1 sm:gap-1.5 md:gap-2 border-b-2 px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 text-[11px] sm:text-xs md:text-sm font-medium uppercase tracking-wide transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "border-gold text-gold"
                    : "border-transparent text-muted hover:text-paper",
                )}
              >
                <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Conteúdo das abas */}
      <div className="container-ecl py-6 sm:py-8">
        {activeTab === "overview" && (
          <div className="max-w-3xl space-y-4 sm:space-y-6">
            <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-paper">Sobre o campeonato</h2>
            <p className="text-sm sm:text-base text-muted">{tournament.description ?? "Sem descrição disponível."}</p>
            {tournament.registrationDeadline && (
              <p className="text-xs sm:text-sm text-muted">
                <strong className="text-paper">Prazo de inscrição:</strong>{" "}
                {formatDate(tournament.registrationDeadline)}
              </p>
            )}
          </div>
        )}

        {activeTab === "teams" && (
          <TournamentTeamsView
            registrations={registrations}
            invitedTeams={invitedTeams ?? []}
            rankingMap={rankingMap}
            isLoadingInvited={isLoadingInvited}
          />
        )}

        {activeTab === "matches" && (
          <div>
            <h2 className="mb-6 font-display text-xl font-bold uppercase tracking-tight text-paper">Partidas</h2>
            {isLoadingMatches ? (
              <LoadingState label="Carregando partidas…" />
            ) : !matchesData?.data.length ? (
              <EmptyState icon={Calendar} title="Nenhuma partida" description="As partidas serão exibidas quando criadas." />
            ) : (
              <MatchesGroupedView matches={matchesData.data as Parameters<typeof MatchCard>[0]["match"][]} />
            )}
          </div>
        )}

        {activeTab === "bracket" && (
          <div className="space-y-6">
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-paper">
              Playoffs — Chaveamento
            </h2>

            {isLoadingBracket ? (
              <LoadingState label="Carregando chaveamento…" />
            ) : bracketData ? (
              <div className="space-y-6">
                <InvitedTeamsPanel
                  invitedTeams={invitedTeams ?? bracketData.invitedTeams ?? []}
                  tournamentId={tournament.id}
                  isAdmin={isAdmin}
                  onUpdate={() => void refetchBracket()}
                />
                <PlayoffBracketView 
                  data={{
                    ...bracketData,
                    // Usar dados de invitedTeams da query separada se disponível (tem team completo)
                    invitedTeams: (() => {
                      const merged = invitedTeams?.map(inv => ({
                        id: inv.id,
                        bracketSlot: inv.bracketSlot,
                        team: inv.team
                      })) ?? bracketData.invitedTeams;
                      
                      console.log('[TournamentDetail] Passando invitedTeams para bracket:', {
                        fromQuery: invitedTeams?.length,
                        fromBracket: bracketData.invitedTeams?.length,
                        merged: merged?.length,
                        mergedData: merged
                      });
                      
                      return merged;
                    })()
                  }} 
                />
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface/40 p-12 text-center">
                <GitBranch className="mx-auto mb-4 h-12 w-12 text-muted/30" />
                <p className="font-display text-lg font-bold uppercase text-muted/60">
                  Erro ao carregar chaveamento
                </p>
                <p className="mt-2 text-sm text-muted/40">
                  Tente recarregar a página ou entre em contato com o suporte
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "swiss" && (
          <div className="space-y-6">
            {isAdmin && (
              <SwissAdminPanel
                tournamentId={tournament.id}
                onUpdate={() => {
                  void refetch();
                  void refetchSwiss();
                }}
              />
            )}

            {/* Bracket visual HLTV style */}
            {isLoadingSwissRounds ? (
              <LoadingState label="Carregando fase suíça…" />
            ) : (() => {
              // Debug log
              console.log('Swiss Debug:', {
                swissRounds,
                swissRoundsLength: swissRounds?.length,
                swissCampaigns,
                swissCampaignsLength: swissCampaigns?.length,
                isArray: Array.isArray(swissRounds),
                isArrayCampaigns: Array.isArray(swissCampaigns)
              });
              
              const hasRounds = Array.isArray(swissRounds) && swissRounds.length > 0;
              const hasCampaigns = Array.isArray(swissCampaigns) && swissCampaigns.length > 0;
              
              return hasRounds && hasCampaigns ? (
                <SwissBracketHLTV
                  rounds={swissRounds}
                  campaigns={swissCampaigns}
                />
              ) : (
                <div className="bg-gradient-to-br from-[#FF6B00]/10 to-purple-600/10 border border-[#FF6B00]/30 rounded-lg p-12 text-center">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                  <p className="text-xl font-bold text-gray-400 mb-2">
                    Fase Suíça não Inicializada
                  </p>
                  <p className="text-sm text-gray-500">
                    Aguardando a inicialização da fase suíça pelo administrador
                  </p>
                  <div className="mt-4 text-xs text-gray-600 space-y-1">
                    <div>Debug: Rounds={swissRounds?.length || 0} (isArray: {String(Array.isArray(swissRounds))})</div>
                    <div>Campaigns={swissCampaigns?.length || 0} (isArray: {String(Array.isArray(swissCampaigns))})</div>
                    <div>Tab: {activeTab}</div>
                  </div>
                </div>
              );
            })()}

            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            {/* Tabela de classificação */}
            <SwissStandingsView tournamentId={tournament.id} />
          </div>
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

    {/* Modal de inscrição do líder */}
    {tournament && (
      <TournamentRegistrationModal
        open={registrationOpen}
        onClose={() => setRegistrationOpen(false)}
        tournamentId={tournament.id}
        tournamentSlug={slug}
        tournamentName={tournament.name}
        tournamentRules={tournament.rules}
        paymentRequired={tournament.paymentRequired ?? false}
        entryFeeAmount={tournament.entryFeeAmount ?? null}
        whatsappGroupUrl={tournament.whatsappGroupUrl ?? null}
      />
    )}
    </>
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

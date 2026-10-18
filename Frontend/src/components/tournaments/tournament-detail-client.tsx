"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Calendar, Users, Trophy, Layers, FileText,
  BarChart2, GitBranch, List, ArrowLeft,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { TournamentStatusBadge } from "./status-badge";
import { StandingsTable } from "@/components/standings/standings-table";
import { BracketView } from "@/components/matches/bracket-view";
import { MatchCard } from "@/components/matches/match-card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { getTournamentBySlug } from "@/services/tournaments.service";
import { api } from "@/lib/api-client";
import { formatDate, cn } from "@/lib/utils";
import { tournamentFormatLabel, seriesFormatLabel } from "@/lib/labels";

type Tab = "overview" | "teams" | "standings" | "matches" | "bracket" | "rules";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Visão geral", icon: List },
  { id: "teams", label: "Equipes", icon: Users },
  { id: "standings", label: "Classificação", icon: BarChart2 },
  { id: "matches", label: "Partidas", icon: Calendar },
  { id: "bracket", label: "Chaveamento", icon: GitBranch },
  { id: "rules", label: "Regras", icon: FileText },
];

export function TournamentDetailClient({ slug }: { slug: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { data: tournament, isLoading, isError, refetch } = useQuery({
    queryKey: ["tournament", slug],
    queryFn: () => getTournamentBySlug(slug),
  });

  const { data: matchesData } = useQuery({
    queryKey: ["tournament-matches", tournament?.id],
    queryFn: () => api.get<{ data: unknown[] }>(`/matches?tournamentId=${tournament!.id}&pageSize=50`),
    enabled: Boolean(tournament?.id) && activeTab === "matches",
  });

  const { data: bracket } = useQuery({
    queryKey: ["tournament-bracket", tournament?.id],
    queryFn: () => api.get<unknown[]>(`/tournaments/${tournament!.id}/bracket`),
    enabled: Boolean(tournament?.id) && activeTab === "bracket",
  });

  if (isLoading) return <LoadingState label="Carregando campeonato…" className="min-h-[60vh]" />;
  if (isError || !tournament) return <ErrorState onRetry={() => void refetch()} className="min-h-[60vh]" />;

  const registrations = (tournament as unknown as { registrations?: { team: { id: string; slug: string; name: string; tag: string | null; logoUrl: string | null } }[] }).registrations ?? [];

  return (
    <div className="pb-20">
      {/* Header do campeonato */}
      <div className="border-b border-border bg-navy/40">
        <div className="container-ecl py-8">
          <Link href="/tournaments" className="mb-6 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-paper">
            <ArrowLeft className="h-4 w-4" />
            Todos os campeonatos
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <TournamentStatusBadge status={tournament.status} />
              <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-paper sm:text-4xl">
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

          {tournament.status === "REGISTRATION_OPEN" && (
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
                  "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium uppercase tracking-wide transition-colors",
                  activeTab === tab.id
                    ? "border-gold text-gold"
                    : "border-transparent text-muted hover:text-paper",
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Conteúdo das abas */}
      <div className="container-ecl py-8">
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
            <h2 className="mb-6 font-display text-xl font-bold uppercase tracking-tight text-paper">
              Equipes inscritas ({registrations.length})
            </h2>
            {registrations.length === 0 ? (
              <EmptyState icon={Users} title="Nenhuma equipe inscrita" description="As equipes aprovadas aparecerão aqui." />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {registrations.map((r) => (
                  <Link
                    key={r.team.id}
                    href={`/teams/${r.team.slug}`}
                    className="card-ecl flex items-center gap-4 p-4 transition-colors hover:border-gold/40"
                  >
                    <Avatar name={r.team.name} src={r.team.logoUrl} size="md" />
                    <div className="min-w-0">
                      <p className="truncate font-display font-semibold uppercase tracking-tight text-paper">{r.team.name}</p>
                      {r.team.tag && <p className="text-xs text-muted">{r.team.tag}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "standings" && (
          <StandingsTable tournamentId={tournament.id} />
        )}

        {activeTab === "matches" && (
          <div>
            <h2 className="mb-6 font-display text-xl font-bold uppercase tracking-tight text-paper">Partidas</h2>
            {!matchesData?.data.length ? (
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
          <BracketView stages={bracket as never} />
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

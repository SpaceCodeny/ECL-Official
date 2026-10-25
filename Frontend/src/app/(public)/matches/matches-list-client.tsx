"use client";

import { useState, useMemo } from "react";
import { MatchCard } from "@/components/matches/match-card";
import { cn } from "@/lib/utils";
import type { Match, MatchStatus } from "@/types/match";

interface BackendPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface MatchesListClientProps {
  initialData: BackendPaginatedResponse<Match>;
}

interface GroupedMatches {
  tournamentId: string;
  tournamentName: string;
  matches: Match[];
}

function isMatchLive(match: Match): boolean {
  if (!match.scheduledAt) return match.status === "LIVE" || match.status === "AWAITING_RESULT";
  
  const now = new Date();
  const scheduledTime = new Date(match.scheduledAt);
  const threeHoursLater = new Date(scheduledTime.getTime() + 3 * 60 * 60 * 1000);
  
  return (
    (match.status === "LIVE" || match.status === "AWAITING_RESULT") ||
    (match.status === "SCHEDULED" && now >= scheduledTime && now <= threeHoursLater)
  );
}

export function MatchesListClient({ initialData }: MatchesListClientProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  // Filtrar e agrupar partidas por torneio
  const groupedMatches = useMemo(() => {
    // Filtrar: mostrar agendadas e ao vivo sempre, finalizadas apenas se filtro ativo
    const filteredMatches = initialData.data.filter((match) => {
      const isCompleted = match.status === "COMPLETED" || match.status === "DISPUTED" || match.status === "CANCELLED";
      if (isCompleted) return showCompleted;
      return true;
    });

    // Agrupar por torneio
    const grouped = new Map<string, GroupedMatches>();
    
    filteredMatches.forEach((match) => {
      const tournamentName = typeof match.stage === "object" 
        ? match.stage?.tournament?.name ?? "Torneio Desconhecido"
        : "Torneio Desconhecido";
      const tournamentId = match.tournamentId;

      if (!grouped.has(tournamentId)) {
        grouped.set(tournamentId, {
          tournamentId,
          tournamentName,
          matches: [],
        });
      }
      grouped.get(tournamentId)!.matches.push(match);
    });

    // Ordenar matches dentro de cada grupo por data crescente
    grouped.forEach((group) => {
      group.matches.sort((a, b) => {
        // Partidas ao vivo primeiro
        const aLive = isMatchLive(a);
        const bLive = isMatchLive(b);
        if (aLive && !bLive) return -1;
        if (!aLive && bLive) return 1;

        // Depois por data agendada
        if (!a.scheduledAt && !b.scheduledAt) return 0;
        if (!a.scheduledAt) return 1;
        if (!b.scheduledAt) return -1;
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      });
    });

    return Array.from(grouped.values());
  }, [initialData.data, showCompleted]);

  const totalMatches = groupedMatches.reduce((sum, group) => sum + group.matches.length, 0);

  return (
    <div className="space-y-8">
      {/* Toggle para mostrar finalizadas */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium uppercase tracking-wide transition-all",
              "hover:bg-surface/80",
              showCompleted
                ? "bg-gold text-ink shadow-lg"
                : "bg-surface text-muted hover:text-paper"
            )}
          >
            Finalizadas
          </button>
          <span className="text-xs text-muted">
            {showCompleted ? "Mostrando todas as partidas" : "Mostrando partidas agendadas e ao vivo"}
          </span>
        </div>
      </div>

      {/* Partidas agrupadas por torneio */}
      {totalMatches === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed border-border bg-surface/30 p-8">
          <div className="text-center">
            <p className="text-lg font-medium text-paper">Nenhuma partida encontrada</p>
            <p className="mt-2 text-sm text-muted">
              {showCompleted
                ? "Não há partidas cadastradas no momento."
                : "Não há partidas agendadas ou ao vivo no momento."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {groupedMatches.map((group) => (
            <div key={group.tournamentId} className="space-y-4">
              {/* Cabeçalho do torneio */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
                <h2 className="font-display text-xl font-bold uppercase tracking-tight text-gold sm:text-2xl">
                  {group.tournamentName}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
              </div>

              {/* Grid de partidas */}
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {group.matches.map((match) => (
                  <MatchCard key={match.id} match={match} isLive={isMatchLive(match)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Informação de total */}
      <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted sm:text-sm">
        <span>
          Mostrando {totalMatches} partida(s)
        </span>
        <span className="text-muted/70">
          Total no sistema: {initialData.pagination.total}
        </span>
      </div>
    </div>
  );
}

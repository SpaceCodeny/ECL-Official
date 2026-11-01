"use client";

import { useState } from "react";
import { Calendar, ChevronDown, ChevronUp, Trophy, Target } from "lucide-react";
import { useSwissStandings } from "@/hooks/use-swiss";
import { Avatar } from "@/components/ui/avatar";
import { formatDate, formatTime } from "@/lib/utils";

interface SwissMatchesViewProps {
  tournamentId: string;
}

interface SwissMatch {
  id: string;
  round: number;
  teamA: {
    id: string;
    name: string;
    tag: string | null;
    logoUrl: string | null;
  };
  teamB: {
    id: string;
    name: string;
    tag: string | null;
    logoUrl: string | null;
  };
  scoreA: number | null;
  scoreB: number | null;
  winnerTeamId: string | null;
  scheduledAt: string | null;
  status: string;
}

export function SwissMatchesView({ tournamentId }: SwissMatchesViewProps) {
  const { standings, loading } = useSwissStandings(tournamentId);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set([1]));

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8">
        <div className="flex items-center justify-center">
          <div className="text-gray-400">Carregando partidas...</div>
        </div>
      </div>
    );
  }

  if (!standings || !standings.campaigns) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
        <p className="text-gray-400">Fase suíça ainda não foi iniciada</p>
      </div>
    );
  }

  const toggleRound = (round: number) => {
    const newExpanded = new Set(expandedRounds);
    if (newExpanded.has(round)) {
      newExpanded.delete(round);
    } else {
      newExpanded.add(round);
    }
    setExpandedRounds(newExpanded);
  };

  // Agrupar matches por rodada
  const matchesByRound: Record<number, SwissMatch[]> = {};
  
  // Criar matches fictícios baseado nas campanhas (em produção viriam da API)
  standings.campaigns.forEach((campaign) => {
    // Este é um placeholder - na implementação real, buscar matches da API
  });

  const rounds = Array.from({ length: standings.totalRounds }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-[#FF6B00]" />
          Partidas da Fase Suíça
        </h3>
        <div className="text-sm text-gray-400">
          {standings.currentRound} de {standings.totalRounds} rodadas completas
        </div>
      </div>

      {rounds.map((round) => {
        const isExpanded = expandedRounds.has(round);
        const isCurrentRound = round === standings.currentRound + 1;
        const isCompleted = round <= standings.currentRound;
        const matches = matchesByRound[round] || [];

        return (
          <div
            key={round}
            className={`bg-gray-800/50 border rounded-lg overflow-hidden transition-colors ${
              isCurrentRound
                ? "border-[#FF6B00]"
                : isCompleted
                ? "border-gray-700"
                : "border-gray-700/50"
            }`}
          >
            {/* Header da rodada */}
            <button
              onClick={() => toggleRound(round)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                    isCurrentRound
                      ? "bg-[#FF6B00] text-white"
                      : isCompleted
                      ? "bg-green-500/20 text-green-400"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {round}
                </div>
                <div>
                  <h4 className="font-bold text-left">Rodada {round}</h4>
                  <p className="text-xs text-gray-400">
                    {isCompleted
                      ? "Concluída"
                      : isCurrentRound
                      ? "Em andamento"
                      : "Aguardando"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {matches.length > 0 && (
                  <span className="text-sm text-gray-400">
                    {matches.filter((m) => m.status === "COMPLETED").length}/{matches.length} partidas
                  </span>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>

            {/* Conteúdo da rodada */}
            {isExpanded && (
              <div className="border-t border-gray-700">
                {matches.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhuma partida nesta rodada ainda</p>
                    <p className="text-sm mt-1">
                      As partidas serão geradas automaticamente
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-700">
                    {matches.map((match) => (
                      <div
                        key={match.id}
                        className="p-4 hover:bg-gray-700/20 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-4">
                          {/* Time A */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar
                              name={match.teamA.name}
                              src={match.teamA.logoUrl}
                              size="sm"
                              className={
                                match.winnerTeamId === match.teamA.id
                                  ? "ring-2 ring-green-400"
                                  : ""
                              }
                            />
                            <div className="min-w-0 flex-1">
                              <h5
                                className={`font-semibold truncate ${
                                  match.winnerTeamId === match.teamA.id
                                    ? "text-green-400"
                                    : ""
                                }`}
                              >
                                {match.teamA.name}
                              </h5>
                              {match.teamA.tag && (
                                <p className="text-xs text-gray-500">
                                  {match.teamA.tag}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Placar */}
                          <div className="flex items-center gap-2 shrink-0">
                            {match.status === "COMPLETED" ? (
                              <>
                                <span
                                  className={`text-2xl font-bold w-8 text-center ${
                                    match.winnerTeamId === match.teamA.id
                                      ? "text-green-400"
                                      : "text-gray-500"
                                  }`}
                                >
                                  {match.scoreA ?? 0}
                                </span>
                                <span className="text-gray-600">:</span>
                                <span
                                  className={`text-2xl font-bold w-8 text-center ${
                                    match.winnerTeamId === match.teamB.id
                                      ? "text-green-400"
                                      : "text-gray-500"
                                  }`}
                                >
                                  {match.scoreB ?? 0}
                                </span>
                              </>
                            ) : match.scheduledAt ? (
                              <div className="text-center">
                                <p className="text-xs text-gray-500">
                                  {formatDate(match.scheduledAt)}
                                </p>
                                <p className="text-sm font-semibold">
                                  {formatTime(match.scheduledAt)}
                                </p>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500 px-4">vs</span>
                            )}
                          </div>

                          {/* Time B */}
                          <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                            <div className="min-w-0 flex-1 text-right">
                              <h5
                                className={`font-semibold truncate ${
                                  match.winnerTeamId === match.teamB.id
                                    ? "text-green-400"
                                    : ""
                                }`}
                              >
                                {match.teamB.name}
                              </h5>
                              {match.teamB.tag && (
                                <p className="text-xs text-gray-500">
                                  {match.teamB.tag}
                                </p>
                              )}
                            </div>
                            <Avatar
                              name={match.teamB.name}
                              src={match.teamB.logoUrl}
                              size="sm"
                              className={
                                match.winnerTeamId === match.teamB.id
                                  ? "ring-2 ring-green-400"
                                  : ""
                              }
                            />
                          </div>
                        </div>

                        {/* Informações extras */}
                        {match.winnerTeamId && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                            <Trophy className="w-3.5 h-3.5" />
                            <span>
                              Vencedor:{" "}
                              {match.winnerTeamId === match.teamA.id
                                ? match.teamA.name
                                : match.teamB.name}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

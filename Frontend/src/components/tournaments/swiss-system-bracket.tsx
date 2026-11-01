"use client";

import { useEffect, useState } from "react";
import { Trophy, Clock, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

interface SwissCampaign {
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
}

interface SwissMatch {
  id: string;
  teamAId: string;
  teamBId: string;
  teamA: { id: string; name: string; slug: string; tag: string | null; logoUrl: string | null };
  teamB: { id: string; name: string; slug: string; tag: string | null; logoUrl: string | null };
  winnerId: string | null;
  status: string;
  scoreA: number | null;
  scoreB: number | null;
}

interface SwissRound {
  id: string;
  roundNumber: number;
  isComplete: boolean;
  matches: SwissMatch[];
}

interface SwissSystemBracketProps {
  rounds: SwissRound[];
  campaigns: SwissCampaign[];
  totalRounds?: number;
}

export function SwissSystemBracket({ rounds, campaigns, totalRounds = 5 }: SwissSystemBracketProps) {
  const [campaignMap, setCampaignMap] = useState<Map<string, SwissCampaign>>(new Map());

  useEffect(() => {
    const map = new Map<string, SwissCampaign>();
    campaigns.forEach((c) => map.set(c.teamId, c));
    setCampaignMap(map);
  }, [campaigns]);

  // Garante que temos todas as 5 rodadas
  const allRounds = Array.from({ length: totalRounds }, (_, i) => {
    const round = rounds.find((r) => r.roundNumber === i + 1);
    return round || {
      id: `placeholder-${i + 1}`,
      roundNumber: i + 1,
      isComplete: false,
      matches: [],
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FF6B00]/10 via-purple-600/10 to-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-lg p-6 text-center">
        <h2 className="font-display text-3xl font-bold uppercase tracking-tight mb-2">
          FASE SUÍÇA MD1 | {campaigns.length} EQUIPES
        </h2>
        <p className="text-gray-400 text-sm">
          {totalRounds} RODADAS • 12 CLASSIFICADOS • Sistema de Pareamento por Campanha
        </p>
      </div>

      {/* Grid horizontal de rodadas */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
          {allRounds.map((round, index) => (
            <div key={round.id} className="flex-shrink-0 w-80 relative">
              {/* Header da rodada */}
              <div className={cn(
                "bg-gradient-to-br rounded-t-lg p-4 text-center border-t border-x",
                round.isComplete
                  ? "from-green-600/20 to-green-500/10 border-green-500/50"
                  : round.matches.length > 0
                  ? "from-[#FF6B00]/20 to-purple-600/10 border-[#FF6B00]/50"
                  : "from-gray-800/20 to-gray-700/10 border-gray-700"
              )}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  {round.isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : round.matches.length > 0 ? (
                    <Clock className="w-5 h-5 text-[#FF6B00]" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-500" />
                  )}
                  <h3 className="font-display text-lg font-bold uppercase tracking-wider">
                    RODADA {round.roundNumber}
                  </h3>
                </div>
                
                {round.matches.length > 0 && (
                  <div className="text-xs text-gray-400">
                    {round.matches.filter((m) => m.status === "COMPLETED").length}/{round.matches.length} completas
                  </div>
                )}
              </div>

              {/* Matches container */}
              <div className={cn(
                "bg-gray-900/50 border-x border-b rounded-b-lg p-3 space-y-2 min-h-[600px]",
                round.isComplete
                  ? "border-green-500/50"
                  : round.matches.length > 0
                  ? "border-[#FF6B00]/50"
                  : "border-gray-700"
              )}>
                {round.matches.length > 0 ? (
                  round.matches.map((match) => {
                    const campaignA = campaignMap.get(match.teamAId);
                    const campaignB = campaignMap.get(match.teamBId);
                    
                    return (
                      <MatchCard
                        key={match.id}
                        match={match}
                        campaignA={campaignA}
                        campaignB={campaignB}
                      />
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    <div className="text-center space-y-2">
                      <Clock className="w-12 h-12 mx-auto opacity-30" />
                      <p className="font-semibold">Aguardando resultados</p>
                      <p className="text-xs">Os confrontos serão definidos automaticamente</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Seta de conexão */}
              {index < totalRounds - 1 && (
                <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                  <div className="w-4 h-4 bg-gray-700 border-2 border-gray-600 rounded-full" />
                  <div className="absolute top-1/2 left-full w-4 h-0.5 bg-gradient-to-r from-gray-600 to-transparent" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <h4 className="font-bold text-sm uppercase mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#FF6B00]" />
            Como Funciona
          </h4>
          <ul className="space-y-1 text-xs text-gray-400">
            <li>• Times com campanhas similares se enfrentam</li>
            <li>• Vencedor: campanha aumenta (ex: 1-0 → 2-0)</li>
            <li>• Perdedor: derrotas aumentam (ex: 0-1 → 0-2)</li>
            <li>• 3 derrotas = eliminação automática</li>
            <li>• Sistema recalcula confrontos após cada resultado</li>
          </ul>
        </div>

        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <h4 className="font-bold text-sm uppercase mb-3 text-[#FF6B00]">
            Cores das Campanhas
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-12 px-2 py-1 bg-green-500/20 border border-green-500/50 rounded text-green-400 text-center font-bold">
                3-0
              </div>
              <span className="text-gray-400">Vitórias em verde</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 px-2 py-1 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-center font-bold">
                0-3
              </div>
              <span className="text-gray-400">Derrotas em vermelho</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-300 text-center font-bold">
                2-2
              </div>
              <span className="text-gray-400">Campanha equilibrada</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gold/10 to-purple-600/10 border border-gold/30 rounded-lg p-4">
          <h4 className="font-bold text-sm uppercase mb-3 text-gold">
            Classificação
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Top 12 classificam</span>
              <span className="font-bold text-green-400">→ Oitavas</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">+ 4 convidados</span>
              <span className="font-bold text-gold">= 16 times</span>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent my-2" />
            <div className="text-center">
              <div className="text-lg font-bold text-paper">PLAYOFFS</div>
              <div className="text-gray-500">Chaveamento Eliminatório</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Card de partida individual
 */
function MatchCard({
  match,
  campaignA,
  campaignB,
}: {
  match: SwissMatch;
  campaignA?: SwissCampaign;
  campaignB?: SwissCampaign;
}) {
  const isCompleted = match.status === "COMPLETED";
  const teamAWon = match.winnerId === match.teamAId;
  const teamBWon = match.winnerId === match.teamBId;

  const getCampaignColor = (wins: number, losses: number) => {
    if (wins > losses) return "text-green-400 bg-green-500/10 border-green-500/30";
    if (losses > wins) return "text-red-400 bg-red-500/10 border-red-500/30";
    return "text-gray-400 bg-gray-700/30 border-gray-600";
  };

  return (
    <div className={cn(
      "bg-gray-800/50 border rounded-lg overflow-hidden transition-all",
      isCompleted
        ? "border-green-500/50 shadow-lg shadow-green-500/10"
        : "border-gray-700 hover:border-gray-600"
    )}>
      {/* Team A */}
      <div className={cn(
        "flex items-center gap-2 p-3 border-b",
        teamAWon && isCompleted
          ? "bg-green-500/10 border-green-500/30"
          : "border-gray-700/50"
      )}>
        <Avatar
          name={match.teamA.name}
          src={match.teamA.logoUrl}
          size="sm"
          className={cn(
            "ring-2",
            teamAWon ? "ring-green-500/50" : "ring-gray-700"
          )}
        />
        
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">
            {match.teamA.tag || match.teamA.name}
          </div>
          {campaignA && (
            <div className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded border inline-block mt-0.5",
              getCampaignColor(campaignA.wins, campaignA.losses)
            )}>
              {campaignA.wins}-{campaignA.losses}
            </div>
          )}
        </div>

        {isCompleted && (
          <div className="flex items-center gap-1">
            {teamAWon ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className="font-bold text-lg">
              {match.scoreA}
            </span>
          </div>
        )}
      </div>

      {/* VS Divider */}
      <div className="bg-gray-900/50 py-1 text-center">
        <span className="text-[10px] font-bold text-gray-500">VS</span>
      </div>

      {/* Team B */}
      <div className={cn(
        "flex items-center gap-2 p-3 border-t",
        teamBWon && isCompleted
          ? "bg-green-500/10 border-green-500/30"
          : "border-gray-700/50"
      )}>
        <Avatar
          name={match.teamB.name}
          src={match.teamB.logoUrl}
          size="sm"
          className={cn(
            "ring-2",
            teamBWon ? "ring-green-500/50" : "ring-gray-700"
          )}
        />
        
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">
            {match.teamB.tag || match.teamB.name}
          </div>
          {campaignB && (
            <div className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded border inline-block mt-0.5",
              getCampaignColor(campaignB.wins, campaignB.losses)
            )}>
              {campaignB.wins}-{campaignB.losses}
            </div>
          )}
        </div>

        {isCompleted && (
          <div className="flex items-center gap-1">
            {teamBWon ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className="font-bold text-lg">
              {match.scoreB}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

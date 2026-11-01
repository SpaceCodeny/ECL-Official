"use client";

import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useSwissStandings } from "@/hooks/use-swiss";
import type { SwissCampaign } from "@/types/preset";

interface SwissStandingsViewProps {
  tournamentId: string;
}

export function SwissStandingsView({ tournamentId }: SwissStandingsViewProps) {
  const { standings, loading, error } = useSwissStandings(tournamentId);

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8">
        <div className="flex items-center justify-center">
          <div className="text-gray-400">Carregando classificação...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
        Erro ao carregar classificação: {error}
      </div>
    );
  }

  if (!standings || !standings.campaigns || standings.campaigns.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
        <p className="text-gray-400">Fase suíça ainda não foi iniciada</p>
      </div>
    );
  }

  const getCampaignBadge = (campaign: SwissCampaign) => {
    const record = `${campaign.wins}-${campaign.losses}`;
    
    if (campaign.wins === 3 && campaign.losses === 0) {
      return <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded font-semibold">3-0</span>;
    }
    
    return <span className="text-xs bg-gray-700 px-2 py-1 rounded">{record}</span>;
  };

  const getQualificationStatus = (index: number, total: number, campaign: SwissCampaign) => {
    const isSwissComplete = standings.currentRound >= standings.totalRounds;
    
    // Regra principal: 3 vitórias = classificado, 3 derrotas = eliminado
    if (campaign.wins >= 3) {
      return (
        <div className="flex items-center gap-1 text-green-400 text-xs font-semibold">
          <TrendingUp className="w-4 h-4" />
          {isSwissComplete ? "Classificado" : "Classificando"}
        </div>
      );
    }
    
    if (campaign.losses >= 3 || campaign.isEliminated) {
      return (
        <div className="flex items-center gap-1 text-red-400 text-xs font-semibold">
          <TrendingDown className="w-4 h-4" />
          {isSwissComplete ? "Eliminado" : "Sendo Eliminado"}
        </div>
      );
    }
    
    // Em andamento
    return (
      <div className="flex items-center gap-1 text-gray-400 text-xs">
        <Minus className="w-4 h-4" />
        Em Andamento
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-[#FF6B00]" />
          Classificação Swiss System
        </h3>
        <div className="text-sm text-gray-400">
          Rodada {standings.currentRound} de {standings.totalRounds}
        </div>
      </div>

      {/* Legenda removida conforme solicitado */}

      {/* Tabela */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr className="text-left text-sm text-gray-400">
                <th className="px-6 py-3 font-semibold">#</th>
                <th className="px-6 py-3 font-semibold">Equipe</th>
                <th className="px-6 py-3 font-semibold text-center">Campanha</th>
                <th className="px-6 py-3 font-semibold text-center">Vitórias</th>
                <th className="px-6 py-3 font-semibold text-center">Derrotas</th>
                <th className="px-6 py-3 font-semibold text-center">Saldo</th>
                <th className="px-6 py-3 font-semibold text-center">Rodadas</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {standings.campaigns.map((campaign, index) => (
                <tr
                  key={campaign.id}
                  className={`hover:bg-gray-700/30 transition-colors ${
                    campaign.wins >= 3
                      ? "bg-green-500/5 border-l-4 border-l-green-500"
                      : campaign.losses >= 3 || campaign.isEliminated
                      ? "bg-red-500/5 border-l-4 border-l-red-500"
                      : ""
                  }`}
                >
                  <td className="px-6 py-4">
                    <span className="font-bold text-lg">{index + 1}º</span>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {campaign.team.logoUrl ? (
                        <img
                          src={campaign.team.logoUrl}
                          alt={campaign.team.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center">
                          <span className="text-xl font-bold">
                            {campaign.team.tag || campaign.team.name[0]}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="font-semibold">{campaign.team.name}</div>
                        {campaign.team.tag && (
                          <div className="text-xs text-gray-400">{campaign.team.tag}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 text-center">
                    {getCampaignBadge(campaign)}
                  </td>
                  
                  <td className="px-6 py-4 text-center font-semibold text-green-400">
                    {campaign.wins}
                  </td>
                  
                  <td className="px-6 py-4 text-center font-semibold text-red-400">
                    {campaign.losses}
                  </td>
                  
                  <td className="px-6 py-4 text-center font-semibold">
                    <span className={campaign.roundDiff >= 0 ? "text-green-400" : "text-red-400"}>
                      {campaign.roundDiff >= 0 ? "+" : ""}{campaign.roundDiff}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 text-center text-gray-400">
                    {campaign.roundsPlayed}
                  </td>
                  
                  <td className="px-6 py-4">
                    {getQualificationStatus(index, standings.campaigns.length, campaign)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rodapé com informações */}
      <div className="text-sm text-gray-400 text-center">
        {standings.currentRound < standings.totalRounds
          ? `Faltam ${standings.totalRounds - standings.currentRound} rodadas para conclusão da fase suíça`
          : "Fase suíça concluída"}
      </div>
    </div>
  );
}

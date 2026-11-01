"use client";

import { cn } from "@/lib/utils";

interface SwissRound {
  id: string;
  roundNumber: number;
  isComplete: boolean;
  matches: Array<{
    id: string;
    teamA: { id: string; name: string; slug: string; logoUrl: string | null; tag: string | null };
    teamB: { id: string; name: string; slug: string; logoUrl: string | null; tag: string | null };
    winner: { id: string; name: string; slug: string } | null;
    status: string;
    scoreA: number | null;
    scoreB: number | null;
  }>;
}

interface SwissRoundsBracketProps {
  rounds: SwissRound[];
  totalRounds?: number;
}

/**
 * Agrupa partidas por campanha (ex: "1-0", "0-1", "2-0", etc)
 */
function groupMatchesByCampaign(matches: SwissRound["matches"]) {
  // Para simplicidade, retorna os matches sem agrupamento complexo
  // A lógica de agrupamento pode ser implementada baseada no histórico dos times
  return matches;
}

export function SwissRoundsBracket({ rounds, totalRounds = 5 }: SwissRoundsBracketProps) {
  // Cria array com 5 rodadas (preenche vazias se necessário)
  const allRounds = Array.from({ length: totalRounds }, (_, i) => {
    const round = rounds.find((r) => r.roundNumber === i + 1);
    return round || {
      id: `empty-${i + 1}`,
      roundNumber: i + 1,
      isComplete: false,
      matches: [],
    };
  });

  return (
    <div className="bg-gradient-to-br from-[#FF6B00]/5 to-purple-600/5 border border-[#FF6B00]/30 rounded-lg p-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight mb-2">
          FASE SUÍÇA MD1 | 20 EQUIPES
        </h2>
        <p className="text-sm text-gray-400">
          {totalRounds} RODADAS • 12 CLASSIFICADOS
        </p>
      </div>

      {/* Grid de rodadas */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {allRounds.map((round, index) => (
          <div key={round.id} className="space-y-3">
            {/* Header da rodada */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-center">
              <h3 className="font-bold text-sm uppercase tracking-wider">
                RODADA {round.roundNumber}
              </h3>
              {round.matches.length > 0 && (
                <div className="mt-2 space-y-1">
                  {/* Agrupamentos por campanha */}
                  {getUniqueCampaigns(round.matches).map((campaign) => (
                    <div
                      key={campaign}
                      className={cn(
                        "text-xs px-2 py-1 rounded",
                        getCampaignColor(campaign)
                      )}
                    >
                      <span className="font-bold">{campaign}</span>
                      <span className="ml-1 text-gray-400">
                        ({getMatchesCountByCampaign(round.matches, campaign)} jogos)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Partidas da rodada */}
            <div className="space-y-2">
              {round.matches.length > 0 ? (
                round.matches.map((match) => (
                  <div
                    key={match.id}
                    className={cn(
                      "bg-gray-900/50 border rounded-lg p-2 text-xs",
                      match.status === "COMPLETED"
                        ? match.winner?.id === match.teamA.id
                          ? "border-green-500/50"
                          : match.winner?.id === match.teamB.id
                          ? "border-red-500/50"
                          : "border-gray-700"
                        : "border-gray-700"
                    )}
                  >
                    {/* Team A */}
                    <div
                      className={cn(
                        "flex items-center justify-between py-1 px-2 rounded",
                        match.winner?.id === match.teamA.id && "bg-green-500/10"
                      )}
                    >
                      <span className="truncate font-medium">
                        {match.teamA.tag || match.teamA.name}
                      </span>
                      {match.status === "COMPLETED" && (
                        <span className="font-bold ml-2">{match.scoreA}</span>
                      )}
                    </div>

                    <div className="text-center text-gray-500 text-[10px] py-0.5">VS</div>

                    {/* Team B */}
                    <div
                      className={cn(
                        "flex items-center justify-between py-1 px-2 rounded",
                        match.winner?.id === match.teamB.id && "bg-green-500/10"
                      )}
                    >
                      <span className="truncate font-medium">
                        {match.teamB.tag || match.teamB.name}
                      </span>
                      {match.status === "COMPLETED" && (
                        <span className="font-bold ml-2">{match.scoreB}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-gray-900/30 border border-dashed border-gray-700 rounded-lg p-4 text-center text-gray-500 text-xs">
                  Aguardando geração
                </div>
              )}
            </div>

            {/* Setas de conexão */}
            {index < totalRounds - 1 && round.matches.length > 0 && (
              <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info inferior */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Distribuição */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <h4 className="font-bold text-sm uppercase mb-3 text-[#FF6B00]">
            Distribuição das Equipes
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">5 RODADAS</span>
              <span className="font-semibold">PAREAMENTO POR CAMPANHA</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">20 NA FASE SUÍÇA</span>
              <span className="font-semibold">UM MAPA POR PARTIDA</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">12 CLASSIFICADOS</span>
              <span className="font-semibold">MELHORES CAMPANHAS</span>
            </div>
          </div>
        </div>

        {/* Critérios */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <h4 className="font-bold text-sm uppercase mb-3 text-[#FF6B00]">
            Critérios de Classificação
          </h4>
          <ol className="space-y-1 text-xs list-decimal list-inside">
            <li>Nº DE VITÓRIAS</li>
            <li>SALDO DE ROUNDS</li>
            <li>CONFRONTO DIRETO (QUANDO APLICÁVEL)</li>
            <li>FORÇA DOS ADVERSÁRIOS</li>
          </ol>
        </div>

        {/* Playoffs */}
        <div className="bg-gradient-to-br from-gold/10 to-purple-600/10 border border-gold/30 rounded-lg p-4">
          <h4 className="font-bold text-sm uppercase mb-3 text-gold">
            Playoffs — Oitavas de Final
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-gold">12</div>
              <div>
                <div className="font-semibold">CLASSIFICADOS</div>
                <div className="text-gray-400">DA FASE SUÍÇA</div>
              </div>
            </div>
            <div className="text-gray-400">+</div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-[#FF6B00]">4</div>
              <div>
                <div className="font-semibold">VAGAS DIRETAS</div>
                <div className="text-gray-400">JÁ CLASSIFICADAS</div>
              </div>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent my-2" />
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-paper">16</div>
              <div>
                <div className="font-semibold">EQUIPES</div>
                <div className="text-gray-400">NAS OITAVAS DE FINAL</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Retorna campanhas únicas presentes nesta rodada
 * Ex: ["3-0", "2-1", "1-2", "0-3"]
 */
function getUniqueCampaigns(matches: SwissRound["matches"]): string[] {
  // Simplificado: retorna apenas indicadores de vitórias
  const campaigns = new Set<string>();
  
  matches.forEach((match) => {
    // Aqui você poderia calcular a campanha real dos times
    // Por enquanto, retorna placeholder
    campaigns.add("CONFRONTO");
  });

  return Array.from(campaigns);
}

/**
 * Retorna cor baseada na campanha
 */
function getCampaignColor(campaign: string): string {
  if (campaign.startsWith("3-")) return "bg-green-500/20 text-green-400 border border-green-500/30";
  if (campaign.startsWith("2-")) return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
  if (campaign.startsWith("1-")) return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
  if (campaign.startsWith("0-")) return "bg-red-500/20 text-red-400 border border-red-500/30";
  return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
}

/**
 * Conta quantas partidas existem para determinada campanha
 */
function getMatchesCountByCampaign(matches: SwissRound["matches"], campaign: string): number {
  return matches.length;
}

"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trophy, Users, Target, CheckCircle } from "lucide-react";
import { usePreset } from "@/hooks/use-presets";

export default function PresetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { preset, loading, error } = usePreset(resolvedParams.id);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="text-gray-400">Carregando preset...</div>
        </div>
      </div>
    );
  }

  if (error || !preset) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
          Preset não encontrado
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors mt-1"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{preset.name}</h1>
              <span className="text-sm bg-gray-700 px-3 py-1 rounded">
                v{preset.version}
              </span>
              {preset.isActive && (
                <span className="text-sm bg-green-500/20 text-green-400 px-3 py-1 rounded">
                  ATIVO
                </span>
              )}
            </div>
            {preset.description && (
              <p className="text-gray-400">{preset.description}</p>
            )}
          </div>
        </div>

        <button
          onClick={() => router.push(`/admin/presets/${preset.id}/edit`)}
          className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Edit className="w-5 h-5" />
          Editar
        </button>
      </div>

      {/* Visão Geral */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-[#FF6B00]/10 to-purple-600/10 border border-[#FF6B00]/30 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6 text-[#FF6B00]" />
            <h3 className="font-semibold text-gray-400">Total de Equipes</h3>
          </div>
          <p className="text-3xl font-bold">{preset.config.totalTeams}</p>
        </div>

        {preset.config.swiss && (
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-600/10 border border-blue-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-6 h-6 text-blue-400" />
              <h3 className="font-semibold text-gray-400">Fase Suíça</h3>
            </div>
            <p className="text-3xl font-bold">
              {preset.config.swiss.roundsCount} rodadas
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {preset.config.swiss.teamsCount} equipes
            </p>
          </div>
        )}

        {preset.config.bracket && (
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border border-purple-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-purple-400" />
              <h3 className="font-semibold text-gray-400">Playoffs</h3>
            </div>
            <p className="text-3xl font-bold">
              {preset.config.bracket.teamsCount} times
            </p>
            {preset.config.bracket.invitedTeams && preset.config.bracket.invitedTeams > 0 && (
              <p className="text-sm text-gray-400 mt-1">
                {preset.config.bracket.invitedTeams} convidadas
              </p>
            )}
          </div>
        )}
      </div>

      {/* Fase Suíça Detalhada */}
      {preset.config.swiss && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#FF6B00]" />
            Fase Suíça
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-400 mb-3">Configurações</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Equipes participantes:</span>
                  <span className="font-semibold">{preset.config.swiss.teamsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rodadas:</span>
                  <span className="font-semibold">{preset.config.swiss.roundsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Classificados para playoffs:</span>
                  <span className="font-semibold">{preset.config.swiss.classifiedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Desempate:</span>
                  <span className="font-semibold">
                    {preset.config.swiss.allowTiebreakers ? "Habilitado" : "Desabilitado"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-400 mb-3">Critérios de Desempate</h3>
              <div className="space-y-2">
                {preset.config.swiss.tiebreakCriteria.map((criterion, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>
                      {criterion === "wins" && "Vitórias"}
                      {criterion === "roundDiff" && "Saldo de rounds"}
                      {criterion === "headToHead" && "Confronto direto"}
                      {criterion === "opponentsStrength" && "Força dos oponentes"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Playoffs Detalhados */}
      {preset.config.bracket && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Target className="w-6 h-6 text-[#FF6B00]" />
            Playoffs (Bracket)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-400 mb-3">Configurações</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total de equipes:</span>
                  <span className="font-semibold">{preset.config.bracket.teamsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Equipes convidadas:</span>
                  <span className="font-semibold">{preset.config.bracket.invitedTeams || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Formato:</span>
                  <span className="font-semibold">
                    {preset.config.bracket.format === "SINGLE_ELIMINATION"
                      ? "Eliminação Simples"
                      : "Eliminação Dupla"}
                  </span>
                </div>
              </div>
            </div>

            {preset.config.bracket.specialRules && (
              <div>
                <h3 className="font-semibold text-gray-400 mb-3">Regras Especiais</h3>
                <div className="space-y-2">
                  {preset.config.bracket.specialRules.perfect3_0_vs_invited?.enabled && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-yellow-400 mb-1">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-semibold">Regra 3-0</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        O time que terminar 3-0 na fase suíça enfrentará o convidado #{preset.config.bracket.specialRules.perfect3_0_vs_invited.invitedSlot} nas oitavas de final
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fases do Torneio */}
      {preset.config.phases && preset.config.phases.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Fases do Torneio</h2>
          
          <div className="space-y-3">
            {preset.config.phases.map((phase, index) => (
              <div
                key={index}
                className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-semibold text-gray-400">
                        Fase {phase.order}
                      </span>
                      <h3 className="font-bold text-lg">{phase.name}</h3>
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                        {phase.type === "SWISS" ? "Fase Suíça" : "Bracket"}
                      </span>
                    </div>
                    
                    <div className="flex gap-4 text-sm text-gray-400">
                      <span>{phase.teamsCount} equipes</span>
                      <span>•</span>
                      <span>{phase.defaultSeriesFormat}</span>
                      {phase.roundsCount && (
                        <>
                          <span>•</span>
                          <span>{phase.roundsCount} rodadas</span>
                        </>
                      )}
                      {phase.advancingTeams && (
                        <>
                          <span>•</span>
                          <span>{phase.advancingTeams} classificados</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

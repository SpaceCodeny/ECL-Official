"use client";

import { useState } from "react";
import { Play, Check, RefreshCw, AlertCircle } from "lucide-react";
import { useSwissStandings, useSwissActions } from "@/hooks/use-swiss";
import { useAuthStore } from "@/stores/auth.store";

interface SwissAdminPanelProps {
  tournamentId: string;
  onUpdate?: () => void;
}

export function SwissAdminPanel({ tournamentId, onUpdate }: SwissAdminPanelProps) {
  const { token } = useAuthStore();
  const { standings, refetch } = useSwissStandings(tournamentId);
  const { initializeSwiss, generateRound, finalizeSwiss, loading, error } = useSwissActions(token);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleInitialize = async () => {
    if (!confirm("Deseja inicializar a fase suíça? Isso criará as campanhas para todas as equipes inscritas.")) {
      return;
    }

    try {
      setActionLoading("init");
      await initializeSwiss(tournamentId);
      await refetch();
      onUpdate?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao inicializar fase suíça");
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateRound = async () => {
    if (!confirm(`Deseja gerar a rodada ${(standings?.currentRound || 0) + 1}?`)) {
      return;
    }

    try {
      setActionLoading("generate");
      await generateRound(tournamentId);
      await refetch();
      onUpdate?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao gerar rodada");
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinalize = async () => {
    if (!confirm("Deseja finalizar a fase suíça? Isso calculará as posições finais e permitirá gerar o bracket de playoffs.")) {
      return;
    }

    try {
      setActionLoading("finalize");
      await finalizeSwiss(tournamentId);
      await refetch();
      onUpdate?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao finalizar fase suíça");
    } finally {
      setActionLoading(null);
    }
  };

  if (!standings) {
    return (
      <div className="bg-gradient-to-br from-[#FF6B00]/10 to-purple-600/10 border border-[#FF6B00]/30 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-[#FF6B00] flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2">Fase Suíça não iniciada</h3>
            <p className="text-gray-400 text-sm mb-4">
              Clique no botão abaixo para inicializar a fase suíça. Isso criará campanhas para todas as equipes aprovadas no torneio.
            </p>
            <button
              onClick={handleInitialize}
              disabled={actionLoading === "init"}
              className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <Play className="w-5 h-5" />
              {actionLoading === "init" ? "Inicializando..." : "Inicializar Fase Suíça"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const campaignsCount = standings.campaigns?.length || 0;
  const isComplete = standings.currentRound >= standings.totalRounds;

  return (
    <div className="bg-gradient-to-br from-[#FF6B00]/10 to-purple-600/10 border border-[#FF6B00]/30 rounded-lg p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-2">Controle da Fase Suíça</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Rodada atual:</span>
              <span className="font-semibold">{standings.currentRound} de {standings.totalRounds}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Equipes participantes:</span>
              <span className="font-semibold">{campaignsCount}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Classificados para playoffs:</span>
              <span className="font-semibold">{standings.classifiedCount}</span>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {!isComplete ? (
            <button
              onClick={handleGenerateRound}
              disabled={loading || actionLoading === "generate"}
              className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className={`w-5 h-5 ${actionLoading === "generate" ? "animate-spin" : ""}`} />
              {actionLoading === "generate" ? "Gerando..." : `Gerar Rodada ${standings.currentRound + 1}`}
            </button>
          ) : (
            <button
              onClick={handleFinalize}
              disabled={loading || actionLoading === "finalize"}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <Check className="w-5 h-5" />
              {actionLoading === "finalize" ? "Finalizando..." : "Finalizar Fase Suíça"}
            </button>
          )}
        </div>
      </div>

      {isComplete && (
        <div className="mt-4 bg-green-500/10 border border-green-500 text-green-400 px-4 py-2 rounded text-sm">
          ✓ Todas as rodadas foram concluídas. Finalize a fase suíça para gerar o bracket de playoffs.
        </div>
      )}
    </div>
  );
}

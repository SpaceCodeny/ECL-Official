import { useState, useEffect } from "react";
import type { SwissCampaign, SwissStandings } from "@/types/preset";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

/**
 * Hook para gerenciar fase suíça de um torneio
 */
export function useSwissStandings(tournamentId: string | null) {
  const [standings, setStandings] = useState<SwissStandings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStandings = async () => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/tournaments/${tournamentId}/swiss/standings`);
      if (!response.ok) throw new Error("Falha ao buscar classificação");
      
      const data = await response.json();
      setStandings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStandings();
  }, [tournamentId]);

  return { standings, loading, error, refetch: fetchStandings };
}

/**
 * Hook com ações de gerenciamento da fase suíça (admin)
 */
export function useSwissActions(token: string | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeSwiss = async (tournamentId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/tournaments/${tournamentId}/swiss/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) throw new Error("Falha ao inicializar fase suíça");
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generateRound = async (tournamentId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/tournaments/${tournamentId}/swiss/rounds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) throw new Error("Falha ao gerar rodada");
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const finalizeSwiss = async (tournamentId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/tournaments/${tournamentId}/swiss/finalize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) throw new Error("Falha ao finalizar fase suíça");
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    initializeSwiss,
    generateRound,
    finalizeSwiss,
    loading,
    error,
  };
}

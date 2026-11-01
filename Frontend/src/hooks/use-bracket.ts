import { useState, useEffect } from "react";
import type { BracketMatch } from "@/types/preset";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface BracketData {
  RO16: BracketMatch[];
  QF: BracketMatch[];
  SF: BracketMatch[];
  FINAL: BracketMatch[];
}

/**
 * Hook para buscar bracket de playoffs
 */
export function useBracket(tournamentId: string | null) {
  const [bracket, setBracket] = useState<BracketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBracket = async () => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/tournaments/${tournamentId}/bracket`);
      
      if (response.status === 404) {
        // Bracket ainda não foi gerado
        setBracket(null);
        setError(null);
      } else if (!response.ok) {
        throw new Error("Falha ao buscar bracket");
      } else {
        const data = await response.json();
        setBracket(data);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBracket();
  }, [tournamentId]);

  return { bracket, loading, error, refetch: fetchBracket };
}

/**
 * Hook com ações de gerenciamento de bracket (admin)
 */
export function useBracketActions(token: string | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateBracket = async (tournamentId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/tournaments/${tournamentId}/bracket/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao gerar bracket");
      }
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const submitMatchResult = async (
    tournamentId: string,
    matchId: string,
    winnerId: string,
    team1Score: number,
    team2Score: number
  ) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/tournaments/${tournamentId}/bracket/${matchId}/result`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            winnerId,
            team1Score,
            team2Score,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao registrar resultado");
      }
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    generateBracket,
    submitMatchResult,
    loading,
    error,
  };
}

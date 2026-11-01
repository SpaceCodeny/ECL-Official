import { useState, useEffect } from "react";
import type { InvitedTeam } from "@/types/preset";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

/**
 * Hook para buscar equipes convidadas de um torneio
 */
export function useInvitedTeams(tournamentId: string | null) {
  const [invitedTeams, setInvitedTeams] = useState<InvitedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitedTeams = async () => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/tournaments/${tournamentId}/invited`);
      if (!response.ok) throw new Error("Falha ao buscar equipes convidadas");
      
      const data = await response.json();
      setInvitedTeams(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitedTeams();
  }, [tournamentId]);

  return { invitedTeams, loading, error, refetch: fetchInvitedTeams };
}

/**
 * Hook com ações de gerenciamento de equipes convidadas (admin)
 */
export function useInvitedTeamActions(token: string | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addInvitedTeam = async (
    tournamentId: string,
    teamSlug: string,
    bracketSlot: number,
    reservedOpponent?: string
  ) => {
    try {
      setLoading(true);
      
      // Primeiro, buscar o ID da equipe pelo slug
      const teamResponse = await fetch(`${API_URL}/teams/${teamSlug}`);
      if (!teamResponse.ok) {
        throw new Error("Equipe não encontrada");
      }
      const team = await teamResponse.json();
      
      // Agora adicionar o convidado com o teamId
      const response = await fetch(`${API_URL}/tournaments/${tournamentId}/invited`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          teamId: team.id,
          bracketSlot,
          reservedOpponent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao adicionar equipe convidada");
      }
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeInvitedTeam = async (tournamentId: string, invitedId: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/tournaments/${tournamentId}/invited/${invitedId}`,
        {
          method: "DELETE",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao remover equipe convidada");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    addInvitedTeam,
    removeInvitedTeam,
    loading,
    error,
  };
}

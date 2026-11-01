import { useState, useEffect } from "react";
import type { TournamentPreset } from "@/types/preset";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

/**
 * Hook para gerenciar presets de torneios
 */
export function usePresets() {
  const [presets, setPresets] = useState<TournamentPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPresets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/presets`);
      if (!response.ok) throw new Error("Falha ao buscar presets");
      
      const data = await response.json();
      setPresets(data.value || data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  return { presets, loading, error, refetch: fetchPresets };
}

/**
 * Hook para buscar um preset específico
 */
export function usePreset(id: string | null) {
  const [preset, setPreset] = useState<TournamentPreset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchPreset = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/presets/${id}`);
        if (!response.ok) throw new Error("Preset não encontrado");
        
        const data = await response.json();
        setPreset(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    };

    fetchPreset();
  }, [id]);

  return { preset, loading, error };
}

/**
 * Hook com ações de CRUD para presets (admin)
 */
export function usePresetActions(token: string | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPreset = async (data: Partial<TournamentPreset>) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/presets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Falha ao criar preset");
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePreset = async (id: string, data: Partial<TournamentPreset>) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/presets/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Falha ao atualizar preset");
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deletePreset = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/presets/${id}`, {
        method: "DELETE",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) throw new Error("Falha ao deletar preset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const duplicatePreset = async (id: string, slug: string, version: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/presets/${id}/duplicate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ slug, version }),
      });

      if (!response.ok) throw new Error("Falha ao duplicar preset");
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createPreset,
    updatePreset,
    deletePreset,
    duplicatePreset,
    loading,
    error,
  };
}

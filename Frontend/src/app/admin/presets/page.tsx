"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Copy, Eye } from "lucide-react";
import { usePresets, usePresetActions } from "@/hooks/use-presets";
import { useAuthStore } from "@/stores/auth.store";

export default function PresetsAdminPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { presets, loading, error, refetch } = usePresets();
  const { deletePreset, duplicatePreset } = usePresetActions(token);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja deletar o preset "${name}"?`)) return;

    try {
      setDeletingId(id);
      await deletePreset(id);
      await refetch();
    } catch (err) {
      alert("Erro ao deletar preset");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (id: string, name: string) => {
    const newSlug = prompt(`Digite o slug para a cópia de "${name}":`);
    if (!newSlug) return;

    const newVersion = prompt("Digite a versão (ex: 2.0):", "2.0");
    if (!newVersion) return;

    try {
      setDuplicatingId(id);
      await duplicatePreset(id, newSlug, newVersion);
      await refetch();
    } catch (err) {
      alert("Erro ao duplicar preset");
    } finally {
      setDuplicatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="text-gray-400">Carregando presets...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
          Erro ao carregar presets: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Presets de Torneios</h1>
          <p className="text-gray-400 mt-1">
            Gerencie formatos reutilizáveis de competições
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/presets/create")}
          className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Preset
        </button>
      </div>

      {/* Lista de Presets */}
      {presets.length === 0 ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-12 text-center">
          <p className="text-gray-400 mb-4">Nenhum preset criado ainda</p>
          <button
            onClick={() => router.push("/admin/presets/create")}
            className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Criar Primeiro Preset
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">{preset.name}</h3>
                    <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                      v{preset.version}
                    </span>
                    {preset.isActive && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                        ATIVO
                      </span>
                    )}
                  </div>
                  
                  {preset.description && (
                    <p className="text-gray-400 text-sm mb-4">
                      {preset.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Total de equipes:</span>
                      <span className="font-semibold">{preset.config.totalTeams}</span>
                    </div>
                    
                    {preset.config.swiss && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Fase Suíça:</span>
                        <span className="font-semibold">
                          {preset.config.swiss.teamsCount} times × {preset.config.swiss.roundsCount} rodadas
                        </span>
                      </div>
                    )}
                    
                    {preset.config.bracket && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Playoffs:</span>
                        <span className="font-semibold">
                          {preset.config.bracket.teamsCount} times
                          {preset.config.bracket.invitedTeams && 
                            ` (${preset.config.bracket.invitedTeams} convidadas)`
                          }
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/admin/presets/${preset.id}`)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Visualizar"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={() => router.push(`/admin/presets/${preset.id}/edit`)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={() => handleDuplicate(preset.id, preset.name)}
                    disabled={duplicatingId === preset.id}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                    title="Duplicar"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(preset.id, preset.name)}
                    disabled={deletingId === preset.id}
                    className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                    title="Deletar"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { usePreset, usePresetActions } from "@/hooks/use-presets";
import { useAuthStore } from "@/stores/auth.store";

export default function EditPresetPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { token } = useAuthStore();
  const { preset, loading: loadingPreset } = usePreset(resolvedParams.id);
  const { updatePreset, loading } = usePresetActions(token);

  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    if (preset) {
      setFormData({
        name: preset.name,
        slug: preset.slug,
        description: preset.description || "",
        version: preset.version,
        isActive: preset.isActive,
        config: preset.config,
      });
    }
  }, [preset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData) return;

    try {
      await updatePreset(resolvedParams.id, formData);
      router.push(`/admin/presets/${resolvedParams.id}`);
    } catch (err) {
      alert("Erro ao atualizar preset");
    }
  };

  if (loadingPreset || !formData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="text-gray-400">Carregando preset...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Editar Preset</h1>
          <p className="text-gray-400 mt-1">{formData.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Informações Básicas */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Informações Básicas</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nome do Preset *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-[#FF6B00]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Versão
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-[#FF6B00] h-24 resize-none"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-700 text-[#FF6B00] focus:ring-[#FF6B00] focus:ring-offset-gray-900"
                />
                <span className="text-sm font-medium">Preset Ativo</span>
              </label>
            </div>
          </div>
        </div>

        {/* Configuração Geral */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Configuração Geral</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Total de Equipes
              </label>
              <input
                type="number"
                value={formData.config.totalTeams}
                onChange={(e) => setFormData({
                  ...formData,
                  config: { ...formData.config, totalTeams: parseInt(e.target.value) },
                })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-[#FF6B00]"
                min="4"
              />
            </div>
          </div>
        </div>

        {/* Fase Suíça */}
        {formData.config.swiss && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Fase Suíça</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Equipes na Fase Suíça
                  </label>
                  <input
                    type="number"
                    value={formData.config.swiss.teamsCount}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        swiss: { ...formData.config.swiss, teamsCount: parseInt(e.target.value) },
                      },
                    })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-[#FF6B00]"
                    min="4"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Número de Rodadas
                  </label>
                  <input
                    type="number"
                    value={formData.config.swiss.roundsCount}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        swiss: { ...formData.config.swiss, roundsCount: parseInt(e.target.value) },
                      },
                    })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-[#FF6B00]"
                    min="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Classificados para Playoffs
                  </label>
                  <input
                    type="number"
                    value={formData.config.swiss.classifiedCount}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        swiss: { ...formData.config.swiss, classifiedCount: parseInt(e.target.value) },
                      },
                    })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-[#FF6B00]"
                    min="2"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Playoffs / Bracket */}
        {formData.config.bracket && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Playoffs (Bracket)</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Equipes nos Playoffs
                  </label>
                  <input
                    type="number"
                    value={formData.config.bracket.teamsCount}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        bracket: { ...formData.config.bracket, teamsCount: parseInt(e.target.value) },
                      },
                    })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-[#FF6B00]"
                    min="4"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Equipes Convidadas
                  </label>
                  <input
                    type="number"
                    value={formData.config.bracket.invitedTeams}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        bracket: { ...formData.config.bracket, invitedTeams: parseInt(e.target.value) },
                      },
                    })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-[#FF6B00]"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Formato
                  </label>
                  <select
                    value={formData.config.bracket.format}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        bracket: { ...formData.config.bracket, format: e.target.value },
                      },
                    })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-[#FF6B00]"
                  >
                    <option value="SINGLE_ELIMINATION">Eliminação Simples</option>
                    <option value="DOUBLE_ELIMINATION">Eliminação Dupla</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-700 hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {loading ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}

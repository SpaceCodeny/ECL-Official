"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { usePresetActions } from "@/hooks/use-presets";
import { useAuthStore } from "@/stores/auth.store";

export default function CreatePresetPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { createPreset, loading } = usePresetActions(token);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    version: "1.0",
    isActive: true,
    config: {
      version: "1.0",
      totalTeams: 24,
      swiss: {
        teamsCount: 20,
        roundsCount: 5,
        classifiedCount: 12,
        allowTiebreakers: true,
        tiebreakCriteria: ["wins", "roundDiff", "headToHead", "opponentsStrength"],
      },
      bracket: {
        teamsCount: 16,
        format: "SINGLE_ELIMINATION",
        invitedTeams: 4,
        specialRules: {
          perfect3_0_vs_invited: {
            enabled: true,
            invitedSlot: 1,
          },
        },
      },
      phases: [
        {
          name: "Fase Suíça",
          type: "SWISS",
          order: 1,
          defaultSeriesFormat: "BO1",
          teamsCount: 20,
          roundsCount: 5,
          advancingTeams: 12,
        },
        {
          name: "Oitavas de Final",
          type: "BRACKET",
          order: 2,
          defaultSeriesFormat: "BO3",
          teamsCount: 16,
        },
        {
          name: "Quartas de Final",
          type: "BRACKET",
          order: 3,
          defaultSeriesFormat: "BO3",
          teamsCount: 8,
        },
        {
          name: "Semifinais",
          type: "BRACKET",
          order: 4,
          defaultSeriesFormat: "BO3",
          teamsCount: 4,
        },
        {
          name: "Grande Final",
          type: "BRACKET",
          order: 5,
          defaultSeriesFormat: "BO5",
          teamsCount: 2,
        },
      ],
      classification: {
        type: "ROUNDS_THEN_RANKING",
        criteria: ["wins", "roundDiff", "headToHead", "opponentsStrength"],
      },
    },
  });

  const [phases, setPhases] = useState(formData.config.phases);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.slug) {
      alert("Nome e slug são obrigatórios");
      return;
    }

    try {
      const data = {
        ...formData,
        config: {
          ...formData.config,
          phases,
        },
      };

      await createPreset(data);
      router.push("/admin/presets");
    } catch (err) {
      alert("Erro ao criar preset");
    }
  };

  const addPhase = () => {
    setPhases([
      ...phases,
      {
        name: `Fase ${phases.length + 1}`,
        type: "BRACKET",
        order: phases.length + 1,
        defaultSeriesFormat: "BO1",
        teamsCount: 8,
      },
    ]);
  };

  const removePhase = (index: number) => {
    setPhases(phases.filter((_, i) => i !== index));
  };

  const updatePhase = (index: number, field: string, value: any) => {
    const updated = [...phases];
    updated[index] = { ...updated[index], [field]: value };
    setPhases(updated);
  };

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
          <h1 className="text-3xl font-bold">Criar Novo Preset</h1>
          <p className="text-gray-400 mt-1">
            Configure um formato reutilizável de torneio
          </p>
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
                  placeholder="Ex: ECL MASTER EDITION"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Slug *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-[#FF6B00]"
                  placeholder="ecl-master-edition"
                  pattern="[a-z0-9-]+"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Apenas letras minúsculas, números e hífens
                </p>
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
                placeholder="Descreva o formato do torneio..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Versão
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-[#FF6B00]"
                  placeholder="1.0"
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

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.config.swiss.allowTiebreakers}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: {
                      ...formData.config,
                      swiss: { ...formData.config.swiss, allowTiebreakers: e.target.checked },
                    },
                  })}
                  className="w-5 h-5 rounded border-gray-700 text-[#FF6B00] focus:ring-[#FF6B00] focus:ring-offset-gray-900"
                />
                <span className="text-sm font-medium">Permitir critérios de desempate</span>
              </label>
            </div>
          </div>
        </div>

        {/* Playoffs / Bracket */}
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

            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Regra Especial: 3-0 vs Convidado</h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.config.bracket.specialRules.perfect3_0_vs_invited.enabled}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        bracket: {
                          ...formData.config.bracket,
                          specialRules: {
                            ...formData.config.bracket.specialRules,
                            perfect3_0_vs_invited: {
                              ...formData.config.bracket.specialRules.perfect3_0_vs_invited,
                              enabled: e.target.checked,
                            },
                          },
                        },
                      },
                    })}
                    className="w-5 h-5 rounded border-gray-700 text-[#FF6B00] focus:ring-[#FF6B00] focus:ring-offset-gray-900"
                  />
                  <span className="text-sm font-medium">Time 3-0 enfrenta convidado específico</span>
                </label>

                {formData.config.bracket.specialRules.perfect3_0_vs_invited.enabled && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-400">Slot do convidado:</label>
                    <input
                      type="number"
                      value={formData.config.bracket.specialRules.perfect3_0_vs_invited.invitedSlot}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          bracket: {
                            ...formData.config.bracket,
                            specialRules: {
                              ...formData.config.bracket.specialRules,
                              perfect3_0_vs_invited: {
                                ...formData.config.bracket.specialRules.perfect3_0_vs_invited,
                                invitedSlot: parseInt(e.target.value),
                              },
                            },
                          },
                        },
                      })}
                      className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                      min="1"
                      max={formData.config.bracket.invitedTeams}
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                O time que terminar 3-0 na fase suíça enfrentará o convidado especificado nas oitavas
              </p>
            </div>
          </div>
        </div>

        {/* Fases do Torneio */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Fases do Torneio</h2>
            <button
              type="button"
              onClick={addPhase}
              className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white px-3 py-1.5 rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar Fase
            </button>
          </div>

          <div className="space-y-4">
            {phases.map((phase, index) => (
              <div key={index} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold">Fase {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removePhase(index)}
                    className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={phase.name}
                      onChange={(e) => updatePhase(index, "name", e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#FF6B00]"
                      placeholder="Ex: Quartas de Final"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tipo
                    </label>
                    <select
                      value={phase.type}
                      onChange={(e) => updatePhase(index, "type", e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#FF6B00]"
                    >
                      <option value="SWISS">Fase Suíça</option>
                      <option value="BRACKET">Bracket</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Formato da Série
                    </label>
                    <select
                      value={phase.defaultSeriesFormat}
                      onChange={(e) => updatePhase(index, "defaultSeriesFormat", e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#FF6B00]"
                    >
                      <option value="BO1">Melhor de 1 (BO1)</option>
                      <option value="BO3">Melhor de 3 (BO3)</option>
                      <option value="BO5">Melhor de 5 (BO5)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Equipes
                    </label>
                    <input
                      type="number"
                      value={phase.teamsCount}
                      onChange={(e) => updatePhase(index, "teamsCount", parseInt(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#FF6B00]"
                      min="2"
                    />
                  </div>
                </div>

                {phase.type === "SWISS" && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Rodadas
                      </label>
                      <input
                        type="number"
                        value={phase.roundsCount || 3}
                        onChange={(e) => updatePhase(index, "roundsCount", parseInt(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#FF6B00]"
                        min="3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Classificados
                      </label>
                      <input
                        type="number"
                        value={phase.advancingTeams || 8}
                        onChange={(e) => updatePhase(index, "advancingTeams", parseInt(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#FF6B00]"
                        min="2"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

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
            {loading ? "Criando..." : "Criar Preset"}
          </button>
        </div>
      </form>
    </div>
  );
}

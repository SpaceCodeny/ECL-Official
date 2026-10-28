'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shuffle, Settings, CheckCircle2, Play } from 'lucide-react';

interface DrawConfig {
  tournamentId: string;
  method: 'RANDOM' | 'BALANCED' | 'POT_BASED' | 'SNAKE';
  groupsCount: number;
  teamsPerGroup: number;
  selectedTeams: string[];
}

export default function DrawsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<DrawConfig>({
    tournamentId: '1',
    method: 'POT_BASED',
    groupsCount: 4,
    teamsPerGroup: 2,
    selectedTeams: [],
  });

  // Mock data
  const tournaments = [
    { id: '1', name: 'ECL Season 1' },
    { id: '2', name: 'ECL Invitational' },
  ];

  const teams = [
    { id: '1', name: 'FURIA Esports', pot: 1 },
    { id: '2', name: 'LOUD', pot: 1 },
    { id: '3', name: 'Imperial Esports', pot: 2 },
    { id: '4', name: 'paiN Gaming', pot: 2 },
    { id: '5', name: 'MIBR', pot: 3 },
    { id: '6', name: 'Fluxo', pot: 3 },
    { id: '7', name: 'RED Canids', pot: 4 },
    { id: '8', name: 'Sharks Esports', pot: 4 },
  ];

  const methods = [
    {
      value: 'RANDOM',
      label: 'Aleatório',
      description: 'Distribuição completamente aleatória sem restrições',
      icon: '🎲',
    },
    {
      value: 'BALANCED',
      label: 'Balanceado',
      description: 'Distribui times de forma balanceada entre os grupos',
      icon: '⚖️',
    },
    {
      value: 'POT_BASED',
      label: 'Baseado em Potes',
      description: 'Um time de cada pote por grupo (recomendado)',
      icon: '🏆',
      recommended: true,
    },
    {
      value: 'SNAKE',
      label: 'Snake Draft',
      description: 'Distribuição alternada (1-2-3-4, 4-3-2-1)',
      icon: '🐍',
    },
  ] as const;

  const toggleTeam = (teamId: string) => {
    setConfig(prev => ({
      ...prev,
      selectedTeams: prev.selectedTeams.includes(teamId)
        ? prev.selectedTeams.filter(id => id !== teamId)
        : [...prev.selectedTeams, teamId],
    }));
  };

  const handleStart = async () => {
    try {
      // Chamar API para criar sessão de sorteio
      // const response = await fetch('/api/v1/draw/sessions', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(config),
      // });
      // const session = await response.json();
      // router.push(`/draw/${session.id}`);
      
      // Mock: redirecionar diretamente
      router.push(`/draw/${config.tournamentId}`);
    } catch (error) {
      console.error('Erro ao iniciar sorteio:', error);
    }
  };

  const isValid = config.selectedTeams.length === config.groupsCount * config.teamsPerGroup;

  return (
    <div className="container-ecl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-paper mb-2">Configurar Sorteio</h1>
        <p className="text-muted">Configure os parâmetros do sorteio e selecione os times participantes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tournament Selection */}
          <div className="card-ecl">
            <h2 className="text-2xl font-bold text-paper mb-4 flex items-center gap-2">
              <Settings className="w-6 h-6 text-gold" />
              Configurações Gerais
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Torneio</label>
                <select
                  value={config.tournamentId}
                  onChange={(e) => setConfig({ ...config, tournamentId: e.target.value })}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-paper focus:outline-none focus:border-gold transition-colors"
                >
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Número de Grupos</label>
                  <input
                    type="number"
                    min={2}
                    max={8}
                    value={config.groupsCount}
                    onChange={(e) => setConfig({ ...config, groupsCount: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-paper focus:outline-none focus:border-gold transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Times por Grupo</label>
                  <input
                    type="number"
                    min={2}
                    max={8}
                    value={config.teamsPerGroup}
                    onChange={(e) => setConfig({ ...config, teamsPerGroup: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-paper focus:outline-none focus:border-gold transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Method Selection */}
          <div className="card-ecl">
            <h2 className="text-2xl font-bold text-paper mb-4 flex items-center gap-2">
              <Shuffle className="w-6 h-6 text-gold" />
              Método de Sorteio
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {methods.map((method) => (
                <button
                  key={method.value}
                  onClick={() => setConfig({ ...config, method: method.value })}
                  className={`
                    relative p-4 rounded-lg border-2 text-left transition-all
                    ${config.method === method.value 
                      ? 'border-gold bg-gold/10' 
                      : 'border-border bg-surface/50 hover:border-border/50'
                    }
                  `}
                >
                  {method.recommended && (
                    <span className="absolute -top-2 -right-2 px-2 py-1 bg-gold text-navy text-xs font-bold rounded">
                      Recomendado
                    </span>
                  )}
                  <div className="text-3xl mb-2">{method.icon}</div>
                  <h3 className="text-lg font-bold text-paper mb-1">{method.label}</h3>
                  <p className="text-sm text-muted">{method.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Team Selection */}
          <div className="card-ecl">
            <h2 className="text-2xl font-bold text-paper mb-4">
              Selecionar Times ({config.selectedTeams.length}/{config.groupsCount * config.teamsPerGroup})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {teams.map((team) => {
                const isSelected = config.selectedTeams.includes(team.id);
                return (
                  <button
                    key={team.id}
                    onClick={() => toggleTeam(team.id)}
                    className={`
                      flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left
                      ${isSelected 
                        ? 'border-gold bg-gold/10' 
                        : 'border-border bg-surface/50 hover:border-border/50'
                      }
                    `}
                  >
                    <div className={`
                      w-6 h-6 rounded border-2 flex items-center justify-center
                      ${isSelected ? 'border-gold bg-gold' : 'border-border'}
                    `}>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-navy" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-paper font-medium">{team.name}</p>
                      <p className="text-xs text-muted">Pote {team.pot}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Summary Panel */}
        <div className="space-y-6">
          <div className="card-ecl sticky top-4">
            <h2 className="text-2xl font-bold text-paper mb-4">Resumo</h2>

            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-muted">Torneio</span>
                <span className="text-paper font-medium">
                  {tournaments.find(t => t.id === config.tournamentId)?.name}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-muted">Método</span>
                <span className="text-paper font-medium">
                  {methods.find(m => m.value === config.method)?.label}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-muted">Grupos</span>
                <span className="text-paper font-medium">{config.groupsCount}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-muted">Times por Grupo</span>
                <span className="text-paper font-medium">{config.teamsPerGroup}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-muted">Total de Times</span>
                <span className="text-gold font-bold text-lg">
                  {config.selectedTeams.length}/{config.groupsCount * config.teamsPerGroup}
                </span>
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={!isValid}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5" />
              Iniciar Sorteio
            </button>

            {!isValid && (
              <p className="text-xs text-red-400 text-center mt-3">
                Selecione exatamente {config.groupsCount * config.teamsPerGroup} times para continuar
              </p>
            )}
          </div>

          {/* Security Info */}
          <div className="card-ecl bg-blue-400/5 border-blue-400/20">
            <h3 className="text-lg font-bold text-blue-400 mb-2">🔒 Segurança</h3>
            <p className="text-sm text-muted leading-relaxed">
              Todos os sorteios utilizam algoritmos criptograficamente seguros (CSPRNG) e protocolo commit-reveal para garantir transparência e auditabilidade.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

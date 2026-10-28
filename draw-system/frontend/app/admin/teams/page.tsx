'use client';

import { useState } from 'react';
import { Plus, Users, Shield, Edit, Trash2 } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  logo?: string;
  region: string;
  pot?: number;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([
    { id: '1', name: 'FURIA Esports', region: 'Brasil', pot: 1 },
    { id: '2', name: 'LOUD', region: 'Brasil', pot: 1 },
    { id: '3', name: 'Imperial Esports', region: 'Brasil', pot: 2 },
    { id: '4', name: 'paiN Gaming', region: 'Brasil', pot: 2 },
    { id: '5', name: 'MIBR', region: 'Brasil', pot: 3 },
    { id: '6', name: 'Fluxo', region: 'Brasil', pot: 3 },
    { id: '7', name: 'RED Canids', region: 'Brasil', pot: 4 },
    { id: '8', name: 'Sharks Esports', region: 'Brasil', pot: 4 },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: '',
    logo: '',
    region: '',
    pot: 1,
  });

  const handleCreate = async () => {
    // Chamar API
    console.log('Criando time:', newTeam);
    setShowCreateModal(false);
    setNewTeam({ name: '', logo: '', region: '', pot: 1 });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este time?')) {
      setTeams(teams.filter(t => t.id !== id));
    }
  };

  return (
    <div className="container-ecl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-paper mb-2">Gerenciar Times</h1>
          <p className="text-muted">Cadastre times e configure potes para sorteios</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Time
        </button>
      </div>

      {/* Teams Table */}
      <div className="card-ecl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-4 px-6 text-sm font-medium text-muted">Time</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-muted">Região</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-muted">Pote</th>
              <th className="text-right py-4 px-6 text-sm font-medium text-muted">Ações</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    {team.logo ? (
                      <img src={team.logo} alt={team.name} className="w-10 h-10 object-contain" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center text-lg font-bold text-gold">
                        {team.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-paper font-medium">{team.name}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-muted">{team.region}</td>
                <td className="py-4 px-6">
                  <span className="px-3 py-1 bg-blue-400/10 text-blue-400 rounded-full text-sm font-medium">
                    Pote {team.pot}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-surface rounded-lg transition-colors text-blue-400">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(team.id)}
                      className="p-2 hover:bg-surface rounded-lg transition-colors text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-navy border-2 border-border rounded-lg p-8 w-full max-w-2xl">
            <h2 className="text-3xl font-bold text-paper mb-6">Cadastrar Novo Time</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Nome do Time</label>
                <input
                  type="text"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  placeholder="Ex: Team Liquid"
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-paper focus:outline-none focus:border-gold transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted mb-2">URL do Logo</label>
                <input
                  type="url"
                  value={newTeam.logo}
                  onChange={(e) => setNewTeam({ ...newTeam, logo: e.target.value })}
                  placeholder="https://exemplo.com/logo.png"
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-paper focus:outline-none focus:border-gold transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Região</label>
                  <input
                    type="text"
                    value={newTeam.region}
                    onChange={(e) => setNewTeam({ ...newTeam, region: e.target.value })}
                    placeholder="Brasil"
                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-paper focus:outline-none focus:border-gold transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Pote</label>
                  <select
                    value={newTeam.pot}
                    onChange={(e) => setNewTeam({ ...newTeam, pot: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-paper focus:outline-none focus:border-gold transition-colors"
                  >
                    <option value={1}>Pote 1</option>
                    <option value={2}>Pote 2</option>
                    <option value={3}>Pote 3</option>
                    <option value={4}>Pote 4</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 btn-primary"
                disabled={!newTeam.name || !newTeam.region}
              >
                Cadastrar Time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

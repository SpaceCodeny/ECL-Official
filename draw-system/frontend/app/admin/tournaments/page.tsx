'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Trophy, Calendar, Users, Settings } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'completed';
  teamsCount: number;
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([
    {
      id: '1',
      name: 'ECL Season 1',
      startDate: '2024-01-15',
      endDate: '2024-03-30',
      status: 'active',
      teamsCount: 8,
    },
    {
      id: '2',
      name: 'ECL Invitational',
      startDate: '2024-04-01',
      endDate: '2024-04-15',
      status: 'draft',
      teamsCount: 4,
    },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTournament, setNewTournament] = useState({
    name: '',
    startDate: '',
    endDate: '',
    description: '',
  });

  const handleCreate = async () => {
    // Chamar API
    console.log('Criando torneio:', newTournament);
    setShowCreateModal(false);
    setNewTournament({ name: '', startDate: '', endDate: '', description: '' });
  };

  const getStatusColor = (status: Tournament['status']) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10';
      case 'draft': return 'text-yellow-400 bg-yellow-400/10';
      case 'completed': return 'text-muted bg-surface';
    }
  };

  const getStatusLabel = (status: Tournament['status']) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'draft': return 'Rascunho';
      case 'completed': return 'Finalizado';
    }
  };

  return (
    <div className="container-ecl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-paper mb-2">Gerenciar Torneios</h1>
          <p className="text-muted">Crie e configure torneios para sorteios</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Torneio
        </button>
      </div>

      {/* Tournaments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.map((tournament) => (
          <div key={tournament.id} className="card-ecl group hover:border-gold transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gold/10 rounded-lg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-paper">{tournament.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(tournament.status)}`}>
                    {getStatusLabel(tournament.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-muted">
                <Calendar className="w-4 h-4" />
                <span>{new Date(tournament.startDate).toLocaleDateString('pt-BR')} - {new Date(tournament.endDate).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted">
                <Users className="w-4 h-4" />
                <span>{tournament.teamsCount} times cadastrados</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/admin/tournaments/${tournament.id}`}
                className="flex-1 btn-secondary text-center text-sm py-2"
              >
                <Settings className="w-4 h-4 inline mr-1" />
                Configurar
              </Link>
              <Link
                href={`/draw/${tournament.id}`}
                className="flex-1 btn-primary text-center text-sm py-2"
              >
                Sortear
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-navy border-2 border-border rounded-lg p-8 w-full max-w-2xl">
            <h2 className="text-3xl font-bold text-paper mb-6">Criar Novo Torneio</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Nome do Torneio</label>
                <input
                  type="text"
                  value={newTournament.name}
                  onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
                  placeholder="Ex: ECL Season 2"
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-paper focus:outline-none focus:border-gold transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Data de Início</label>
                  <input
                    type="date"
                    value={newTournament.startDate}
                    onChange={(e) => setNewTournament({ ...newTournament, startDate: e.target.value })}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-paper focus:outline-none focus:border-gold transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Data de Término</label>
                  <input
                    type="date"
                    value={newTournament.endDate}
                    onChange={(e) => setNewTournament({ ...newTournament, endDate: e.target.value })}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-paper focus:outline-none focus:border-gold transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted mb-2">Descrição</label>
                <textarea
                  value={newTournament.description}
                  onChange={(e) => setNewTournament({ ...newTournament, description: e.target.value })}
                  placeholder="Descrição do torneio..."
                  rows={4}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-paper focus:outline-none focus:border-gold transition-colors resize-none"
                />
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
                disabled={!newTournament.name || !newTournament.startDate || !newTournament.endDate}
              >
                Criar Torneio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

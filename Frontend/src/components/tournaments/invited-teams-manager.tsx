"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Trophy, AlertCircle, Search, UserPlus } from "lucide-react";
import { useInvitedTeams, useInvitedTeamActions } from "@/hooks/use-invited-teams";
import { useAuthStore } from "@/stores/auth.store";
import { Avatar } from "@/components/ui/avatar";

interface InvitedTeamsManagerProps {
  tournamentId: string;
  maxInvited?: number;
  onUpdate?: () => void;
}

interface Team {
  id: string;
  name: string;
  slug: string;
  tag?: string;
  logoUrl?: string;
}

export function InvitedTeamsManager({
  tournamentId,
  maxInvited = 4,
  onUpdate,
}: InvitedTeamsManagerProps) {
  const { token } = useAuthStore();
  const { invitedTeams, loading, refetch } = useInvitedTeams(tournamentId);
  const { addInvitedTeam, removeInvitedTeam } = useInvitedTeamActions(token);

  const [isAdding, setIsAdding] = useState(false);
  const [teamSlug, setTeamSlug] = useState("");
  const [slot, setSlot] = useState(1);
  const [removing, setRemoving] = useState<string | null>(null);
  
  // Novo: busca de times
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Buscar times disponíveis
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoadingTeams(true);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
        const response = await fetch(`${API_URL}/teams`);
        if (response.ok) {
          const data = await response.json();
          setAvailableTeams(data);
        }
      } catch (err) {
        console.error("Erro ao buscar times:", err);
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchTeams();
  }, []);

  const handleAdd = async (selectedSlug?: string) => {
    const slugToAdd = selectedSlug || teamSlug.trim();

    if (!slugToAdd) {
      alert("Selecione uma equipe");
      return;
    }

    if (invitedTeams && invitedTeams.length >= maxInvited) {
      alert(`Limite de ${maxInvited} equipes convidadas atingido`);
      return;
    }

    try {
      setIsAdding(true);
      await addInvitedTeam(tournamentId, slugToAdd, slot);
      setTeamSlug("");
      setSearchTerm("");
      setSlot(invitedTeams ? invitedTeams.length + 2 : 1);
      await refetch();
      onUpdate?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao adicionar equipe convidada");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (id: string, teamName: string) => {
    if (!confirm(`Deseja remover "${teamName}" dos convidados?`)) return;

    try {
      setRemoving(id);
      await removeInvitedTeam(tournamentId, id);
      await refetch();
      onUpdate?.();
    } catch (err) {
      alert("Erro ao remover equipe convidada");
    } finally {
      setRemoving(null);
    }
  };

  const availableSlots = maxInvited - (invitedTeams?.length || 0);

  // Filtrar times já convidados e pelo termo de busca
  const alreadyInvitedIds = invitedTeams?.map((inv) => inv.team.id) || [];
  const filteredTeams = availableTeams
    .filter((team) => !alreadyInvitedIds.includes(team.id))
    .filter(
      (team) =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.tag?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="bg-gradient-to-br from-gold/5 to-purple-600/5 border border-gold/30 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-gold" />
            Equipes Convidadas
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            Classificação direta para os playoffs
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gold">
            {invitedTeams?.length || 0}/{maxInvited}
          </div>
          <div className="text-xs text-gray-500">slots preenchidos</div>
        </div>
      </div>

      {/* Formulário de adicionar */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {/* Campo de busca */}
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">
              Buscar Equipe
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-gold"
                placeholder="Digite o nome ou tag da equipe..."
                disabled={isAdding || availableSlots === 0}
              />
            </div>
          </div>

          <div className="w-full sm:w-32">
            <label className="block text-sm font-medium mb-2">
              Slot #
            </label>
            <input
              type="number"
              value={slot}
              onChange={(e) => setSlot(parseInt(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold"
              min="1"
              max={maxInvited}
              disabled={isAdding || availableSlots === 0}
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              disabled={availableSlots === 0}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold whitespace-nowrap"
            >
              <UserPlus className="w-5 h-5" />
              Criar Time
            </button>
          </div>
        </div>

        {/* Lista de times disponíveis */}
        {searchTerm && (
          <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-700 rounded-lg p-2 bg-gray-800/50">
            {loadingTeams ? (
              <div className="text-center py-4 text-gray-400 text-sm">
                Carregando times...
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                <p>Nenhuma equipe encontrada</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-2 text-gold hover:underline text-xs"
                >
                  Criar nova equipe
                </button>
              </div>
            ) : (
              filteredTeams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => handleAdd(team.slug)}
                  disabled={isAdding}
                  className="w-full flex items-center gap-3 p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-left disabled:opacity-50"
                >
                  <Avatar
                    name={team.name}
                    src={team.logoUrl}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{team.name}</p>
                    <p className="text-xs text-gray-400">{team.tag || team.slug}</p>
                  </div>
                  <Plus className="w-5 h-5 text-gold shrink-0" />
                </button>
              ))
            )}
          </div>
        )}

        {availableSlots === 0 && (
          <div className="mt-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-3 py-2 rounded text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Limite de {maxInvited} equipes convidadas atingido
          </div>
        )}
      </div>

      {/* Lista de convidados */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : !invitedTeams || invitedTeams.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma equipe convidada ainda</p>
          <p className="text-sm mt-1">
            Adicione equipes que recebem classificação direta para os playoffs
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invitedTeams
            .sort((a, b) => a.bracketSlot - b.bracketSlot)
            .map((invited) => (
              <div
                key={invited.id}
                className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 hover:border-gold/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Slot badge */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
                        <span className="font-bold text-gold">#{invited.bracketSlot}</span>
                      </div>
                    </div>

                    {/* Team info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar
                        name={invited.team.name}
                        src={invited.team.logoUrl}
                        size="md"
                        className="ring-2 ring-gold/20"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold truncate">{invited.team.name}</h4>
                        {invited.team.tag && (
                          <p className="text-sm text-gray-400">{invited.team.tag}</p>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="hidden sm:flex items-center gap-1.5 text-xs bg-gold/10 text-gold px-3 py-1.5 rounded-full shrink-0">
                      <Trophy className="w-3.5 h-3.5" />
                      <span className="font-semibold">Convidado</span>
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(invited.id, invited.team.name)}
                    disabled={removing === invited.id}
                    className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors disabled:opacity-50 shrink-0 ml-2"
                    title="Remover convidado"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Info box */}
      <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-semibold mb-1">Como funciona:</p>
            <ul className="space-y-1 text-blue-300/80">
              <li>• Equipes convidadas não participam da fase suíça</li>
              <li>• Recebem classificação direta para as oitavas de final</li>
              <li>• O slot determina a posição no bracket dos playoffs</li>
              <li>• Time 3-0 pode enfrentar slot específico (regra especial)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

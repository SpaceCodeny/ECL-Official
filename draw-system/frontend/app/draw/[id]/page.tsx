'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import CapsuleOpening from '@/components/CapsuleOpening';
import { ECLLogo } from '@/components/ECLLogo';
import { ChevronLeft, Eye, Share2 } from 'lucide-react';
import Link from 'next/link';

interface Team {
  id: string;
  name: string;
  logo?: string;
  pot?: number;
}

interface DrawResult {
  teamId: string;
  groupId: string;
  position: number;
}

export default function CapsuleDrawPage() {
  const params = useParams();
  const [currentGroup, setCurrentGroup] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<DrawResult[]>([]);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [showGroups, setShowGroups] = useState(false);

  // Mock data
  const tournament = {
    id: params.id,
    name: 'ECL MASTER EDITION',
    subtitle: 'GROUP STAGE DRAW',
  };

  const groups = ['GROUP A', 'GROUP B', 'GROUP C', 'GROUP D'];

  const teams: Team[] = [
    { id: '1', name: 'FURIA Esports', logo: '/logos/furia.png', pot: 1 },
    { id: '2', name: 'LOUD', logo: '/logos/loud.png', pot: 1 },
    { id: '3', name: 'Imperial Esports', logo: '/logos/imperial.png', pot: 2 },
    { id: '4', name: 'paiN Gaming', logo: '/logos/pain.png', pot: 2 },
    { id: '5', name: 'MIBR', logo: '/logos/mibr.png', pot: 3 },
    { id: '6', name: 'Fluxo', logo: '/logos/fluxo.png', pot: 3 },
    { id: '7', name: 'RED Canids', logo: '/logos/red.png', pot: 4 },
    { id: '8', name: 'Sharks Esports', logo: '/logos/sharks.png', pot: 4 },
  ];

  const [availableTeams, setAvailableTeams] = useState<Team[]>(teams);

  const handleOpen = () => {
    if (availableTeams.length === 0) return;
    if (winnerId) return; // Prevenir cliques duplos

    console.log('Opening capsule with', availableTeams.length, 'teams available');
    setIsProcessing(true);

    // Simular chamada à API
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * availableTeams.length);
      const winner = availableTeams[randomIndex];
      console.log('Winner selected:', winner.name, '(id:', winner.id, ')');
      setWinnerId(winner.id);
      setIsProcessing(false);
    }, 500);
  };

  const handleComplete = () => {
    console.log('Handle complete called');
    
    // Encontrar o time vencedor
    const winner = availableTeams.find((t) => t.id === winnerId);
    if (winner) {
      console.log('Adding winner to group:', winner.name, '→', groups[currentGroup]);
      
      // Adicionar ao resultado
      const newResult = {
        teamId: winner.id,
        groupId: groups[currentGroup],
        position: results.filter((r) => r.groupId === groups[currentGroup]).length + 1,
      };
      
      setResults((prev) => [...prev, newResult]);

      // Remover time dos disponíveis
      setAvailableTeams((prev) => {
        const updated = prev.filter((t) => t.id !== winner.id);
        console.log('Teams remaining:', updated.length);
        return updated;
      });

      // Avançar para próximo grupo se necessário
      const teamsInCurrentGroup = results.filter((r) => r.groupId === groups[currentGroup]).length + 1;
      if (teamsInCurrentGroup >= 2 && currentGroup < groups.length - 1) {
        const nextGroup = currentGroup + 1;
        console.log('Moving to next group:', groups[nextGroup]);
        setCurrentGroup(nextGroup);
      }
    }

    // Reset - IMPORTANTE: fazer depois de processar
    setTimeout(() => {
      console.log('Resetting winnerId');
      setWinnerId(null);
    }, 100);
  };

  const progress = (results.length / teams.length) * 100;
  const isComplete = results.length === teams.length;

  return (
    <div className="relative min-h-screen bg-background-primary">
      {/* Header minimalista */}
      <header className="absolute left-0 right-0 top-0 z-40 border-b border-surface-border/50 bg-background-primary/80 backdrop-blur-md">
        <div className="container-ecl">
          <div className="flex h-16 items-center justify-between">
            {/* Logo + Info */}
            <div className="flex items-center gap-6">
              <ECLLogo size="sm" showText={false} />
              <div className="hidden sm:block">
                <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                  {tournament.name}
                </p>
                <p className="font-display text-sm font-bold uppercase text-electric">
                  {tournament.subtitle}
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-3 md:flex">
                <div className="text-right">
                  <p className="text-xs text-text-secondary">Progress</p>
                  <p className="font-display text-sm font-bold text-electric">
                    {results.length} / {teams.length}
                  </p>
                </div>
                <div className="h-2 w-32 overflow-hidden rounded-full bg-surface-border">
                  <div
                    className="h-full bg-gradient-to-r from-electric to-electric-light transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Toggle groups */}
              <button
                onClick={() => setShowGroups(!showGroups)}
                className="btn-ghost"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {showGroups ? 'Hide' : 'Show'} Groups
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main: Cápsula opening */}
      <CapsuleOpening
        teams={availableTeams}
        winnerId={winnerId}
        onOpen={handleOpen}
        onComplete={handleComplete}
        isProcessing={isProcessing}
      />

      {/* Sidebar de grupos (opcional) */}
      {showGroups && (
        <div className="fixed right-0 top-0 z-50 h-screen w-80 animate-slide-in border-l border-surface-border bg-background-primary/95 backdrop-blur-md">
          <div className="flex h-full flex-col p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-display text-xl font-bold uppercase text-text-primary">
                Groups
              </h3>
              <button onClick={() => setShowGroups(false)} className="btn-ghost p-2">
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>

            {/* Groups list */}
            <div className="flex-1 space-y-4 overflow-y-auto">
              {groups.map((group, idx) => {
                const groupTeams = results
                  .filter((r) => r.groupId === group)
                  .map((r) => teams.find((t) => t.id === r.teamId))
                  .filter(Boolean) as Team[];

                const isActive = idx === currentGroup;

                return (
                  <div
                    key={group}
                    className={`rounded-lg border p-4 ${
                      isActive ? 'border-electric bg-electric/5' : 'border-surface-border bg-surface/50'
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="font-display text-sm font-bold uppercase text-text-primary">
                        {group}
                      </h4>
                      {isActive && (
                        <span className="rounded-full bg-electric/20 px-2 py-0.5 text-xs font-bold uppercase text-electric">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {groupTeams.length > 0 ? (
                        groupTeams.map((team) => (
                          <div key={team.id} className="flex items-center gap-2 text-sm">
                            <div className="h-6 w-6 flex-shrink-0 rounded bg-surface">
                              {team.logo ? (
                                <img
                                  src={team.logo}
                                  alt={team.name}
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-electric">
                                  {team.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <span className="truncate text-text-primary">{team.name}</span>
                          </div>
                        ))
                      ) : (
                        <p className="py-4 text-center text-xs text-text-secondary">
                          Awaiting draw...
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Complete state */}
            {isComplete && (
              <div className="mt-6">
                <Link href="/admin/draws" className="btn-primary w-full justify-center">
                  <Share2 className="h-4 w-4" />
                  Publish Results
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current group indicator (minimal) */}
      {!showGroups && results.length < teams.length && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-40 -translate-x-1/2">
          <div className="rounded-full border border-electric/30 bg-background-primary/80 px-6 py-2 backdrop-blur-md">
            <p className="text-center font-display text-sm font-bold uppercase tracking-wider text-electric">
              Sorteando para: {groups[currentGroup]}
            </p>
          </div>
        </div>
      )}

      {/* Complete state overlay */}
      {isComplete && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="pointer-events-auto text-center">
            <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full border-4 border-gold bg-gold/20">
              <svg className="h-12 w-12 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mb-4 font-display text-display-md uppercase text-text-primary">
              Draw Complete
            </h2>
            <p className="mb-8 text-lg text-text-secondary">
              All {teams.length} teams have been drawn into groups
            </p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setShowGroups(true)} className="btn-secondary">
                <Eye className="h-5 w-5" />
                View Groups
              </button>
              <Link href="/admin/draws" className="btn-primary">
                <Share2 className="h-5 w-5" />
                Publish Results
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

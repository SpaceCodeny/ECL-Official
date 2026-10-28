'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  logo?: string;
}

interface DrawResult {
  teamId: string;
  groupId: string;
  position: number;
}

export default function LiveView() {
  const params = useParams();
  const [results, setResults] = useState<DrawResult[]>([]);
  const [currentDraw, setCurrentDraw] = useState<{ team: Team; group: string } | null>(null);

  // Mock data
  const groups = ['Grupo A', 'Grupo B', 'Grupo C', 'Grupo D'];
  const teams: Team[] = [
    { id: '1', name: 'FURIA Esports', logo: '/logos/furia.png' },
    { id: '2', name: 'LOUD', logo: '/logos/loud.png' },
    { id: '3', name: 'Imperial Esports', logo: '/logos/imperial.png' },
    { id: '4', name: 'paiN Gaming', logo: '/logos/pain.png' },
    { id: '5', name: 'MIBR', logo: '/logos/mibr.png' },
    { id: '6', name: 'Fluxo', logo: '/logos/fluxo.png' },
    { id: '7', name: 'RED Canids', logo: '/logos/red.png' },
    { id: '8', name: 'Sharks Esports', logo: '/logos/sharks.png' },
  ];

  // Simular atualização em tempo real (substituir por WebSocket/SSE)
  useEffect(() => {
    const interval = setInterval(() => {
      // Poll API para novos resultados
      // fetch(`/api/v1/draw/sessions/${params.id}`)
    }, 2000);

    return () => clearInterval(interval);
  }, [params.id]);

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-ink via-navy to-ink overflow-hidden relative">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
        }} />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-gradient-to-r from-navy/80 to-transparent backdrop-blur-sm border-b border-gold/30 py-6 px-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Trophy className="w-12 h-12 text-gold" />
            <div>
              <h1 className="text-4xl font-bold text-paper">ECL Season 1</h1>
              <p className="text-xl text-muted">Sorteio ao Vivo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xl text-paper font-medium">AO VIVO</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex h-[calc(100vh-120px)] p-8 gap-8">
        {/* Groups Grid */}
        <div className="flex-1 grid grid-cols-2 gap-6">
          {groups.map((group, idx) => {
            const groupTeams = results
              .filter(r => r.groupId === group)
              .map(r => teams.find(t => t.id === r.teamId))
              .filter(Boolean) as Team[];

            return (
              <motion.div
                key={group}
                className="bg-surface/40 backdrop-blur-md border-2 border-border rounded-lg p-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                {/* Group Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                  <h2 className="text-3xl font-bold text-gold">{group}</h2>
                  <span className="text-xl text-muted">{groupTeams.length}/2</span>
                </div>

                {/* Teams */}
                <div className="space-y-4">
                  {groupTeams.length > 0 ? (
                    groupTeams.map((team, position) => (
                      <motion.div
                        key={team.id}
                        className="flex items-center gap-4 p-4 bg-navy/50 rounded-lg border border-gold/20"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="w-10 h-10 flex items-center justify-center bg-gold rounded-full text-navy font-bold text-xl">
                          {position + 1}
                        </div>
                        {team.logo ? (
                          <img
                            src={team.logo}
                            alt={team.name}
                            className="w-12 h-12 object-contain"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-xl font-bold text-gold">
                            {team.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-xl font-bold text-paper">{team.name}</span>
                      </motion.div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-40 text-muted text-lg">
                      Aguardando sorteio...
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Current Draw Panel */}
        <div className="w-96 flex flex-col">
          {currentDraw ? (
            <motion.div
              className="flex-1 bg-gradient-to-br from-gold/20 to-gold/5 backdrop-blur-md border-2 border-gold rounded-lg p-8 flex flex-col items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {/* Logo */}
              <motion.div
                className="mb-6 relative"
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="absolute inset-0 -m-8 bg-gold/30 rounded-full blur-2xl" />
                {currentDraw.team.logo ? (
                  <img
                    src={currentDraw.team.logo}
                    alt={currentDraw.team.name}
                    className="w-32 h-32 object-contain relative z-10"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gold flex items-center justify-center text-6xl font-bold text-navy relative z-10">
                    {currentDraw.team.name.charAt(0)}
                  </div>
                )}
              </motion.div>

              {/* Team Name */}
              <h3 className="text-3xl font-bold text-center text-gold mb-4">
                {currentDraw.team.name}
              </h3>

              {/* Divider */}
              <div className="w-full h-px bg-gradient-to-r from-transparent via-gold to-transparent my-4" />

              {/* Group */}
              <p className="text-lg text-muted mb-2">Sorteado para</p>
              <p className="text-4xl font-bold text-paper">{currentDraw.group}</p>
            </motion.div>
          ) : (
            <div className="flex-1 bg-surface/40 backdrop-blur-md border-2 border-dashed border-border rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Trophy className="w-20 h-20 text-muted mx-auto mb-4" />
                <p className="text-2xl text-muted">Aguardando próximo sorteio...</p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="mt-6 bg-surface/40 backdrop-blur-md border-2 border-border rounded-lg p-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-gold">{results.length}</p>
                <p className="text-sm text-muted">Times Sorteados</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-400">{teams.length - results.length}</p>
                <p className="text-sm text-muted">Restantes</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-navy/80 to-transparent backdrop-blur-sm border-t border-gold/30 py-4 px-12">
        <div className="flex items-center justify-between">
          <p className="text-muted">eclgg.com/sorteio</p>
          <p className="text-paper font-bold">ECL Draw System</p>
        </div>
      </footer>

      {/* Decorative corner elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface Team {
  id: string;
  name: string;
  logo?: string;
  pot?: number;
}

interface OfficialRouletteProps {
  teams: Team[];
  winnerId: string | null;
  isSpinning: boolean;
  onComplete?: () => void;
}

type Phase = 'idle' | 'spinning' | 'slowing' | 'stopped';

export default function OfficialRoulette({
  teams,
  winnerId,
  isSpinning,
  onComplete,
}: OfficialRouletteProps) {
  const controls = useAnimation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Multiplicador para criar loop infinito visual
  const MULTIPLIER = 8;
  const CARD_WIDTH = 240; // largura + gap
  const SPIN_DURATION = 5;

  const extendedTeams = Array(MULTIPLIER).fill(teams).flat();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      // audioRef.current.src = '/sounds/roulette-spin.mp3';
    }
  }, []);

  useEffect(() => {
    if (!isSpinning || !winnerId || teams.length === 0) return;

    setPhase('spinning');

    // Tocar áudio
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.play().catch(() => {});
    }

    const winnerIndex = teams.findIndex((team) => team.id === winnerId);
    if (winnerIndex === -1) {
      setPhase('idle');
      return;
    }

    // Calcular posição final
    const middleArray = Math.floor(MULTIPLIER / 2);
    const targetIndex = middleArray * teams.length + winnerIndex;
    const containerWidth = window.innerWidth;
    const centerOffset = containerWidth / 2;
    const finalOffset = -(targetIndex * CARD_WIDTH) + centerOffset - CARD_WIDTH / 2;

    // Animação suave com desaceleração natural
    controls
      .start({
        x: finalOffset,
        transition: {
          duration: SPIN_DURATION,
          ease: [0.16, 1, 0.3, 1],
        },
      })
      .then(() => {
        setPhase('stopped');
        setSelectedIndex(winnerIndex);

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }

        // Aguardar antes de chamar onComplete
        setTimeout(() => {
          onComplete?.();
        }, 600);
      });

    // Mudar para fase de desaceleração
    const slowingTimeout = setTimeout(() => {
      setPhase('slowing');
    }, SPIN_DURATION * 700);

    return () => clearTimeout(slowingTimeout);
  }, [isSpinning, winnerId, teams, controls, onComplete]);

  const getCardState = (index: number): 'focused' | 'near' | 'default' => {
    if (phase !== 'stopped' || selectedIndex === null) return 'default';
    const actualIndex = index % teams.length;
    if (actualIndex === selectedIndex) return 'focused';
    const distance = Math.abs(actualIndex - selectedIndex);
    if (distance === 1 || distance === teams.length - 1) return 'near';
    return 'default';
  };

  const getPhaseLabel = (): string => {
    switch (phase) {
      case 'idle':
        return 'READY';
      case 'spinning':
        return 'DRAWING...';
      case 'slowing':
        return 'REVEALING...';
      case 'stopped':
        return 'COMPLETE';
      default:
        return 'READY';
    }
  };

  return (
    <div className="roulette-container relative h-[420px]">
      {/* Background effects */}
      <div className="lighting-top" />
      <div className="scan-lines" />

      {/* Indicador central fixo */}
      <div className="absolute left-1/2 top-0 bottom-0 z-30 flex -translate-x-1/2 flex-col items-center justify-between pointer-events-none">
        {/* Linha vertical */}
        <div className="absolute inset-y-0 w-0.5 bg-gradient-to-b from-transparent via-electric to-transparent opacity-80" />

        {/* Indicador superior */}
        <div className="relative top-4">
          <div className="h-10 w-10 rounded-full border-2 border-electric bg-electric/20 shadow-glow-electric" />
          <div className="absolute left-1/2 top-full h-8 w-0.5 -translate-x-1/2 bg-gradient-to-b from-electric to-transparent" />
        </div>

        {/* Indicador inferior */}
        <div className="relative bottom-4">
          <div className="absolute bottom-full left-1/2 h-8 w-0.5 -translate-x-1/2 bg-gradient-to-t from-electric to-transparent" />
          <div className="h-10 w-10 rounded-full border-2 border-electric bg-electric/20 shadow-glow-electric" />
        </div>
      </div>

      {/* Gradientes laterais */}
      <div className="absolute left-0 top-0 bottom-0 z-20 w-64 bg-gradient-to-r from-background-secondary via-background-secondary/80 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 z-20 w-64 bg-gradient-to-l from-background-secondary via-background-secondary/80 to-transparent pointer-events-none" />

      {/* Container dos cards */}
      <motion.div
        ref={containerRef}
        className="flex h-full items-center gap-6 px-8"
        animate={controls}
        initial={{ x: -(Math.floor(MULTIPLIER / 2) * teams.length * CARD_WIDTH) }}
      >
        {extendedTeams.map((team, index) => {
          const cardState = getCardState(index);

          return (
            <div
              key={`${team.id}-${index}`}
              className={`
                team-card-roulette h-[340px] w-[220px]
                ${cardState === 'focused' ? 'team-card-focused' : ''}
                ${cardState === 'near' ? 'opacity-60' : ''}
                ${cardState === 'default' ? 'opacity-40' : ''}
              `}
              style={{
                filter: phase === 'spinning' ? 'blur(2px)' : 'none',
                transition: 'filter 0.3s, opacity 0.3s',
              }}
            >
              {/* Logo */}
              <div className="relative mb-4 h-28 w-28">
                {team.logo ? (
                  <img
                    src={team.logo}
                    alt={team.name}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div
                  className={`absolute inset-0 flex items-center justify-center rounded-full border-2 border-surface-border bg-surface text-4xl font-bold text-electric ${
                    team.logo ? 'hidden' : ''
                  }`}
                >
                  {team.name.charAt(0).toUpperCase()}
                </div>

                {/* Glow para o vencedor */}
                {cardState === 'focused' && (
                  <div className="absolute inset-0 -z-10 animate-glow-pulse rounded-full bg-electric/30 blur-2xl" />
                )}
              </div>

              {/* Nome do time */}
              <h3
                className={`mb-2 text-center font-display text-lg font-bold uppercase leading-tight ${
                  cardState === 'focused' ? 'text-electric' : 'text-text-primary'
                }`}
              >
                {team.name}
              </h3>

              {/* Pot badge */}
              {team.pot !== undefined && (
                <div
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                    cardState === 'focused'
                      ? 'bg-electric/20 text-electric'
                      : 'bg-surface-border text-text-secondary'
                  }`}
                >
                  POT {team.pot}
                </div>
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Status indicator */}
      <div className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2">
        <div
          className={`
            rounded-full border px-6 py-2 font-display text-sm font-bold uppercase tracking-widest backdrop-blur-md
            ${
              phase === 'spinning' || phase === 'slowing'
                ? 'animate-glow-pulse border-electric bg-electric/20 text-electric'
                : phase === 'stopped'
                ? 'border-gold bg-gold/20 text-gold'
                : 'border-surface-border bg-surface/80 text-text-secondary'
            }
          `}
        >
          {getPhaseLabel()}
        </div>
      </div>

      {/* Partículas durante spinning */}
      {phase === 'spinning' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-electric"
              initial={{
                x: Math.random() * window.innerWidth,
                y: window.innerHeight,
                opacity: 0,
              }}
              animate={{
                y: -50,
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2 + Math.random(),
                delay: Math.random() * 2,
                repeat: Infinity,
              }}
            />
          ))}
        </div>
      )}

      {/* Explosão de luz ao parar */}
      {phase === 'stopped' && selectedIndex !== null && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-25"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.8 }}
        >
          <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-electric/20 blur-3xl" />
        </motion.div>
      )}
    </div>
  );
}

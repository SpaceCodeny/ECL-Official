'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  logo?: string;
  pot?: number;
}

interface CapsuleOpeningProps {
  teams: Team[];
  winnerId: string | null;
  onOpen: () => void;
  onComplete?: () => void;
  isProcessing: boolean;
}

type Phase = 'ready' | 'opening' | 'spinning' | 'decelerating' | 'revealing' | 'confirmed';

export default function CapsuleOpening({
  teams,
  winnerId,
  onOpen,
  onComplete,
  isProcessing,
}: CapsuleOpeningProps) {
  const controls = useAnimation();
  const [phase, setPhase] = useState<Phase>('ready');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Configurações
  const MULTIPLIER = 10; // Repetições para efeito infinito
  const CARD_WIDTH = 200;
  const CARD_GAP = 16;
  const TOTAL_CARD_WIDTH = CARD_WIDTH + CARD_GAP;
  const ANIMATION_DURATION = 6.5; // segundos

  const extendedTeams = Array(MULTIPLIER).fill(teams).flat();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      // audioRef.current.src = '/sounds/capsule-spin.mp3';
    }
  }, []);

  useEffect(() => {
    if (!winnerId || teams.length === 0) return;
    if (phase !== 'ready') return;

    const winnerIndex = teams.findIndex((team) => team.id === winnerId);
    if (winnerIndex === -1) {
      console.error('Winner not found:', winnerId);
      return;
    }

    console.log('Starting opening sequence for:', teams[winnerIndex].name);
    // Iniciar sequência de abertura
    startOpeningSequence(winnerIndex);
  }, [winnerId, teams]);

  const startOpeningSequence = async (winnerIndex: number) => {
    console.log('Phase: Opening capsule');
    
    // Fase 1: Abertura da cápsula (0.8s)
    setPhase('opening');
    await new Promise((resolve) => setTimeout(resolve, 800));

    console.log('Phase: Spinning');
    
    // Fase 2: Spinning (começa rápido)
    setPhase('spinning');
    
    if (audioRef.current && audioRef.current.src && !muted) {
      audioRef.current.play().catch(() => {});
    }

    // Calcular posição final
    const middleArray = Math.floor(MULTIPLIER / 2);
    const targetIndex = middleArray * teams.length + winnerIndex;
    const containerWidth = window.innerWidth;
    const centerOffset = containerWidth / 2;
    const finalOffset = -(targetIndex * TOTAL_CARD_WIDTH) + centerOffset - CARD_WIDTH / 2;

    console.log('Animation params:', {
      winnerIndex,
      targetIndex,
      finalOffset,
      containerWidth,
      totalCards: extendedTeams.length
    });

    // Mudar fase durante animação
    const decelTimer = setTimeout(() => {
      console.log('Phase: Decelerating');
      setPhase('decelerating');
    }, ANIMATION_DURATION * 0.75 * 1000);

    // Animação de roleta
    try {
      await controls.start({
        x: finalOffset,
        transition: {
          duration: ANIMATION_DURATION,
          ease: [0.12, 0.67, 0.27, 0.98], // Easing CS2-like
        },
      });

      clearTimeout(decelTimer);
      console.log('Phase: Revealing');

      // Fase 4: Revelação
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      setPhase('revealing');
      setSelectedIndex(winnerIndex);

      // Som de revelação
      // const revealSound = new Audio('/sounds/reveal.mp3');
      // revealSound.play().catch(() => {});

      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log('Phase: Confirmed');
      
      // Fase 5: Confirmado
      setPhase('confirmed');

      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log('Phase: Complete - Calling callback');
      
      // Reset e chamar callback
      setPhase('ready');
      setSelectedIndex(null);
      onComplete?.();
    } catch (error) {
      console.error('Animation error:', error);
      clearTimeout(decelTimer);
      setPhase('ready');
      setSelectedIndex(null);
    }
  };

  const handleOpen = () => {
    if (phase !== 'ready' || isProcessing) return;
    onOpen();
  };

  const getCardOpacity = (index: number): number => {
    if (phase === 'revealing' || phase === 'confirmed') {
      if (selectedIndex === null) return 0.3;
      const actualIndex = index % teams.length;
      return actualIndex === selectedIndex ? 1 : 0.15;
    }
    if (phase === 'spinning') return 0.7;
    if (phase === 'decelerating') return 0.85;
    return 0.6;
  };

  const getCardScale = (index: number): number => {
    if ((phase === 'revealing' || phase === 'confirmed') && selectedIndex !== null) {
      const actualIndex = index % teams.length;
      return actualIndex === selectedIndex ? 1.15 : 0.95;
    }
    return 1;
  };

  const isWinningCard = (index: number): boolean => {
    if (selectedIndex === null) return false;
    return index % teams.length === selectedIndex;
  };

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background-primary">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-electric/5 via-transparent to-transparent" />
      
      {/* Scan lines */}
      <div className="scan-lines" />

      {/* Audio control */}
      <button
        onClick={() => setMuted(!muted)}
        className="absolute right-6 top-6 z-50 rounded-lg bg-surface/80 p-3 backdrop-blur-sm transition-colors hover:bg-surface"
      >
        {muted ? (
          <VolumeX className="h-5 w-5 text-text-secondary" />
        ) : (
          <Volume2 className="h-5 w-5 text-electric" />
        )}
      </button>

      {/* Main content container */}
      <div className="container-ecl relative z-10 flex flex-col items-center">
        
        {/* Debug info (remover em produção) */}
        <div className="fixed top-20 left-4 z-50 rounded bg-black/80 p-3 text-xs text-white font-mono">
          <div>Phase: <strong className="text-electric">{phase}</strong></div>
          <div>Winner ID: <strong className="text-gold">{winnerId || 'none'}</strong></div>
          <div>Selected Index: <strong className="text-gold">{selectedIndex ?? 'none'}</strong></div>
          <div>Teams: {teams.length}</div>
          <div>Processing: {isProcessing ? 'YES' : 'NO'}</div>
        </div>
        {/* Cápsula visual (estado ready/opening) */}
        {(phase === 'ready' || phase === 'opening') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: phase === 'ready' ? 1 : 0,
              scale: phase === 'ready' ? 1 : 1.2,
              rotate: phase === 'opening' ? [0, -5, 5, 0] : 0,
            }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            {/* Cápsula ECL */}
            <div className="relative mx-auto mb-8 h-64 w-64">
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-full bg-electric/20 blur-3xl" />
              
              {/* Cápsula */}
              <div className="relative flex h-full w-full items-center justify-center rounded-full border-4 border-electric bg-gradient-to-br from-surface via-background-elevated to-surface shadow-elevation-3">
                {/* Shield icon */}
                <svg className="h-32 w-32 text-electric drop-shadow-glow-electric" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"
                    fill="currentColor"
                    opacity="0.3"
                  />
                  <path
                    d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 overflow-hidden rounded-full"
                  animate={{
                    background: [
                      'linear-gradient(45deg, transparent 30%, rgba(22,119,255,0.3) 50%, transparent 70%)',
                    ],
                    backgroundPosition: ['0% 0%', '200% 200%'],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              </div>
            </div>

            {/* Info text */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <p className="mb-2 font-display text-sm uppercase tracking-widest text-electric">
                ECL Draw Capsule
              </p>
              <p className="text-2xl font-bold text-text-primary">
                {teams.length} times disponíveis
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* Área da roleta */}
        <div className="relative w-full">
          {/* Indicador central fixo */}
          {(phase === 'spinning' || phase === 'decelerating' || phase === 'revealing' || phase === 'confirmed') && (
            <div className="absolute left-1/2 top-0 bottom-0 z-30 flex -translate-x-1/2 items-center pointer-events-none">
              {/* Linha vertical */}
              <div className="absolute inset-y-0 w-1 bg-gradient-to-b from-transparent via-electric to-transparent" />
              
              {/* Indicadores */}
              <div className="absolute -top-4 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full border-2 border-electric bg-electric/30 shadow-glow-electric" />
              <div className="absolute -bottom-4 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full border-2 border-electric bg-electric/30 shadow-glow-electric" />
            </div>
          )}

          {/* Container da roleta */}
          <div className="relative h-[400px] overflow-hidden">
            {/* Gradientes laterais */}
            <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-20 w-64 bg-gradient-to-r from-background-primary via-background-primary/90 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-20 w-64 bg-gradient-to-l from-background-primary via-background-primary/90 to-transparent" />

            {/* Faixa de times */}
            <motion.div
              ref={containerRef}
              className="flex h-full items-center gap-4 px-8"
              animate={controls}
              initial={{ x: -(Math.floor(MULTIPLIER / 2) * teams.length * TOTAL_CARD_WIDTH) }}
              style={{
                filter: phase === 'spinning' ? 'blur(3px)' : phase === 'decelerating' ? 'blur(1px)' : 'none',
              }}
            >
              {extendedTeams.map((team, index) => (
                <motion.div
                  key={`${team.id}-${index}`}
                  className="flex-shrink-0"
                  style={{
                    width: CARD_WIDTH,
                    opacity: getCardOpacity(index),
                    scale: getCardScale(index),
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Card do time */}
                  <div
                    className={`
                      flex h-[320px] flex-col items-center justify-center gap-4 rounded-lg p-6 transition-all duration-300
                      ${
                        (phase === 'revealing' || phase === 'confirmed') && isWinningCard(index)
                          ? 'border-2 border-gold bg-gradient-to-b from-gold/20 to-background-elevated shadow-glow-gold'
                          : 'border border-surface-border bg-background-elevated'
                      }
                    `}
                  >
                    {/* Logo */}
                    <div className="relative h-28 w-28">
                      {team.logo ? (
                        <img
                          src={team.logo}
                          alt={team.name}
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div
                        className={`absolute inset-0 flex items-center justify-center rounded-full border-2 border-electric/30 bg-surface text-4xl font-bold text-electric ${
                          team.logo ? 'hidden' : ''
                        }`}
                      >
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    {/* Nome */}
                    <h3
                      className={`text-center font-display text-lg font-bold uppercase leading-tight ${
                        (phase === 'revealing' || phase === 'confirmed') && isWinningCard(index)
                          ? 'text-gold'
                          : 'text-text-primary'
                      }`}
                    >
                      {team.name}
                    </h3>

                    {/* Pot badge */}
                    {team.pot !== undefined && (
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                          (phase === 'revealing' || phase === 'confirmed') && isWinningCard(index)
                            ? 'bg-gold/30 text-gold'
                            : 'bg-surface-border text-text-secondary'
                        }`}
                      >
                        POT {team.pot}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Botão de abertura */}
        {phase === 'ready' && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={handleOpen}
            disabled={isProcessing || teams.length === 0}
            className="mt-12 btn-primary px-16 py-5 text-xl font-bold uppercase tracking-wider disabled:opacity-40"
          >
            {isProcessing ? (
              <>
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-background-primary border-t-transparent" />
                PROCESSANDO...
              </>
            ) : (
              'ABRIR CÁPSULA'
            )}
          </motion.button>
        )}

        {/* Status durante animação */}
        {(phase === 'spinning' || phase === 'decelerating') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 rounded-full border border-electric/30 bg-electric/10 px-6 py-3 font-display text-sm font-bold uppercase tracking-widest text-electric"
          >
            {phase === 'spinning' ? 'SORTEANDO...' : 'REVELANDO...'}
          </motion.div>
        )}

        {/* Resultado revelado */}
        {(phase === 'revealing' || phase === 'confirmed') && selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-12 text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border-2 border-gold bg-gold/20 px-6 py-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-gold" />
              <span className="font-display text-sm font-bold uppercase tracking-widest text-gold">
                TIME SORTEADO
              </span>
            </div>
            <p className="text-display-md text-text-primary">
              {teams[selectedIndex]?.name}
            </p>
          </motion.div>
        )}
      </div>

      {/* Partículas durante revelação */}
      {(phase === 'revealing' || phase === 'confirmed') && (
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-gold"
              initial={{
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                opacity: 0,
              }}
              animate={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                delay: i * 0.02,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

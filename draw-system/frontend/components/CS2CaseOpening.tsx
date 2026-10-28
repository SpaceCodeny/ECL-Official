'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  logo?: string;
  pot?: number;
}

interface CS2CaseOpeningProps {
  teams: Team[];
  winnerId: string | null;
  isSpinning: boolean;
  onComplete?: () => void;
}

export default function CS2CaseOpening({
  teams,
  winnerId,
  isSpinning,
  onComplete,
}: CS2CaseOpeningProps) {
  const controls = useAnimation();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'slowing' | 'stopped'>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Criar áudio de spin (simulado - pode substituir por arquivo real)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      // Você pode adicionar um arquivo de som real aqui
      // audioRef.current.src = '/sounds/cs2-spin.mp3';
    }
  }, []);

  // Multiplicar items para criar efeito infinito
  const multiplier = 8;
  const extendedTeams = Array(multiplier).fill(teams).flat();

  useEffect(() => {
    if (!isSpinning || !winnerId) return;

    setPhase('spinning');
    
    // Tocar som de spin
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }

    const winnerIndex = teams.findIndex(team => team.id === winnerId);
    if (winnerIndex === -1) {
      setPhase('idle');
      return;
    }

    const cardWidth = 220; // largura do card + gap
    const middleArray = Math.floor(multiplier / 2);
    const targetIndex = middleArray * teams.length + winnerIndex;
    
    // Calcular offset final para centralizar o vencedor
    const containerWidth = window.innerWidth;
    const centerOffset = containerWidth / 2;
    const finalOffset = -(targetIndex * cardWidth) + centerOffset - (cardWidth / 2);

    // Animação em 3 fases: rápida, desaceleração, parada
    const spinDuration = 5;
    
    controls.start({
      x: finalOffset,
      transition: {
        duration: spinDuration,
        ease: [0.16, 1, 0.3, 1], // easing tipo CS2
        times: [0, 0.7, 0.95, 1],
      },
    }).then(() => {
      setPhase('stopped');
      setSelectedIndex(winnerIndex);
      
      // Parar som
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Som de reveal (simulado)
      setTimeout(() => {
        onComplete?.();
      }, 800);
    });

    // Mudar fase durante animação
    setTimeout(() => setPhase('slowing'), spinDuration * 700);

  }, [isSpinning, winnerId, teams, controls, onComplete]);

  return (
    <div className="relative w-full h-[500px] overflow-hidden bg-gradient-to-b from-navy-900 via-navy to-navy-900 rounded-xl border-2 border-gold/30">
      {/* Efeito de fundo tipo CS2 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/5 via-transparent to-transparent" />
      
      {/* Linhas de escaneamento */}
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(214,177,94,0.1) 2px, rgba(214,177,94,0.1) 4px)',
        }}
        animate={{ backgroundPosition: ['0px 0px', '0px 100px'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />

      {/* Indicador central tipo CS2 */}
      <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 z-30 pointer-events-none">
        {/* Linha vertical dourada */}
        <div className="absolute inset-0 w-1 bg-gradient-to-b from-transparent via-gold to-transparent opacity-80" />
        
        {/* Triângulo superior */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[30px] border-l-transparent border-r-[30px] border-r-transparent border-t-[40px] border-t-gold drop-shadow-[0_0_30px_rgba(214,177,94,0.9)]" />
        
        {/* Triângulo inferior */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[30px] border-l-transparent border-r-[30px] border-r-transparent border-b-[40px] border-b-gold drop-shadow-[0_0_30px_rgba(214,177,94,0.9)]" />
        
        {/* Glow central */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-48 bg-gold/30 blur-xl"
          animate={{
            scaleY: phase === 'spinning' ? [1, 1.5, 1] : 1,
            opacity: phase === 'spinning' ? [0.3, 0.6, 0.3] : 0.3,
          }}
          transition={{ duration: 0.5, repeat: phase === 'spinning' ? Infinity : 0 }}
        />
      </div>

      {/* Gradientes laterais */}
      <div className="absolute left-0 top-0 bottom-0 w-64 bg-gradient-to-r from-navy-900 via-navy-900/80 to-transparent z-20 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-navy-900 via-navy-900/80 to-transparent z-20 pointer-events-none" />

      {/* Container dos cards */}
      <motion.div
        ref={containerRef}
        className="flex items-center h-full gap-5 px-8 py-12"
        animate={controls}
        initial={{ x: -(Math.floor(multiplier / 2) * teams.length * 220) }}
      >
        {extendedTeams.map((team, index) => {
          const isWinner = selectedIndex !== null && index % teams.length === selectedIndex && phase === 'stopped';
          const isNearWinner = selectedIndex !== null && Math.abs((index % teams.length) - selectedIndex) <= 1;
          
          return (
            <motion.div
              key={`${team.id}-${index}`}
              className={`
                flex-shrink-0 w-[200px] h-[380px] rounded-xl relative
                transition-all duration-300
                ${isWinner 
                  ? 'scale-110 z-10' 
                  : isNearWinner && phase === 'stopped'
                  ? 'scale-95 opacity-60'
                  : 'opacity-80'
                }
              `}
            >
              {/* Background do card */}
              <div className={`
                absolute inset-0 rounded-xl overflow-hidden
                ${isWinner
                  ? 'bg-gradient-to-br from-gold/30 via-gold/10 to-transparent border-2 border-gold'
                  : 'bg-gradient-to-br from-surface/80 to-navy/60 border-2 border-border'
                }
              `}>
                {/* Efeito de shimmer quando está girando */}
                {phase === 'spinning' && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/20 to-transparent"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  />
                )}
              </div>

              {/* Conteúdo do card */}
              <div className="relative z-10 h-full flex flex-col items-center justify-center p-6">
                {/* Logo do time */}
                <motion.div
                  className="mb-6 relative"
                  animate={isWinner ? {
                    scale: [1, 1.1, 1],
                  } : {}}
                  transition={{ duration: 0.5, repeat: isWinner ? Infinity : 0, repeatDelay: 0.3 }}
                >
                  {/* Glow atrás do logo */}
                  {isWinner && (
                    <motion.div
                      className="absolute inset-0 -m-8 bg-gold/40 rounded-full blur-3xl"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.4, 0.7, 0.4],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}

                  {team.logo ? (
                    <img 
                      src={team.logo} 
                      alt={team.name}
                      className="w-28 h-28 object-contain relative z-10"
                    />
                  ) : (
                    <div className={`
                      w-28 h-28 rounded-full flex items-center justify-center text-5xl font-bold relative z-10
                      ${isWinner 
                        ? 'bg-gradient-to-br from-gold to-gold-dark text-navy' 
                        : 'bg-navy-50 text-gold'
                      }
                    `}>
                      {team.name.charAt(0)}
                    </div>
                  )}
                </motion.div>

                {/* Nome do time */}
                <h3 className={`
                  text-xl font-display font-bold text-center mb-3 uppercase tracking-wide px-2
                  ${isWinner ? 'text-gold' : 'text-paper'}
                `}>
                  {team.name}
                </h3>

                {/* Pote */}
                {team.pot !== undefined && (
                  <span className={`
                    px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider
                    ${isWinner 
                      ? 'bg-gold text-navy' 
                      : 'bg-navy-100 text-gold-light border border-gold/30'
                    }
                  `}>
                    Pote {team.pot}
                  </span>
                )}

                {/* Estrelas decorativas para o vencedor */}
                {isWinner && (
                  <>
                    <motion.div
                      className="absolute -top-4 -right-4"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles className="w-10 h-10 text-gold drop-shadow-[0_0_10px_rgba(214,177,94,0.8)]" />
                    </motion.div>
                    <motion.div
                      className="absolute -bottom-4 -left-4"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles className="w-8 h-8 text-gold-light drop-shadow-[0_0_10px_rgba(232,201,127,0.8)]" />
                    </motion.div>
                  </>
                )}
              </div>

              {/* Border glow para o vencedor */}
              {isWinner && (
                <motion.div
                  className="absolute -inset-1 rounded-xl bg-gradient-to-r from-gold via-gold-light to-gold opacity-75 blur-xl"
                  animate={{
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Partículas flutuantes quando está girando */}
      {phase === 'spinning' && (
        <div className="absolute inset-0 pointer-events-none z-5">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-gold rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + 50,
                opacity: 0,
              }}
              animate={{
                y: -50,
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 2,
                repeat: Infinity,
              }}
            />
          ))}
        </div>
      )}

      {/* Explosão de luz quando para */}
      {phase === 'stopped' && selectedIndex !== null && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-25"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1 }}
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gold/30 rounded-full blur-3xl" />
          
          {/* Raios de luz */}
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 w-2 h-64 bg-gradient-to-t from-gold/0 via-gold/50 to-gold/0 origin-bottom"
              style={{
                transform: `rotate(${i * 30}deg) translateY(-50%)`,
              }}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: [0, 1, 0], scaleY: [0, 1, 0] }}
              transition={{ duration: 0.8, delay: i * 0.05 }}
            />
          ))}
        </motion.div>
      )}

      {/* Status indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
        <div className={`
          px-6 py-2 rounded-full backdrop-blur-md border font-display text-sm uppercase tracking-wider
          ${phase === 'spinning' 
            ? 'bg-gold/20 border-gold text-gold animate-pulse' 
            : phase === 'stopped'
            ? 'bg-gold border-gold text-navy font-bold'
            : 'bg-surface/80 border-border text-muted'
          }
        `}>
          {phase === 'spinning' && 'Sorteando...'}
          {phase === 'slowing' && 'Revelando...'}
          {phase === 'stopped' && '✨ Sorteado!'}
          {phase === 'idle' && 'Pronto para sortear'}
        </div>
      </div>
    </div>
  );
}

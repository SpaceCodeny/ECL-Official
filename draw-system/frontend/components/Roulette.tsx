'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface RouletteProps {
  items: Array<{ id: string; name: string; logo?: string; pot?: number }>;
  winnerId: string | null;
  isSpinning: boolean;
  onSpinComplete?: () => void;
}

export default function Roulette({ items, winnerId, isSpinning, onSpinComplete }: RouletteProps) {
  const controls = useAnimation();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Duplicar items para criar efeito infinito
  const extendedItems = [...items, ...items, ...items, ...items, ...items];

  useEffect(() => {
    if (isSpinning && winnerId) {
      const winnerIndex = items.findIndex(item => item.id === winnerId);
      if (winnerIndex === -1) return;

      const cardWidth = 280; // largura do card + gap
      const startOffset = -cardWidth * items.length * 2; // começa no meio dos items duplicados
      const targetOffset = startOffset - (cardWidth * winnerIndex) + window.innerWidth / 2 - cardWidth / 2;

      // Animação: aceleração rápida, depois desaceleração lenta
      controls.start({
        x: targetOffset,
        transition: {
          duration: 5,
          ease: [0.32, 0.72, 0, 1], // easing personalizado tipo CS2
        },
      }).then(() => {
        setSelectedIndex(winnerIndex);
        onSpinComplete?.();
      });
    }
  }, [isSpinning, winnerId, items, controls, onSpinComplete]);

  return (
    <div className="relative w-full h-[400px] overflow-hidden bg-navy/50 rounded-lg">
      {/* Indicador central */}
      <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 z-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gold to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[30px] border-t-gold drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]" />
      </div>

      {/* Gradient overlays nas laterais */}
      <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-navy to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-navy to-transparent z-10 pointer-events-none" />

      {/* Container dos cards */}
      <motion.div
        ref={containerRef}
        className="flex items-center h-full gap-6 px-8"
        animate={controls}
        initial={{ x: -280 * items.length * 2 }}
      >
        {extendedItems.map((item, index) => {
          const isWinner = selectedIndex !== null && index % items.length === selectedIndex;
          
          return (
            <motion.div
              key={`${item.id}-${index}`}
              className={`
                flex-shrink-0 w-[250px] h-[300px] rounded-lg border-2
                ${isWinner 
                  ? 'border-gold bg-gradient-to-b from-gold/20 to-gold/5' 
                  : 'border-border bg-surface/80'
                }
                backdrop-blur-sm transition-all duration-300
                flex flex-col items-center justify-center p-6
              `}
              animate={isWinner ? {
                scale: [1, 1.05, 1],
                boxShadow: [
                  '0 0 0 rgba(245,158,11,0)',
                  '0 0 40px rgba(245,158,11,0.6)',
                  '0 0 20px rgba(245,158,11,0.4)',
                ],
              } : {}}
              transition={{ duration: 0.5, repeat: isWinner ? Infinity : 0, repeatDelay: 0.5 }}
            >
              {/* Logo do time */}
              {item.logo ? (
                <img 
                  src={item.logo} 
                  alt={item.name}
                  className="w-24 h-24 object-contain mb-4"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-navy/50 flex items-center justify-center mb-4 text-4xl font-bold text-gold">
                  {item.name.charAt(0)}
                </div>
              )}

              {/* Nome do time */}
              <h3 className={`text-xl font-bold text-center mb-2 ${isWinner ? 'text-gold' : 'text-paper'}`}>
                {item.name}
              </h3>

              {/* Pote (se aplicável) */}
              {item.pot !== undefined && (
                <span className="px-3 py-1 rounded-full bg-navy/80 text-blue-400 text-sm font-medium">
                  Pote {item.pot}
                </span>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Efeito de brilho quando ganha */}
      {selectedIndex !== null && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1, times: [0, 0.5, 1] }}
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-gold/20 rounded-full blur-3xl" />
        </motion.div>
      )}
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface TeamRevealProps {
  team: { id: string; name: string; logo?: string; pot?: number };
  group: string;
  onComplete: () => void;
}

export default function TeamReveal({ team, group, onComplete }: TeamRevealProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Partículas de fundo */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-gold rounded-full"
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
              duration: 3 + Math.random() * 2,
              delay: Math.random() * 2,
              repeat: Infinity,
            }}
          />
        ))}
      </div>

      {/* Círculos concêntricos */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            className="absolute border-2 border-gold/30 rounded-full"
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{
              width: ring * 400,
              height: ring * 400,
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 2,
              delay: ring * 0.3,
              repeat: Infinity,
              repeatDelay: 1,
            }}
          />
        ))}
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-10 text-center">
        {/* Logo do time */}
        <motion.div
          className="mb-8 relative"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: 'spring' }}
        >
          {/* Brilho atrás do logo */}
          <motion.div
            className="absolute inset-0 -m-12"
            animate={{
              boxShadow: [
                '0 0 60px 30px rgba(245,158,11,0.4)',
                '0 0 100px 50px rgba(245,158,11,0.2)',
                '0 0 60px 30px rgba(245,158,11,0.4)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          {team.logo ? (
            <img
              src={team.logo}
              alt={team.name}
              className="w-48 h-48 object-contain relative z-10"
            />
          ) : (
            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-gold to-yellow-600 flex items-center justify-center text-8xl font-bold text-navy relative z-10">
              {team.name.charAt(0)}
            </div>
          )}

          {/* Estrelas decorativas */}
          <motion.div
            className="absolute -top-4 -right-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-12 h-12 text-gold" />
          </motion.div>
          <motion.div
            className="absolute -bottom-4 -left-4"
            animate={{ rotate: -360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-10 h-10 text-yellow-400" />
          </motion.div>
        </motion.div>

        {/* Nome do time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <h2 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold via-yellow-300 to-gold mb-4">
            {team.name}
          </h2>
        </motion.div>

        {/* Divisor decorativo */}
        <motion.div
          className="flex items-center justify-center gap-4 mb-6"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent to-gold" />
          <Sparkles className="w-6 h-6 text-gold" />
          <div className="w-24 h-0.5 bg-gradient-to-l from-transparent to-gold" />
        </motion.div>

        {/* Grupo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
        >
          <p className="text-2xl text-muted mb-2">Sorteado para o</p>
          <p className="text-5xl font-bold text-paper">{group}</p>
        </motion.div>

        {/* Pote (se aplicável) */}
        {team.pot !== undefined && (
          <motion.div
            className="mt-6 inline-block px-6 py-3 rounded-full bg-navy/80 border-2 border-gold"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.4, duration: 0.5 }}
          >
            <span className="text-xl text-gold font-bold">Pote {team.pot}</span>
          </motion.div>
        )}

        {/* Raios de luz */}
        <motion.div
          className="absolute inset-0 -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.5 }}
        >
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 w-2 h-64 bg-gradient-to-t from-gold/0 via-gold/40 to-gold/0 origin-bottom"
              style={{
                transform: `rotate(${i * 45}deg) translateY(-50%)`,
              }}
            />
          ))}
        </motion.div>
      </div>

      {/* Contador */}
      <motion.div
        className="absolute bottom-8 right-8 text-muted text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        Continuando em 2s...
      </motion.div>
    </motion.div>
  );
}

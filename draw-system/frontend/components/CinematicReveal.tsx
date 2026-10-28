'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';

interface Team {
  id: string;
  name: string;
  logo?: string;
  pot?: number;
}

interface CinematicRevealProps {
  team: Team;
  group: string;
  onComplete: () => void;
}

export default function CinematicReveal({ team, group, onComplete }: CinematicRevealProps) {
  useEffect(() => {
    // Som de revelação
    const audio = new Audio();
    // audio.src = '/sounds/reveal.mp3';
    if (audio.src) {
      audio.play().catch(() => {});
    }

    // Auto-close após 4 segundos
    const timer = setTimeout(() => {
      onComplete();
    }, 4000);

    return () => {
      clearTimeout(timer);
      audio.pause();
    };
  }, [onComplete]);

  return (
    <motion.div
      className="reveal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Background dim */}
      <div className="absolute inset-0 bg-black/95" />

      {/* Scan lines */}
      <div className="scan-lines opacity-20" />

      {/* Lighting effect */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-electric/10 blur-3xl"
        animate={{
          scale: [0.8, 1.2, 1],
          opacity: [0.3, 0.6, 0.4],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Badge superior */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8 rounded-full border border-electric/30 bg-electric/10 px-6 py-2 font-display text-sm font-bold uppercase tracking-widest text-electric"
        >
          TEAM DRAWN
        </motion.div>

        {/* Logo do time */}
        <motion.div
          className="relative mb-8"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            delay: 0.4,
            duration: 0.8,
            type: 'spring',
            stiffness: 150,
          }}
        >
          {/* Glow atrás */}
          <motion.div
            className="absolute inset-0 -m-16 rounded-full bg-gold/40 blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />

          {/* Logo */}
          <div className="relative z-10 h-48 w-48">
            {team.logo ? (
              <img
                src={team.logo}
                alt={team.name}
                className="h-full w-full object-contain drop-shadow-2xl"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div
              className={`absolute inset-0 flex items-center justify-center rounded-full border-4 border-gold bg-gradient-to-br from-gold/20 to-gold/5 text-7xl font-bold text-gold shadow-glow-gold ${
                team.logo ? 'hidden' : ''
              }`}
            >
              {team.name.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Círculos concêntricos */}
          {[1, 2, 3].map((ring) => (
            <motion.div
              key={ring}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold/30"
              initial={{ width: 0, height: 0, opacity: 0 }}
              animate={{
                width: ring * 300,
                height: ring * 300,
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 2,
                delay: 0.6 + ring * 0.2,
                repeat: Infinity,
                repeatDelay: 1,
              }}
            />
          ))}
        </motion.div>

        {/* Nome do time */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mb-6 text-display-lg text-gradient-gold"
        >
          {team.name}
        </motion.h2>

        {/* Divisor */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="mb-6 h-px w-64 bg-gradient-to-r from-transparent via-gold to-transparent"
        />

        {/* Grupo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.5 }}
        >
          <p className="mb-2 font-display text-lg uppercase tracking-wider text-text-secondary">
            Drawn to
          </p>
          <p className="text-display-md text-text-primary">{group}</p>
        </motion.div>

        {/* Pot badge */}
        {team.pot !== undefined && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.7, duration: 0.5, type: 'spring' }}
            className="mt-6 rounded-full border-2 border-gold bg-gold/20 px-6 py-2 font-display text-sm font-bold uppercase tracking-widest text-gold"
          >
            POT {team.pot}
          </motion.div>
        )}

        {/* Raios de luz */}
        <div className="absolute inset-0 -z-10">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2 h-64 w-1 origin-bottom bg-gradient-to-t from-gold/0 via-gold/30 to-gold/0"
              style={{
                transform: `rotate(${i * 30}deg) translateY(-50%)`,
              }}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scaleY: [0, 1, 0],
              }}
              transition={{
                duration: 1.5,
                delay: 1 + i * 0.05,
                repeat: Infinity,
                repeatDelay: 2,
              }}
            />
          ))}
        </div>
      </div>

      {/* Countdown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute bottom-8 right-8 text-sm text-text-secondary"
      >
        Continuing in 2s...
      </motion.div>
    </motion.div>
  );
}

'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

function seeded(i: number) {
  const x = Math.sin(i * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

export default function Background({ variant }: { variant: 'home' | 'loadout' | 'gunsmith' }) {
  const embers = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: `ember-${i}`,
        left: seeded(i) * 100,
        size: 2 + seeded(i + 100) * 4,
        dur: 7 + seeded(i + 200) * 9,
        delay: seeded(i + 300) * 8,
        drift: (seeded(i + 400) - 0.5) * 120,
      })),
    [],
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* photographic backdrop w/ Ken Burns */}
      <motion.div
        className="absolute -inset-10 bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/bg.jpg)' }}
        animate={{
          scale: [1.05, 1.15, 1.05],
          x: [0, -20, 0],
          opacity: variant === 'home' ? 0.85 : 0.35,
          filter: variant === 'home' ? 'blur(0px) saturate(1)' : 'blur(6px) saturate(0.6)',
        }}
        transition={{
          scale: { duration: 30, repeat: Infinity, ease: 'easeInOut' },
          x: { duration: 30, repeat: Infinity, ease: 'easeInOut' },
          opacity: { duration: 0.6 },
          filter: { duration: 0.6 },
        }}
      />

      {/* tactical grid for sub panels */}
      <motion.div
        className="grid-bg absolute inset-0"
        animate={{ opacity: variant === 'home' ? 0.15 : 0.6, backgroundPositionY: ['0px', '40px'] }}
        transition={{
          opacity: { duration: 0.5 },
          backgroundPositionY: { duration: 4, repeat: Infinity, ease: 'linear' },
        }}
      />

      {/* orange pulsing glow */}
      <motion.div
        className="absolute left-1/2 top-[55%] h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(245,138,7,0.35) 0%, rgba(245,138,7,0.08) 40%, transparent 70%)',
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* light sweep */}
      <motion.div
        className="absolute -top-1/2 h-[200%] w-40 rotate-[20deg] bg-gradient-to-r from-transparent via-cod-400/10 to-transparent blur-xl"
        animate={{ left: ['-20%', '120%'] }}
        transition={{ duration: 9, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
      />

      {/* embers */}
      {embers.map((e) => (
        <motion.span
          key={e.id}
          className="absolute bottom-[-10px] rounded-full bg-cod-400"
          style={{
            left: `${e.left}%`,
            width: e.size,
            height: e.size,
            boxShadow: '0 0 8px 2px rgba(255,165,31,0.7)',
          }}
          animate={{ y: [0, -800], x: [0, e.drift], opacity: [0, 1, 0] }}
          transition={{ duration: e.dur, delay: e.delay, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}

      {/* vignette + scanlines */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.85)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/85 to-transparent" />
      <div className="scanlines absolute inset-0" />
    </div>
  )
}

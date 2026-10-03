'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import {
  ATTACHMENT_SLOTS,
  ATTACHMENTS,
  type ClassLoadout,
  computeStats,
  MAX_ATTACHMENTS,
  type SlotKey,
  STAT_LABELS,
  type StatKey,
  WEAPONS,
} from '@/lib/data'
import { Icon, SteelButton } from './ui'

type Props = {
  cls: ClassLoadout
  update: (patch: Partial<ClassLoadout>) => void
}

const ANCHORS: Record<SlotKey, { x: number; y: number }> = {
  optic: { x: 46, y: 40 },
  barrel: { x: 64, y: 46 },
  muzzle: { x: 79, y: 47 },
  laser: { x: 67, y: 52 },
  underbarrel: { x: 60, y: 56 },
  ammo: { x: 48, y: 58 },
  grip: { x: 40, y: 58 },
  stock: { x: 22, y: 50 },
  perk: { x: 36, y: 46 },
}

export default function GunsmithPanel({ cls, update }: Props) {
  const [slot, setSlot] = useState<SlotKey>('muzzle')
  const [hover, setHover] = useState<string | null>(null)
  const [warn, setWarn] = useState(false)
  const weapon = WEAPONS.find((w) => w.id === cls.primary) ?? WEAPONS[0]
  const count = Object.values(cls.attachments).filter(Boolean).length

  useEffect(() => {
    if (!warn) return
    const t = setTimeout(() => setWarn(false), 1800)
    return () => clearTimeout(t)
  }, [warn])

  const current = useMemo(() => computeStats(cls), [cls])
  const preview = useMemo(() => {
    if (!hover) return null
    return computeStats({ ...cls, attachments: { ...cls.attachments, [slot]: hover } }).final
  }, [hover, cls, slot])

  const equip = (id: string) => {
    const has = cls.attachments[slot]
    if (has === id) {
      const next = { ...cls.attachments }
      delete next[slot]
      update({ attachments: next })
      return
    }
    if (!has && count >= MAX_ATTACHMENTS) {
      setWarn(true)
      return
    }
    update({ attachments: { ...cls.attachments, [slot]: id } })
  }

  const slotMeta = ATTACHMENT_SLOTS.find((s) => s.key === slot) ?? ATTACHMENT_SLOTS[0]

  return (
    <div className="absolute inset-0 px-6 pb-6 pt-[84px]">
      <div className="flex h-full gap-4">
        {/* Weapon list */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="flex w-[190px] shrink-0 flex-col gap-1.5"
        >
          <div className="text-[11px] font-bold tracking-[0.3em] text-steel-400">WEAPON</div>
          {WEAPONS.map((w) => {
            const active = w.id === cls.primary
            return (
              <motion.button
                key={w.id}
                whileHover={{ x: active ? 0 : 4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => !active && update({ primary: w.id, attachments: {} })}
                className={`clip-tac-sm relative flex h-[54px] cursor-pointer flex-col justify-center px-3 text-left ${active ? '' : 'steel-btn'}`}
              >
                {active && (
                  <motion.div layoutId="gunSel" className="metal-orange absolute inset-0" />
                )}
                <span
                  className={`relative font-display text-2xl leading-none tracking-wide ${active ? 'text-black' : ''}`}
                >
                  {w.name}
                </span>
                <span
                  className={`relative text-[10px] font-bold tracking-widest ${active ? 'text-black/70' : 'text-steel-400'}`}
                >
                  {w.type}
                </span>
              </motion.button>
            )
          })}
          <div className="steel-panel clip-tac-sm mt-auto p-3">
            <div className="text-[10px] font-bold tracking-[0.3em] text-steel-400">CAMO</div>
            <div className="mt-2 flex gap-1.5">
              {['#f58a07', '#3a3f46', '#6b7d4f', '#b8a07a', '#1f6fd1'].map((c, i) => (
                <motion.div
                  whileHover={{ scale: 1.15 }}
                  key={c}
                  className={`h-6 w-6 cursor-pointer rounded-sm ${i === 1 ? 'ring-2 ring-cod-400' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Weapon view */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          className="relative min-w-0 flex-1"
        >
          <div className="absolute left-0 top-0 z-10">
            <div className="text-[10px] font-bold tracking-[0.3em] text-cod-400">
              GUNSMITH · {cls.name}
            </div>
            <div className="font-display text-6xl leading-[0.85] tracking-wide glow-text">
              {weapon.name}
            </div>
            <div className="text-xs font-bold tracking-widest text-steel-400">
              {weapon.type} · LV {weapon.level}
            </div>
          </div>
          <div className="absolute right-0 top-0 z-10 text-right">
            <div className="text-[10px] font-bold tracking-[0.3em] text-steel-400">ATTACHMENTS</div>
            <div className="flex justify-end gap-1 pt-1">
              {Array.from({ length: MAX_ATTACHMENTS }, (_, slotNo) => slotNo).map((slotNo) => (
                <motion.div
                  key={`pip-${slotNo}`}
                  animate={{
                    backgroundColor: slotNo < count ? '#f58a07' : '#2a2e34',
                    boxShadow: slotNo < count ? '0 0 8px #f58a07' : 'none',
                  }}
                  className="h-2.5 w-6 skew-x-[-20deg]"
                />
              ))}
            </div>
            <motion.div
              key={count}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="font-display text-3xl leading-none"
            >
              <span className="text-cod-400">{count}</span>/{MAX_ATTACHMENTS}
            </motion.div>
          </div>

          {/* rotating reticle ring */}
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-cod-500/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />

          <AnimatePresence mode="wait">
            {/* biome-ignore lint/performance/noImgElement: framer-motion の motion.img でアニメーションするため next/image は利用不可(mix-blend-screen 合成) */}
            <motion.img
              key={weapon.id}
              src="/images/rifle.png"
              alt={weapon.name}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.35 }}
              className="pointer-events-none absolute left-[10%] top-[22%] w-[80%] mix-blend-screen"
              draggable={false}
            />
          </AnimatePresence>

          {/* connector lines */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {ATTACHMENT_SLOTS.map((s) => {
              const a = ANCHORS[s.key]
              const active = s.key === slot
              const filled = !!cls.attachments[s.key]
              return (
                <line
                  key={s.key}
                  x1={s.pos.x + 5}
                  y1={s.pos.y + 5}
                  x2={a.x}
                  y2={a.y}
                  stroke={
                    active ? '#ffa51f' : filled ? 'rgba(245,138,7,0.5)' : 'rgba(255,255,255,0.15)'
                  }
                  strokeWidth={active ? 1.5 : 1}
                  strokeDasharray={filled || active ? '0' : '3 3'}
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
          </svg>
          {ATTACHMENT_SLOTS.map((s) => {
            const a = ANCHORS[s.key]
            return (
              <motion.span
                key={`dot-${s.key}`}
                className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cod-400"
                style={{ left: `${a.x}%`, top: `${a.y}%` }}
                animate={{
                  scale: s.key === slot ? [1, 1.8, 1] : 1,
                  opacity: s.key === slot || cls.attachments[s.key] ? 1 : 0.3,
                }}
                transition={{ duration: 1.2, repeat: s.key === slot ? Infinity : 0 }}
              />
            )
          })}

          {/* slot nodes */}
          {ATTACHMENT_SLOTS.map((s) => {
            const active = s.key === slot
            const att = ATTACHMENTS[s.key].find((x) => x.id === cls.attachments[s.key])
            return (
              <motion.button
                key={s.key}
                onClick={() => setSlot(s.key)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                className={`clip-tac-sm absolute flex w-[10%] min-w-[92px] cursor-pointer flex-col items-center justify-center gap-0.5 py-1.5 ${active ? 'metal-orange' : att ? 'steel-btn ring-1 ring-cod-500/60' : 'steel-btn'}`}
                style={{ left: `${s.pos.x}%`, top: `${s.pos.y}%` }}
              >
                <Icon
                  name={s.icon}
                  size={20}
                  className={active ? 'text-black' : att ? 'text-cod-400' : 'text-steel-400'}
                />
                <span
                  className={`text-[10px] font-bold tracking-widest ${active ? 'text-black' : 'text-steel-300'}`}
                >
                  {s.label}
                </span>
                <span
                  className={`max-w-full truncate px-1 text-[9px] font-semibold ${active ? 'text-black/70' : att ? 'text-white' : 'text-steel-500'}`}
                >
                  {att ? att.name : 'EMPTY'}
                </span>
              </motion.button>
            )
          })}

          <AnimatePresence>
            {warn && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-[26%] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 border border-red-500/60 bg-red-950/90 px-4 py-2 text-sm font-bold tracking-wider text-red-200"
              >
                <Icon name="warning" size={18} /> MAX {MAX_ATTACHMENTS} ATTACHMENTS — REMOVE ONE
                FIRST
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right column */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          className="flex w-[300px] shrink-0 flex-col gap-3"
        >
          <div className="steel-panel clip-tac flex min-h-0 flex-1 flex-col p-3">
            <div className="mb-2 flex items-center gap-2">
              <Icon name={slotMeta.icon} size={22} className="text-cod-400" />
              <div className="font-display text-3xl leading-none tracking-wide">
                {slotMeta.label}
              </div>
              {cls.attachments[slot] && (
                <SteelButton
                  onClick={() => {
                    const next = { ...cls.attachments }
                    delete next[slot]
                    update({ attachments: next })
                  }}
                  className="ml-auto flex h-7 items-center gap-1 px-2 text-[10px] font-bold tracking-wider text-red-300"
                >
                  <Icon name="delete" size={14} /> REMOVE
                </SteelButton>
              )}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={slot}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="no-scrollbar flex flex-col gap-1.5 overflow-y-auto"
              >
                {ATTACHMENTS[slot].map((a) => {
                  const active = cls.attachments[slot] === a.id
                  return (
                    <motion.button
                      key={a.id}
                      onMouseEnter={() => setHover(a.id)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => equip(a.id)}
                      whileHover={{ x: -3 }}
                      whileTap={{ scale: 0.97 }}
                      className={`clip-tac-sm cursor-pointer px-3 py-2 text-left ${active ? 'metal-orange' : 'steel-btn'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-xl leading-none tracking-wide">
                          {a.name}
                        </span>
                        {active && <Icon name="check_circle" size={18} />}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] font-bold">
                        {(Object.keys(a.mods) as StatKey[]).map((k) => {
                          const v = a.mods[k] ?? 0
                          return (
                            <span
                              key={k}
                              className={
                                active ? 'text-black/70' : v > 0 ? 'text-green-400' : 'text-red-400'
                              }
                            >
                              {v > 0 ? '▲' : '▼'} {STAT_LABELS[k]}
                            </span>
                          )
                        })}
                      </div>
                    </motion.button>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="steel-panel clip-tac p-3">
            <div className="mb-2 text-[10px] font-bold tracking-[0.3em] text-steel-400">
              WEAPON STATS
            </div>
            <div className="flex flex-col gap-1.5">
              {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => {
                const base = current.base[k]
                const now = current.final[k]
                const pv = preview ? preview[k] : now
                const delta = pv - base
                return (
                  <div key={k} className="grid grid-cols-[76px_1fr_34px] items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wider text-steel-300">
                      {STAT_LABELS[k]}
                    </span>
                    <div className="relative h-2 overflow-hidden bg-steel-700">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-steel-300"
                        animate={{ width: `${Math.min(base, pv)}%` }}
                      />
                      {pv > base && (
                        <motion.div
                          className="absolute inset-y-0 bg-green-400"
                          animate={{ left: `${base}%`, width: `${pv - base}%` }}
                        />
                      )}
                      {pv < base && (
                        <motion.div
                          className="absolute inset-y-0 bg-red-500"
                          animate={{ left: `${pv}%`, width: `${base - pv}%` }}
                        />
                      )}
                    </div>
                    <span
                      className={`text-right font-display text-lg leading-none ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-white'}`}
                    >
                      {pv}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

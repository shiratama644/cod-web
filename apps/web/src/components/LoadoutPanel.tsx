'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import {
  ATTACHMENTS,
  type ClassLoadout,
  LETHALS,
  OPERATOR_SKILLS,
  PERKS_BLUE,
  PERKS_GREEN,
  PERKS_RED,
  SECONDARIES,
  type SlotKey,
  TACTICALS,
  WEAPONS,
} from '@/lib/data'
import { Icon, OrangeButton, SteelButton } from './ui'

type Props = {
  classes: ClassLoadout[]
  selected: number
  setSelected: (i: number) => void
  equipped: number
  setEquipped: (i: number) => void
  update: (i: number, patch: Partial<ClassLoadout>) => void
  onGunsmith: () => void
}

type Picker = {
  title: string
  options: string[]
  labels?: string[]
  current: string
  onPick: (v: string) => void
} | null

export default function LoadoutPanel({
  classes,
  selected,
  setSelected,
  equipped,
  setEquipped,
  update,
  onGunsmith,
}: Props) {
  const c = classes[selected]
  const weapon = WEAPONS.find((w) => w.id === c.primary) ?? WEAPONS[0]
  const [picker, setPicker] = useState<Picker>(null)
  const attCount = Object.values(c.attachments).filter(Boolean).length

  const setPerk = (idx: 0 | 1 | 2, v: string) => {
    const perks = [...c.perks] as [string, string, string]
    perks[idx] = v
    update(selected, { perks })
  }

  return (
    <div className="absolute inset-0 px-6 pb-6 pt-[84px]">
      <div className="flex h-full gap-4">
        {/* Class list */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="flex w-[220px] shrink-0 flex-col gap-2"
        >
          <div className="text-[11px] font-bold tracking-[0.3em] text-steel-400">
            CLASSES · MULTIPLAYER
          </div>
          <div className="no-scrollbar flex flex-1 flex-col gap-1.5 overflow-y-auto">
            {classes.map((cl, i) => {
              const active = i === selected
              return (
                <motion.button
                  // biome-ignore lint/suspicious/noArrayIndexKey: クラススロットは固定長・並べ替え不可で、index がそのままスロット番号(恒久 ID)
                  key={i}
                  onClick={() => setSelected(i)}
                  whileHover={{ x: active ? 0 : 4 }}
                  whileTap={{ scale: 0.97 }}
                  className={`clip-tac-sm relative flex h-[52px] cursor-pointer items-center gap-3 px-3 text-left ${active ? '' : 'steel-btn'}`}
                >
                  {active && (
                    <motion.div
                      layoutId="classSel"
                      className="metal-orange absolute inset-0"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span
                    className={`relative font-display text-2xl leading-none ${active ? 'text-black/60' : 'text-steel-500'}`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="relative min-w-0 flex-1">
                    <div
                      className={`font-display text-xl leading-none tracking-wide ${active ? 'text-black' : ''}`}
                    >
                      {cl.name}
                    </div>
                    <div
                      className={`truncate text-[10px] font-bold tracking-wider ${active ? 'text-black/70' : 'text-steel-400'}`}
                    >
                      {WEAPONS.find((w) => w.id === cl.primary)?.name} · {cl.secondary}
                    </div>
                  </div>
                  {equipped === i && (
                    <span
                      className={`relative flex h-5 w-5 items-center justify-center rounded-full ${active ? 'bg-black text-cod-400' : 'bg-cod-500 text-black'}`}
                    >
                      <Icon name="check" size={14} />
                    </span>
                  )}
                </motion.button>
              )
            })}
            {[0, 1, 2].map((i) => (
              <div
                key={`l${i}`}
                className="steel-btn clip-tac-sm flex h-[52px] items-center gap-3 px-3 opacity-40"
              >
                <span className="font-display text-2xl text-steel-500">
                  {String(classes.length + i + 1).padStart(2, '0')}
                </span>
                <Icon name="lock" size={18} className="text-steel-400" />
                <span className="text-xs font-bold tracking-widest text-steel-400">
                  UNLOCK AT LV {60 + i * 20}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Center: weapons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 }}
          className="flex min-w-0 flex-1 flex-col gap-3"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={selected + c.primary}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="steel-panel clip-tac relative flex-1 overflow-hidden p-4"
            >
              <div className="grid-bg absolute inset-0 opacity-40" />
              <div className="absolute inset-y-0 left-0 w-1 bg-cod-500 shadow-[0_0_10px_#f58a07]" />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-bold tracking-[0.3em] text-cod-400">
                    PRIMARY WEAPON
                  </div>
                  <div className="font-display text-5xl leading-[0.9] tracking-wide emboss-text">
                    {weapon.name}
                  </div>
                  <div className="text-xs font-bold tracking-widest text-steel-400">
                    {weapon.type} · LV {weapon.level}
                  </div>
                </div>
                <div className="flex gap-2">
                  <SteelButton
                    onClick={() =>
                      setPicker({
                        title: 'PRIMARY WEAPON',
                        options: WEAPONS.map((w) => w.id),
                        labels: WEAPONS.map((w) => `${w.name} — ${w.type}`),
                        current: c.primary,
                        onPick: (v) => update(selected, { primary: v, attachments: {} }),
                      })
                    }
                    className="flex h-10 items-center gap-1.5 px-3 text-sm font-bold tracking-wider"
                  >
                    <Icon name="swap_horiz" size={18} className="text-cod-400" /> SWAP
                  </SteelButton>
                  <OrangeButton
                    onClick={onGunsmith}
                    className="flex h-10 items-center gap-1.5 px-4 font-display text-xl tracking-wider"
                  >
                    <Icon name="construction" size={18} className="relative" />
                    <span className="relative">GUNSMITH</span>
                  </OrangeButton>
                </div>
              </div>
              {/* biome-ignore lint/performance/noImgElement: framer-motion の motion.img でアニメーションするため next/image は利用不可(mix-blend-screen 合成) */}
              <motion.img
                src="/images/rifle.png"
                alt={weapon.name}
                className="pointer-events-none absolute left-1/2 top-[56%] w-[78%] max-w-[640px] -translate-x-1/2 -translate-y-1/2 mix-blend-screen"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                draggable={false}
              />
              <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
                {(Object.keys(ATTACHMENTS) as SlotKey[]).map((k) => {
                  const a = ATTACHMENTS[k].find((x) => x.id === c.attachments[k])
                  return (
                    <div
                      key={k}
                      title={a?.name ?? k}
                      className={`clip-tac-sm flex h-8 w-8 items-center justify-center ${a ? 'bg-cod-500/90 text-black' : 'bg-steel-700/80 text-steel-500'}`}
                    >
                      <Icon name={a ? 'check' : 'add'} size={16} />
                    </div>
                  )
                })}
                <span className="ml-2 font-display text-xl tracking-wide text-steel-300">
                  ATTACHMENTS <span className="text-cod-400">{attCount}</span>/5
                </span>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="grid h-[118px] grid-cols-4 gap-3">
            <ItemCard
              label="SECONDARY"
              value={c.secondary}
              icon="swords"
              onClick={() =>
                setPicker({
                  title: 'SECONDARY',
                  options: SECONDARIES,
                  current: c.secondary,
                  onPick: (v) => update(selected, { secondary: v }),
                })
              }
            />
            <ItemCard
              label="LETHAL"
              value={c.lethal}
              icon="bomb"
              onClick={() =>
                setPicker({
                  title: 'LETHAL',
                  options: LETHALS,
                  current: c.lethal,
                  onPick: (v) => update(selected, { lethal: v }),
                })
              }
            />
            <ItemCard
              label="TACTICAL"
              value={c.tactical}
              icon="flare"
              onClick={() =>
                setPicker({
                  title: 'TACTICAL',
                  options: TACTICALS,
                  current: c.tactical,
                  onPick: (v) => update(selected, { tactical: v }),
                })
              }
            />
            <ItemCard
              label="OPERATOR SKILL"
              value={c.skill}
              icon="electric_bolt"
              accent
              onClick={() =>
                setPicker({
                  title: 'OPERATOR SKILL',
                  options: OPERATOR_SKILLS,
                  current: c.skill,
                  onPick: (v) => update(selected, { skill: v }),
                })
              }
            />
          </div>
        </motion.div>

        {/* Right: perks */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ delay: 0.1 }}
          className="flex w-[240px] shrink-0 flex-col gap-2"
        >
          <div className="text-[11px] font-bold tracking-[0.3em] text-steel-400">PERKS</div>
          {(
            [
              { idx: 0, color: '#e5484d', list: PERKS_RED, label: 'RED' },
              { idx: 1, color: '#46a758', list: PERKS_GREEN, label: 'GREEN' },
              { idx: 2, color: '#3e8ef7', list: PERKS_BLUE, label: 'BLUE' },
            ] as const
          ).map((pk) => (
            <motion.button
              key={pk.idx}
              whileHover={{ x: -4, filter: 'brightness(1.2)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() =>
                setPicker({
                  title: `${pk.label} PERK`,
                  options: [...pk.list],
                  current: c.perks[pk.idx],
                  onPick: (v) => setPerk(pk.idx, v),
                })
              }
              className="steel-panel clip-tac-sm flex h-[68px] cursor-pointer items-center gap-3 px-3 text-left"
            >
              <div
                className="flex h-11 w-11 shrink-0 rotate-45 items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${pk.color}, #111)`,
                  boxShadow: `0 0 10px ${pk.color}66`,
                }}
              >
                <Icon name="military_tech" size={22} className="-rotate-45" />
              </div>
              <div className="min-w-0">
                <div
                  className="text-[10px] font-bold tracking-[0.25em]"
                  style={{ color: pk.color }}
                >
                  {pk.label} PERK
                </div>
                <div className="truncate font-display text-2xl leading-none tracking-wide">
                  {c.perks[pk.idx]}
                </div>
              </div>
            </motion.button>
          ))}

          <div className="steel-panel clip-tac-sm mt-1 flex-1 p-3">
            <div className="flex items-center justify-between text-[10px] font-bold tracking-[0.3em] text-steel-400">
              CLASS NAME <Icon name="edit" size={14} className="text-cod-400" />
            </div>
            <input
              value={c.name}
              maxLength={14}
              onChange={(e) => update(selected, { name: e.target.value.toUpperCase() })}
              className="mt-1 w-full border-b border-white/10 bg-transparent font-display text-3xl tracking-wide outline-none focus:border-cod-500"
            />
          </div>

          <OrangeButton
            onClick={() => setEquipped(selected)}
            disabled={equipped === selected}
            className={`flex h-14 items-center justify-center gap-2 font-display text-3xl tracking-[0.12em] ${equipped === selected ? 'grayscale-[0.6]' : ''}`}
          >
            <Icon
              name={equipped === selected ? 'task_alt' : 'check_circle'}
              size={24}
              className="relative"
            />
            <span className="relative">{equipped === selected ? 'EQUIPPED' : 'EQUIP'}</span>
          </OrangeButton>
        </motion.div>
      </div>

      <PickerModal picker={picker} close={() => setPicker(null)} />
    </div>
  )
}

function ItemCard({
  label,
  value,
  icon,
  onClick,
  accent,
}: {
  label: string
  value: string
  icon: string
  onClick: () => void
  accent?: boolean
}) {
  return (
    <motion.button
      whileHover={{ y: -3, filter: 'brightness(1.2)' }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="steel-panel clip-tac-sm group relative flex cursor-pointer flex-col justify-between overflow-hidden p-3 text-left"
    >
      <Icon
        name={icon}
        size={64}
        className={`absolute -bottom-2 -right-1 ${accent ? 'text-cod-500/25' : 'text-white/5'} transition group-hover:scale-110`}
      />
      <div
        className={`text-[10px] font-bold tracking-[0.25em] ${accent ? 'text-cod-400' : 'text-steel-400'}`}
      >
        {label}
      </div>
      <div className="relative font-display text-2xl leading-none tracking-wide">{value}</div>
      <div className="absolute inset-x-0 bottom-0 h-0.5 scale-x-0 bg-cod-500 transition group-hover:scale-x-100" />
    </motion.button>
  )
}

function PickerModal({ picker, close }: { picker: Picker; close: () => void }) {
  return (
    <AnimatePresence>
      {picker && (
        <motion.div
          className="absolute inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ x: 380 }}
            animate={{ x: 0 }}
            exit={{ x: 380 }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="steel-panel flex h-full w-[360px] flex-col gap-2 p-5 pt-[84px]"
          >
            <div className="flex items-center justify-between">
              <div className="font-display text-3xl tracking-wider emboss-text">{picker.title}</div>
              <SteelButton
                onClick={close}
                className="flex h-9 w-9 items-center justify-center"
                aria-label="Close"
              >
                <Icon name="close" size={20} />
              </SteelButton>
            </div>
            <div className="no-scrollbar flex flex-col gap-1.5 overflow-y-auto">
              {picker.options.map((o, i) => {
                const active = o === picker.current
                return (
                  <motion.button
                    key={o}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ x: -4 }}
                    onClick={() => {
                      picker.onPick(o)
                      close()
                    }}
                    className={`clip-tac-sm flex h-12 cursor-pointer items-center justify-between px-4 text-left font-display text-2xl tracking-wide ${active ? 'metal-orange' : 'steel-btn'}`}
                  >
                    {picker.labels?.[i] ?? o}
                    {active && <Icon name="check" size={20} />}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Icon, SteelButton } from './ui'

export default function TopBar({ title, onBack }: { title?: string; onBack?: () => void }) {
  return (
    <div className="absolute inset-x-0 top-0 z-30 flex h-[72px] items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <AnimatePresence mode="popLayout">
          {onBack ? (
            <motion.div
              key="back"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="flex items-center gap-4"
            >
              <SteelButton
                onClick={onBack}
                className="flex h-11 w-14 items-center justify-center text-cod-400"
                aria-label="Back"
              >
                <Icon name="arrow_back_ios_new" size={22} />
              </SteelButton>
              <div className="font-display text-4xl leading-none tracking-wider emboss-text">
                {title}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="flex items-center gap-3"
            >
              <div className="relative">
                <div className="clip-tac-sm h-12 w-12 bg-gradient-to-br from-cod-400 to-cod-700 p-[2px]">
                  <div className="clip-tac-sm flex h-full w-full items-center justify-center bg-steel-800">
                    <Icon name="person" size={30} className="text-steel-300" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-2 rounded-sm bg-cod-500 px-1 font-display text-sm leading-tight text-black">
                  150
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-2xl leading-none tracking-wide">
                    GHOST_ランナー
                  </span>
                  <Icon name="verified" size={16} className="text-cod-400" />
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 w-32 overflow-hidden rounded-full bg-steel-700">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cod-600 to-cod-300"
                      initial={{ width: 0 }}
                      animate={{ width: '68%' }}
                      transition={{ duration: 1.2, delay: 0.3 }}
                    />
                  </div>
                  <span className="text-[10px] font-bold tracking-widest text-steel-400">
                    LEGENDARY
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2">
        <Currency icon="toll" color="text-cod-300" value="2,480" label="COD POINTS" />
        <Currency icon="paid" color="text-yellow-300" value="184,200" label="CREDITS" />
        <div className="mx-1 h-8 w-px bg-white/10" />
        {[{ i: 'mail', badge: 3 }, { i: 'group_add', badge: 1 }, { i: 'settings' }].map((b) => (
          <SteelButton
            key={b.i}
            className="flex h-10 w-10 items-center justify-center text-steel-300"
            aria-label={b.i}
          >
            <Icon name={b.i} size={22} />
            {b.badge && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {b.badge}
              </span>
            )}
          </SteelButton>
        ))}
        <div className="ml-2 flex items-center gap-1 text-[11px] font-bold text-steel-400">
          <Icon name="signal_cellular_alt" size={16} className="text-green-400" />
          32ms
          <Icon name="battery_5_bar" size={16} className="ml-1 rotate-90 text-steel-300" />
        </div>
      </div>
    </div>
  )
}

function Currency({
  icon,
  value,
  color,
  label,
}: {
  icon: string
  value: string
  color: string
  label: string
}) {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="steel-panel clip-slant flex h-9 items-center gap-2 pl-5 pr-3"
      title={label}
    >
      <Icon name={icon} size={18} className={color} />
      <span className="font-display text-xl leading-none tracking-wide">{value}</span>
      <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-cod-500 text-black">
        <Icon name="add" size={16} />
      </span>
    </motion.div>
  )
}

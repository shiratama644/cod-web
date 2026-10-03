'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { type ReactNode, useEffect, useState } from 'react'
import { Icon, SteelButton } from './ui'

/* ───────────────────────── Toast(依存なしのミニストア) ───────────────────────── */

export type ToastKind = 'info' | 'success' | 'warn' | 'progress'
export type ToastItem = { id: number; kind: ToastKind; title: string; desc?: string }

let nextToastId = 1
let toastList: ToastItem[] = []
const toastSubs = new Set<(list: ToastItem[]) => void>()

function notify() {
  for (const fn of toastSubs) fn([...toastList])
}

/** どこからでも呼べるトースト通知。duration ms 後に自動で消える。 */
export function toast(t: { kind?: ToastKind; title: string; desc?: string; duration?: number }) {
  const item: ToastItem = {
    id: nextToastId++,
    kind: t.kind ?? 'info',
    title: t.title,
    desc: t.desc,
  }
  toastList = [...toastList.slice(-3), item]
  notify()
  const ms = t.duration ?? (t.desc ? 4200 : 3000)
  setTimeout(() => {
    toastList = toastList.filter((x) => x.id !== item.id)
    notify()
  }, ms)
}

const TOAST_META: Record<ToastKind, { icon: string; accent: string }> = {
  info: { icon: 'info', accent: 'text-cod-300' },
  success: { icon: 'check_circle', accent: 'text-green-400' },
  warn: { icon: 'warning', accent: 'text-yellow-300' },
  progress: { icon: 'progress_activity', accent: 'text-cod-300' },
}

/** 画面右下にトーストを積む。Stage 内に 1 つ置く。 */
export function ToastHost() {
  const [list, setList] = useState<ToastItem[]>([])
  useEffect(() => {
    const fn = (l: ToastItem[]) => setList(l)
    toastSubs.add(fn)
    return () => {
      toastSubs.delete(fn)
    }
  }, [])
  return (
    <div className="pointer-events-none absolute bottom-16 right-6 z-[90] flex w-[320px] flex-col items-end gap-2">
      <AnimatePresence>
        {list.map((t) => {
          const meta = TOAST_META[t.kind]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="steel-panel clip-tac-sm pointer-events-auto flex w-full items-start gap-2.5 px-3.5 py-2.5"
            >
              {t.kind === 'progress' ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                  className={`flex ${meta.accent}`}
                >
                  <Icon name={meta.icon} size={20} />
                </motion.span>
              ) : (
                <Icon name={meta.icon} size={20} className={`mt-0.5 shrink-0 ${meta.accent}`} />
              )}
              <div className="min-w-0">
                <div className="text-[13px] font-bold leading-tight tracking-wide text-white">
                  {t.title}
                </div>
                {t.desc && (
                  <div className="mt-0.5 text-[11px] font-semibold leading-snug text-steel-300">
                    {t.desc}
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

/* ───────────────────────── Modal ───────────────────────── */

export function Modal({
  title,
  icon,
  onClose,
  children,
  width = 560,
}: {
  title: string
  icon?: string
  onClose: () => void
  children: ReactNode
  width?: number
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [onClose])

  return (
    <motion.div
      className="absolute inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.94, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="steel-panel clip-tac p-5"
        style={{ width }}
      >
        <div className="mb-4 flex items-center gap-2.5">
          {icon && <Icon name={icon} size={24} className="text-cod-400" />}
          <div className="font-display text-3xl leading-none tracking-wider emboss-text">
            {title}
          </div>
          <SteelButton
            onClick={onClose}
            className="ml-auto flex h-9 w-9 items-center justify-center"
            aria-label="Close"
          >
            <Icon name="close" size={20} />
          </SteelButton>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}

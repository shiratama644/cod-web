'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type ClassLoadout, DEFAULT_CLASSES, MODES, type ModeTab } from '@/lib/data'
import { type SavedLoadouts, sanitizeSaved } from '@/lib/loadout'
import Background from './Background'
import GunsmithPanel from './GunsmithPanel'
import HomePanel from './HomePanel'
import LoadoutPanel from './LoadoutPanel'
import TopBar from './TopBar'
import { Icon, Stage } from './ui'

type Panel = 'home' | 'loadout' | 'gunsmith'

type Saved = SavedLoadouts

export default function MainMenu() {
  const [panel, setPanel] = useState<Panel>('home')
  const [history, setHistory] = useState<Panel[]>([])
  const [modeTab, setModeTab] = useState<ModeTab>('MP')
  const [modeId, setModeId] = useState<string>(MODES.MP[0].id)
  const [classes, setClasses] = useState<ClassLoadout[]>(DEFAULT_CLASSES)
  const [selected, setSelected] = useState(0)
  const [equipped, setEquipped] = useState(0)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const loaded = useRef(false)
  // Snapshot of the last payload known to be persisted — skips redundant echo saves.
  const lastSaved = useRef<string | null>(null)

  // Load persisted loadouts
  useEffect(() => {
    fetch('/api/loadouts')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j: { data: Saved | null }) => {
        if (j.data && Array.isArray(j.data.classes) && j.data.classes.length) {
          const safe = sanitizeSaved(j.data)
          lastSaved.current = JSON.stringify(safe)
          setClasses(safe.classes)
          setEquipped(safe.equipped)
          setSelected(safe.equipped)
        }
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true
      })
  }, [])

  // Debounced save
  useEffect(() => {
    if (!loaded.current) return
    const payload = JSON.stringify({ classes, equipped } satisfies Saved)
    if (payload === lastSaved.current) return
    setSaveState('saving')
    const t = setTimeout(() => {
      fetch('/api/loadouts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: `{"data":${payload}}`,
      })
        .then((r) => {
          if (r.ok) {
            lastSaved.current = payload
            setSaveState('saved')
          } else {
            setSaveState('error')
          }
        })
        .catch(() => setSaveState('error'))
    }, 600)
    return () => clearTimeout(t)
  }, [classes, equipped])

  const go = useCallback(
    (p: Panel) => {
      setHistory((h) => [...h, panel])
      setPanel(p)
    },
    [panel],
  )
  const back = useCallback(() => {
    setHistory((h) => {
      const prev = h[h.length - 1] ?? 'home'
      setPanel(prev)
      return h.slice(0, -1)
    })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panel !== 'home') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel, back])

  const update = (i: number, patch: Partial<ClassLoadout>) =>
    setClasses((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))

  const titles: Record<Panel, string> = { home: '', loadout: 'LOADOUT', gunsmith: 'GUNSMITH' }

  return (
    <>
      <Stage>
        <Background variant={panel} />
        <TopBar title={titles[panel]} onBack={panel === 'home' ? undefined : back} />

        <AnimatePresence mode="wait">
          <motion.div
            key={panel}
            className="absolute inset-0"
            initial={{ opacity: 0, x: panel === 'home' ? -40 : 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: panel === 'home' ? -40 : -60 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {panel === 'home' && (
              <HomePanel
                modeTab={modeTab}
                setModeTab={setModeTab}
                modeId={modeId}
                setModeId={setModeId}
                activeClassName={classes[equipped]?.name ?? '—'}
                onOpenLoadout={() => {
                  setSelected(equipped)
                  go('loadout')
                }}
                onOpenGunsmith={() => {
                  setSelected(equipped)
                  go('gunsmith')
                }}
              />
            )}
            {panel === 'loadout' && (
              <LoadoutPanel
                classes={classes}
                selected={selected}
                setSelected={setSelected}
                equipped={equipped}
                setEquipped={setEquipped}
                update={update}
                onGunsmith={() => go('gunsmith')}
              />
            )}
            {panel === 'gunsmith' && (
              <GunsmithPanel
                cls={classes[selected] ?? classes[0]}
                update={(p) => update(selected, p)}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Panel transition wipe */}
        <AnimatePresence>
          <motion.div
            key={`wipe-${panel}`}
            className="pointer-events-none absolute inset-y-0 z-50 w-[140px] skew-x-[-16deg] bg-gradient-to-r from-transparent via-cod-500/40 to-transparent"
            initial={{ left: '-20%' }}
            animate={{ left: '120%' }}
            transition={{ duration: 0.55, ease: 'easeInOut' }}
          />
        </AnimatePresence>

        {/* Save indicator + breadcrumb */}
        {panel !== 'home' && (
          <div className="absolute bottom-1.5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 text-[10px] font-bold tracking-[0.25em] text-steel-500">
            <span>HOME</span>
            {[...history.slice(1), panel].map((h, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: パンくずは状態を持たない表示専用で、同名パネルの重複があり得るため index を併用
              <span key={`${i}-${h}`} className="flex items-center gap-3">
                <Icon name="chevron_right" size={12} />{' '}
                <span className={h === panel ? 'text-cod-400' : ''}>{h.toUpperCase()}</span>
              </span>
            ))}
            <span className="ml-3 flex items-center gap-1">
              <Icon
                name={
                  saveState === 'saving'
                    ? 'cloud_sync'
                    : saveState === 'error'
                      ? 'cloud_off'
                      : 'cloud_done'
                }
                size={14}
                className={
                  saveState === 'saving'
                    ? 'text-cod-400'
                    : saveState === 'error'
                      ? 'text-red-400'
                      : 'text-green-500'
                }
              />
              {saveState === 'saving' ? 'SYNCING' : saveState === 'error' ? 'SYNC FAILED' : 'SAVED'}
            </span>
            <span className="text-steel-600">ESC · BACK</span>
          </div>
        )}
      </Stage>

      {/* Portrait lock */}
      <div className="rotate-overlay fixed inset-0 z-[100] flex-col items-center justify-center gap-6 bg-steel-950 p-8 text-center">
        <motion.div
          animate={{ rotate: [0, -90, -90, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.4, 0.7, 1] }}
          className="text-cod-400"
        >
          <Icon name="screen_rotation" size={80} />
        </motion.div>
        <div className="font-display text-4xl tracking-wider glow-text">ROTATE YOUR DEVICE</div>
        <div className="max-w-xs text-sm text-steel-400">
          このゲームは横画面（ランドスケープ）専用です。端末を横向きにしてください。
        </div>
      </div>
    </>
  )
}

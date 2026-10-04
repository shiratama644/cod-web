'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type ClassLoadout, DEFAULT_CLASSES, MODES, type ModeTab } from '@/lib/data'
import { type SavedLoadouts, sanitizeSaved } from '@/lib/loadout'
import { loadLoadouts, saveLoadouts } from '@/lib/loadout-store'
import Background from './Background'
import { Modal, ToastHost, toast } from './feedback'
import GunsmithPanel from './GunsmithPanel'
import HomePanel from './HomePanel'
import LoadoutPanel from './LoadoutPanel'
import PlaceholderPanel, { PLACEHOLDER_PAGES, type PlaceholderKey } from './PlaceholderPanel'
import TopBar from './TopBar'
import { Icon, OrangeButton, Stage, SteelButton } from './ui'

type Panel = 'home' | 'loadout' | 'gunsmith' | PlaceholderKey

type Saved = SavedLoadouts

type ModalKind = null | 'settings' | 'mail' | 'friends' | 'chat'

const MOCK_FRIENDS = [
  { name: 'RAPTOR_JP', status: 'オンライン · ロビー', online: true },
  { name: 'NOVA-7', status: 'マッチ中 · TDM STANDOFF', online: true },
  { name: 'SilentWolf', status: 'オンライン · ガンスミス', online: true },
  { name: 'Kuro_Neko', status: 'オフライン · 3時間前', online: false },
]

const MOCK_MAILS = [
  { icon: 'redeem', title: 'シーズン5 ログイン報酬', body: 'クレジット ×2,000 が届いています。' },
  {
    icon: 'campaign',
    title: 'メンテナンスのお知らせ',
    body: '次回メンテは 10/05 02:00–04:00 (JST) です。',
  },
  {
    icon: 'military_tech',
    title: 'ランク保護が適用されました',
    body: '先週の降格保護が発動しました。',
  },
]

export default function MainMenu() {
  const [panel, setPanel] = useState<Panel>('home')
  const [history, setHistory] = useState<Panel[]>([])
  const [modeTab, setModeTab] = useState<ModeTab>('MP')
  const [modeId, setModeId] = useState<string>(MODES.MP[0].id)
  const [classes, setClasses] = useState<ClassLoadout[]>(DEFAULT_CLASSES)
  const [selected, setSelected] = useState(0)
  const [equipped, setEquipped] = useState(0)
  // 'local' = API 不達のため IndexedDB(dexie)のみに保存された状態
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'local' | 'error'>(
    'idle',
  )
  const [modal, setModal] = useState<ModalKind>(null)
  const [mailRead, setMailRead] = useState<boolean[]>(() => MOCK_MAILS.map(() => false))
  const [invited, setInvited] = useState<string[]>([])
  const [chatLog, setChatLog] = useState<{ me: boolean; text: string }[]>([
    { me: false, text: 'よう、今夜ランク回す?' },
    { me: true, text: 'ロードアウト調整したら行く' },
  ])
  const [chatInput, setChatInput] = useState('')
  const [settings, setSettings] = useState({ sound: true, music: true, notify: true, hq: false })
  const loaded = useRef(false)
  // Snapshot of the last payload known to be persisted — skips redundant echo saves.
  const lastSaved = useRef<string | null>(null)

  // Load persisted loadouts(API 優先 → IndexedDB フォールバック)
  useEffect(() => {
    loadLoadouts()
      .then(({ data }) => {
        if (data && Array.isArray(data.classes) && data.classes.length) {
          const safe = sanitizeSaved(data)
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

  // Debounced save(IndexedDB へ先に書き、API が使えなければローカルのみ)
  useEffect(() => {
    if (!loaded.current) return
    const payload = JSON.stringify({ classes, equipped } satisfies Saved)
    if (payload === lastSaved.current) return
    setSaveState('saving')
    const t = setTimeout(() => {
      saveLoadouts({ classes, equipped })
        .then((result) => {
          if (result === 'error') {
            setSaveState('error')
            return
          }
          lastSaved.current = payload
          setSaveState(result === 'api' ? 'saved' : 'local')
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
      if (e.key === 'Escape' && modal === null && panel !== 'home') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel, back, modal])

  const update = (i: number, patch: Partial<ClassLoadout>) =>
    setClasses((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))

  const titles: Record<Panel, string> = {
    home: '',
    loadout: 'LOADOUT',
    gunsmith: 'GUNSMITH',
    operators: 'OPERATORS',
    store: 'STORE',
    clan: 'CLAN',
    rankings: 'RANKINGS',
    battlepass: 'BATTLE PASS',
    events: 'EVENTS',
    challenges: 'CHALLENGES',
    profile: 'PROFILE',
  }

  const unreadMail = mailRead.filter((r) => !r).length

  const sendChat = () => {
    const text = chatInput.trim()
    if (!text) return
    setChatLog((l) => [...l, { me: true, text }])
    setChatInput('')
    setTimeout(() => {
      setChatLog((l) => [...l, { me: false, text: 'りょ!(自動応答デモ)' }])
    }, 900)
  }

  return (
    <>
      <Stage>
        <Background variant={panel === 'home' ? 'home' : 'sub'} />
        <TopBar
          title={titles[panel]}
          onBack={panel === 'home' ? undefined : back}
          unreadMail={unreadMail}
          onProfile={() => go('profile')}
          onCurrency={() => {
            toast({
              kind: 'info',
              title: 'ストアへ移動します',
              desc: '通貨の購入はストアで行えます',
            })
            go('store')
          }}
          onMail={() => setModal('mail')}
          onFriends={() => setModal('friends')}
          onSettings={() => setModal('settings')}
        />

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
                onOpenPage={(p) => go(p)}
                onInvite={() => setModal('friends')}
                onChat={() => setModal('chat')}
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
            {panel in PLACEHOLDER_PAGES && <PlaceholderPanel page={panel as PlaceholderKey} />}
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
                      : saveState === 'local'
                        ? 'save'
                        : 'cloud_done'
                }
                size={14}
                className={
                  saveState === 'saving'
                    ? 'text-cod-400'
                    : saveState === 'error'
                      ? 'text-red-400'
                      : saveState === 'local'
                        ? 'text-amber-400'
                        : 'text-green-500'
                }
              />
              {saveState === 'saving'
                ? 'SYNCING'
                : saveState === 'error'
                  ? 'SYNC FAILED'
                  : saveState === 'local'
                    ? 'SAVED (LOCAL)'
                    : 'SAVED'}
            </span>
            <span className="text-steel-600">ESC · BACK</span>
          </div>
        )}

        {/* ───── Modals ───── */}
        <AnimatePresence>
          {modal === 'settings' && (
            <Modal title="SETTINGS" icon="settings" onClose={() => setModal(null)} width={520}>
              <div className="flex flex-col gap-1.5">
                {(
                  [
                    { key: 'sound', icon: 'volume_up', label: '効果音', sub: 'UI・戦闘効果音' },
                    {
                      key: 'music',
                      icon: 'music_note',
                      label: 'BGM',
                      sub: 'メニュー・リザルト音楽',
                    },
                    {
                      key: 'notify',
                      icon: 'notifications',
                      label: '通知',
                      sub: 'イベント・フレンド通知',
                    },
                    {
                      key: 'hq',
                      icon: 'high_quality',
                      label: '高画質モード',
                      sub: 'バックエンド実装後に反映',
                    },
                  ] as const
                ).map((s) => (
                  <SteelButton
                    key={s.key}
                    onClick={() => {
                      setSettings((v) => ({ ...v, [s.key]: !v[s.key] }))
                      toast({
                        kind: 'success',
                        title: `${s.label}: ${settings[s.key] ? 'OFF' : 'ON'}`,
                      })
                    }}
                    className="flex items-center gap-3 px-3.5 py-2.5 text-left"
                  >
                    <Icon name={s.icon} size={22} className="shrink-0 text-cod-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-xl leading-none tracking-wide">
                        {s.label}
                      </span>
                      <span className="block text-[11px] font-bold text-steel-400">{s.sub}</span>
                    </span>
                    <span
                      className={`clip-slant px-3 py-0.5 font-display text-lg leading-tight ${
                        settings[s.key] ? 'metal-orange' : 'bg-steel-600/70 text-steel-300'
                      }`}
                    >
                      {settings[s.key] ? 'ON' : 'OFF'}
                    </span>
                  </SteelButton>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <OrangeButton
                  onClick={() => {
                    setModal(null)
                    toast({
                      kind: 'success',
                      title: '設定を保存しました',
                      desc: 'この端末にのみ適用(デモ)',
                    })
                  }}
                  className="flex h-11 items-center gap-2 px-6 font-display text-xl tracking-wider"
                >
                  <Icon name="save" size={18} className="relative" />
                  <span className="relative">保存して閉じる</span>
                </OrangeButton>
              </div>
            </Modal>
          )}

          {modal === 'mail' && (
            <Modal title="INBOX" icon="mail" onClose={() => setModal(null)} width={560}>
              <div className="flex flex-col gap-1.5">
                {MOCK_MAILS.map((m, i) => (
                  <SteelButton
                    key={m.title}
                    onClick={() => {
                      if (!mailRead[i]) {
                        setMailRead((r) => r.map((v, j) => (j === i ? true : v)))
                        toast({ kind: 'success', title: '既読にしました', desc: m.title })
                      } else {
                        toast({ kind: 'info', title: m.title, desc: m.body })
                      }
                    }}
                    className="flex items-center gap-3 px-3.5 py-2.5 text-left"
                  >
                    <Icon
                      name={m.icon}
                      size={22}
                      className={`shrink-0 ${mailRead[i] ? 'text-steel-500' : 'text-cod-400'}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block font-display text-xl leading-none tracking-wide ${
                          mailRead[i] ? 'text-steel-400' : ''
                        }`}
                      >
                        {m.title}
                      </span>
                      <span className="block truncate text-[11px] font-bold text-steel-400">
                        {m.body}
                      </span>
                    </span>
                    {!mailRead[i] && <span className="h-2 w-2 shrink-0 rounded-full bg-cod-400" />}
                  </SteelButton>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <SteelButton
                  onClick={() => {
                    setMailRead(MOCK_MAILS.map(() => true))
                    toast({ kind: 'success', title: 'すべて既読にしました' })
                  }}
                  className="flex h-10 items-center gap-2 px-4 text-sm font-bold tracking-wider"
                >
                  <Icon name="done_all" size={18} className="text-cod-400" /> すべて既読
                </SteelButton>
              </div>
            </Modal>
          )}

          {modal === 'friends' && (
            <Modal title="FRIENDS" icon="group_add" onClose={() => setModal(null)} width={560}>
              <div className="flex flex-col gap-1.5">
                {MOCK_FRIENDS.map((f) => {
                  const done = invited.includes(f.name)
                  return (
                    <div
                      key={f.name}
                      className="steel-btn clip-tac-sm flex items-center gap-3 px-3.5 py-2.5"
                    >
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          f.online ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-steel-600'
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-xl leading-none tracking-wide">
                          {f.name}
                        </span>
                        <span className="block text-[11px] font-bold text-steel-400">
                          {f.status}
                        </span>
                      </span>
                      <SteelButton
                        onClick={() => {
                          if (done || !f.online) {
                            toast({
                              kind: 'warn',
                              title: done ? '招待済みです' : 'オフラインのため招待できません',
                            })
                            return
                          }
                          setInvited((v) => [...v, f.name])
                          toast({
                            kind: 'success',
                            title: `${f.name} を招待しました`,
                            desc: '応答待ち(デモ)',
                          })
                        }}
                        className={`flex h-9 items-center gap-1.5 px-3 text-xs font-bold tracking-wider ${
                          done ? 'text-steel-500' : 'text-cod-300'
                        }`}
                      >
                        <Icon name={done ? 'hourglass_top' : 'person_add'} size={16} />
                        {done ? '招待済み' : '招待'}
                      </SteelButton>
                    </div>
                  )
                })}
              </div>
            </Modal>
          )}

          {modal === 'chat' && (
            <Modal title="SQUAD CHAT" icon="forum" onClose={() => setModal(null)} width={520}>
              <div className="slim-scroll flex h-[220px] flex-col gap-2 overflow-y-auto pr-1">
                {chatLog.map((m, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: チャットログは追記専用の表示リストで並べ替え・削除がない
                    key={i}
                    className={`max-w-[80%] px-3 py-1.5 text-sm font-semibold ${
                      m.me
                        ? 'clip-tac-sm metal-orange self-end'
                        : 'clip-tac-sm steel-btn self-start text-steel-300'
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                  placeholder="メッセージを入力…"
                  className="steel-btn clip-tac-sm min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold text-white placeholder:text-steel-500 focus:outline-none"
                />
                <OrangeButton
                  onClick={sendChat}
                  className="flex h-10 w-12 items-center justify-center"
                  aria-label="Send"
                >
                  <Icon name="send" size={18} className="relative" />
                </OrangeButton>
              </div>
            </Modal>
          )}
        </AnimatePresence>

        <ToastHost />
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
          このゲームは横画面(ランドスケープ)専用です。端末を横向きにしてください。
        </div>
      </div>
    </>
  )
}

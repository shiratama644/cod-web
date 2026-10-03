"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { MODES, type ModeTab } from "@/lib/data";
import { Icon, OrangeButton, SteelButton } from "./ui";

type Props = {
  modeTab: ModeTab;
  setModeTab: (t: ModeTab) => void;
  modeId: string;
  setModeId: (id: string) => void;
  activeClassName: string;
  onOpenLoadout: () => void;
  onOpenGunsmith: () => void;
};

const TABS: { id: ModeTab; label: string; icon: string }[] = [
  { id: "MP", label: "MULTIPLAYER", icon: "groups" },
  { id: "BR", label: "BATTLE ROYALE", icon: "paragliding" },
  { id: "ZM", label: "ZOMBIES", icon: "skull" },
];

export default function HomePanel(p: Props) {
  const [picker, setPicker] = useState(false);
  const [searching, setSearching] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [ranked, setRanked] = useState(false);

  const modes = MODES[p.modeTab];
  const mode = modes.find((m) => m.id === p.modeId) ?? modes[0];

  useEffect(() => {
    if (!searching) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [searching]);

  const startStop = () => {
    if (searching) {
      setSearching(false);
    } else {
      setElapsed(0);
      setSearching(true);
    }
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="absolute inset-0">
      {/* Mode tabs (top center) */}
      <div className="absolute left-1/2 top-[18px] z-20 flex -translate-x-1/2 gap-1">
        {TABS.map((t) => {
          const active = p.modeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                if (searching) return;
                p.setModeTab(t.id);
                p.setModeId(MODES[t.id][0].id);
              }}
              className="relative flex h-10 cursor-pointer items-center gap-1.5 px-5 font-display text-2xl tracking-wide"
            >
              {active && (
                <motion.div layoutId="modeTab" className="metal-orange clip-slant absolute inset-0" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              )}
              <Icon name={t.icon} size={20} className={`relative ${active ? "text-black" : "text-steel-400"}`} />
              <span className={`relative leading-none ${active ? "text-black" : "text-steel-300 hover:text-white"}`}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Operator */}
      <motion.div
        className="pointer-events-none absolute bottom-0 left-1/2 h-[92%] -translate-x-[46%]"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.img
          src="/images/operator.png"
          alt="Operator"
          className="h-full w-auto max-w-none object-contain mix-blend-screen"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          draggable={false}
        />
        <div className="absolute bottom-[3%] left-1/2 h-6 w-64 -translate-x-1/2 rounded-[50%] bg-cod-500/30 blur-xl" />
      </motion.div>

      {/* Left column: events / banners */}
      <motion.div
        className="absolute left-6 top-[92px] z-10 flex w-[250px] flex-col gap-2.5"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.4 }}
      >
        <Banner title="BATTLE PASS" sub="SEASON 5 · TIER 42 / 50" icon="workspace_premium" progress={84} accent />
        <Banner title="EVENTS" sub="3 NEW REWARDS AVAILABLE" icon="event" badge />
        <Banner title="SEASONAL CHALLENGE" sub="GET 30 KILLS WITH AR" icon="target" progress={46} />
        <div className="steel-panel clip-tac-sm flex items-center gap-2 px-3 py-2 text-xs text-steel-300">
          <Icon name="campaign" size={16} className="text-cod-400" />
          <span className="truncate">Double XP weekend is LIVE until Monday 09:00</span>
        </div>
      </motion.div>

      {/* Right column: squad */}
      <motion.div
        className="absolute right-6 top-[92px] z-10 flex flex-col items-end gap-2"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-[11px] font-bold tracking-[0.3em] text-steel-400">SQUAD 1/5</div>
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <SteelButton key={i} className="flex h-11 w-11 items-center justify-center text-steel-400" aria-label="Invite">
              <Icon name="person_add" size={20} />
            </SteelButton>
          ))}
        </div>
        <SteelButton className="mt-2 flex h-9 items-center gap-2 px-3 text-xs font-bold tracking-wider text-steel-300">
          <Icon name="forum" size={16} /> CHAT
        </SteelButton>
      </motion.div>

      {/* Bottom-left nav */}
      <motion.div
        className="absolute bottom-6 left-6 z-10 flex gap-2"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        {/* マッチメイキング中の画面遷移は検索が黙殺されるためガード(他 UI と同じ挙動) */}
        <NavTile icon="backpack" label="LOADOUT" onClick={() => !searching && p.onOpenLoadout()} highlight />
        <NavTile icon="construction" label="GUNSMITH" onClick={() => !searching && p.onOpenGunsmith()} />
        <NavTile icon="person_apron" label="OPERATORS" />
        <NavTile icon="storefront" label="STORE" dot />
        <NavTile icon="shield" label="CLAN" />
        <NavTile icon="leaderboard" label="RANKINGS" />
      </motion.div>

      {/* Bottom-right: mode card + start */}
      <motion.div
        className="absolute bottom-6 right-6 z-10 flex w-[330px] flex-col gap-2"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        {p.modeTab === "MP" && (
          <div className="steel-panel clip-slant flex h-8 self-end p-0.5">
            {["CASUAL", "RANKED"].map((r) => {
              const active = (r === "RANKED") === ranked;
              return (
                <button key={r} type="button" onClick={() => !searching && setRanked(r === "RANKED")} className="relative cursor-pointer px-5 font-display text-lg tracking-wide">
                  {active && <motion.div layoutId="rankTab" className="absolute inset-0 bg-steel-500/70" />}
                  <span className={`relative ${active ? "text-cod-300" : "text-steel-400"}`}>{r}</span>
                </button>
              );
            })}
          </div>
        )}

        <motion.button
          onClick={() => !searching && setPicker(true)}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          className="steel-panel clip-tac group relative cursor-pointer overflow-hidden p-3 text-left"
        >
          <div className="absolute inset-y-0 left-0 w-1 bg-cod-500 shadow-[0_0_10px_#f58a07]" />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold tracking-[0.3em] text-cod-400">{ranked && p.modeTab === "MP" ? "RANKED MATCH" : "SELECTED MODE"}</div>
              <AnimatePresence mode="wait">
                <motion.div key={mode.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <div className="font-display text-3xl leading-none tracking-wide">{mode.name}</div>
                  <div className="text-xs font-semibold text-steel-300">
                    {mode.map} · {mode.desc}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            <Icon name="chevron_right" size={30} className="text-steel-400 transition group-hover:translate-x-1 group-hover:text-cod-400" />
          </div>
          <div className="mt-2 flex items-center gap-2 border-t border-white/5 pt-2 text-[11px] font-semibold text-steel-400">
            <Icon name="backpack" size={14} className="text-cod-400" /> CLASS: <span className="text-white">{p.activeClassName}</span>
          </div>
        </motion.button>

        <OrangeButton onClick={startStop} className="flex h-[74px] items-center justify-center">
          <AnimatePresence mode="wait">
            {searching ? (
              <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative flex flex-col items-center">
                <div className="flex items-center gap-2 font-display text-3xl leading-none tracking-wider">
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="flex">
                    <Icon name="progress_activity" size={24} />
                  </motion.span>
                  SEARCHING {mm}:{ss}
                </div>
                <div className="text-[11px] font-bold tracking-[0.25em] opacity-70">TAP TO CANCEL</div>
              </motion.div>
            ) : (
              <motion.div key="g" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative font-display text-5xl leading-none tracking-[0.15em]">
                START
              </motion.div>
            )}
          </AnimatePresence>
        </OrangeButton>
      </motion.div>

      {/* Searching banner */}
      <AnimatePresence>
        {searching && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="steel-panel clip-tac absolute left-1/2 top-[70px] z-20 flex -translate-x-1/2 items-center gap-3 px-5 py-2"
          >
            <motion.span className="h-2 w-2 rounded-full bg-cod-400" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />
            <span className="font-display text-xl tracking-wider">MATCHMAKING · {mode.name}</span>
            <span className="text-xs font-semibold text-steel-400">EST. 00:15 · ASIA</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode picker modal */}
      <AnimatePresence>
        {picker && (
          <motion.div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPicker(false)}>
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="steel-panel clip-tac w-[820px] p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="font-display text-4xl tracking-wider emboss-text">SELECT MODE</div>
                <SteelButton onClick={() => setPicker(false)} className="flex h-9 w-9 items-center justify-center" aria-label="Close">
                  <Icon name="close" size={20} />
                </SteelButton>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {modes.map((m, i) => {
                  const active = m.id === mode.id;
                  return (
                    <motion.button
                      key={m.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      whileHover={{ y: -3 }}
                      onClick={() => {
                        p.setModeId(m.id);
                        setPicker(false);
                      }}
                      className={`clip-tac-sm relative h-32 cursor-pointer overflow-hidden p-3 text-left ${active ? "ring-2 ring-cod-400" : ""}`}
                      style={{ background: "linear-gradient(135deg, #2a2e34, #13151a)" }}
                    >
                      <div className="grid-bg absolute inset-0 opacity-60" />
                      <Icon name="map" size={70} className="absolute -bottom-2 -right-2 text-white/5" />
                      <div className="relative text-[10px] font-bold tracking-[0.3em] text-cod-400">{m.map}</div>
                      <div className="relative font-display text-3xl leading-none">{m.name}</div>
                      <div className="relative mt-1 text-xs text-steel-300">{m.desc}</div>
                      {active && (
                        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-cod-500 text-black">
                          <Icon name="check" size={16} />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Banner({ title, sub, icon, progress, accent, badge }: { title: string; sub: string; icon: string; progress?: number; accent?: boolean; badge?: boolean }) {
  return (
    <motion.button whileHover={{ x: 4, filter: "brightness(1.2)" }} whileTap={{ scale: 0.97 }} className="steel-panel clip-tac-sm relative flex cursor-pointer items-center gap-3 overflow-hidden p-2.5 text-left">
      <div className={`clip-tac-sm flex h-11 w-11 shrink-0 items-center justify-center ${accent ? "metal-orange" : "bg-steel-600 text-cod-300"}`}>
        <Icon name={icon} size={24} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-xl leading-none tracking-wide">{title}</div>
        <div className="truncate text-[10px] font-bold tracking-wider text-steel-400">{sub}</div>
        {progress !== undefined && (
          <div className="mt-1 h-1 overflow-hidden bg-steel-700">
            <motion.div className="h-full bg-cod-400" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, delay: 0.3 }} />
          </div>
        )}
      </div>
      {badge && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 shadow-[0_0_6px_red]" />}
    </motion.button>
  );
}

function NavTile({ icon, label, onClick, highlight, dot }: { icon: string; label: string; onClick?: () => void; highlight?: boolean; dot?: boolean }) {
  return (
    <SteelButton onClick={onClick} className="group flex h-[72px] w-[84px] flex-col items-center justify-center gap-1">
      <Icon name={icon} size={30} className={highlight ? "text-cod-400 drop-shadow-[0_0_6px_rgba(245,138,7,0.8)]" : "text-steel-300 group-hover:text-cod-300"} />
      <span className="font-display text-base leading-none tracking-wider">{label}</span>
      {highlight && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-cod-500 shadow-[0_0_8px_#f58a07]" />}
      {dot && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />}
    </SteelButton>
  );
}

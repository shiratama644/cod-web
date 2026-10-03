'use client'

import { motion } from 'framer-motion'
import { toast } from './feedback'
import { Icon, OrangeButton, SteelButton } from './ui'

export type PlaceholderKey =
  | 'operators'
  | 'store'
  | 'clan'
  | 'rankings'
  | 'battlepass'
  | 'events'
  | 'challenges'
  | 'profile'

type Meta = {
  title: string
  icon: string
  tagline: string
  description: string
  rows: { icon: string; label: string; sub: string }[]
  cta: string
}

export const PLACEHOLDER_PAGES: Record<PlaceholderKey, Meta> = {
  operators: {
    title: 'OPERATORS',
    icon: 'person_apron',
    tagline: 'オペレーター選択',
    description:
      '使用するオペレーター(キャラクター)の外見・ボイス・プロフィールをカスタマイズするページです。バックエンド実装後に所持オペレーターと連動します。',
    rows: [
      { icon: 'military_tech', label: 'GHOST — STEALTH', sub: 'デフォルトオペレーター · 装備中' },
      { icon: 'lock', label: 'VANGUARD — ASSAULT', sub: 'BATTLE PASS TIER 20 で解放' },
      { icon: 'lock', label: 'SPECTRE — RECON', sub: 'イベント報酬 · 期間限定' },
    ],
    cta: 'オペレーターを変更',
  },
  store: {
    title: 'STORE',
    icon: 'storefront',
    tagline: 'アイテムショップ',
    description:
      '武器スキン・オペレーター・バンドル・CODポイントを購入できるストアページです。決済と在庫はバックエンド実装後に有効になります。',
    rows: [
      {
        icon: 'local_fire_department',
        label: 'FEATURED — INFERNO BUNDLE',
        sub: '2,400 CP · 残り 2日',
      },
      { icon: 'swords', label: 'M4 — MOLTEN CORE', sub: 'レジェンダリースキン · 1,200 CP' },
      { icon: 'toll', label: 'COD POINTS', sub: '500 / 1,100 / 2,400 / 5,000 CP' },
    ],
    cta: 'ストアを更新',
  },
  clan: {
    title: 'CLAN',
    icon: 'shield',
    tagline: 'クラン',
    description:
      'クランの作成・加入・クラン戦の参加を行うソーシャルページです。メンバー管理とクラン戦マッチングはバックエンド実装後に有効になります。',
    rows: [
      { icon: 'groups', label: 'クランを検索', sub: '公開クランから探す' },
      { icon: 'add_circle', label: 'クランを作成', sub: '1,000 クレジットで設立' },
      { icon: 'emoji_events', label: 'クラン戦', sub: 'シーズン報酬あり · 毎週末開催' },
    ],
    cta: 'クランを検索',
  },
  rankings: {
    title: 'RANKINGS',
    icon: 'leaderboard',
    tagline: 'ランキング',
    description:
      'フレンド・地域・世界のレーダーボードを閲覧するページです。ランクマッチの戦績集計はバックエンド実装後に反映されます。',
    rows: [
      { icon: 'public', label: 'グローバル TOP 100', sub: 'シーズン 5 · MP ランクマッチ' },
      { icon: 'group', label: 'フレンドランキング', sub: 'K/D · 勝率 · スコア/分' },
      { icon: 'military_tech', label: '自分の順位', sub: 'LEGENDARY · 上位 0.8%(デモ値)' },
    ],
    cta: 'ランキングを更新',
  },
  battlepass: {
    title: 'BATTLE PASS',
    icon: 'workspace_premium',
    tagline: 'シーズン 5 — TIER 42/50',
    description:
      'シーズン報酬トラックです。プレイでティアを進め、武器スキンやオペレーターを解放します。進捗の保存はバックエンド実装後に有効になります。',
    rows: [
      { icon: 'redeem', label: 'TIER 43 — 武器チャーム', sub: 'あと 320 XP で解放' },
      { icon: 'redeem', label: 'TIER 45 — QQ9 エピックスキン', sub: 'プレミアム報酬' },
      { icon: 'workspace_premium', label: 'TIER 50 — シーズン限定オペレーター', sub: '最終報酬' },
    ],
    cta: 'ティアを購入',
  },
  events: {
    title: 'EVENTS',
    icon: 'event',
    tagline: '開催中のイベント',
    description:
      '期間限定イベントの一覧と報酬の受け取りページです。イベント進捗はバックエンド実装後に記録されます。',
    rows: [
      { icon: 'redeem', label: 'ログインボーナス DAY 4', sub: '受け取り可能 · クレジット ×2,000' },
      {
        icon: 'local_fire_department',
        label: 'ダブル XP ウィークエンド',
        sub: '月曜 09:00 まで開催中',
      },
      { icon: 'map', label: '新マップ先行プレイ', sub: '次シーズン開始と同時に公開' },
    ],
    cta: '報酬をすべて受け取る',
  },
  challenges: {
    title: 'CHALLENGES',
    icon: 'target',
    tagline: 'シーズンチャレンジ',
    description:
      'ウィークリー/シーズンチャレンジの進捗確認ページです。達成状況のトラッキングはバックエンド実装後に有効になります。',
    rows: [
      { icon: 'target', label: 'ARで30キル', sub: '進捗 14/30 · 報酬: 2,000 XP' },
      { icon: 'bolt', label: 'オペレータースキルで5キル', sub: '進捗 1/5 · 報酬: チャーム' },
      { icon: 'verified', label: 'ランクマッチ3勝', sub: '進捗 2/3 · 報酬: クレート' },
    ],
    cta: '進捗を確認',
  },
  profile: {
    title: 'PROFILE',
    icon: 'person',
    tagline: 'GHOST_ランナー — LV 150',
    description:
      'プレイヤープロフィール・戦績・装飾(カリングカード/エンブレム)の管理ページです。戦績の実データはバックエンド実装後に同期されます。',
    rows: [
      { icon: 'insights', label: '戦績サマリー', sub: 'K/D 2.41 · 勝率 68%(デモ値)' },
      { icon: 'badge', label: 'コーリングカード', sub: '24 種所持 · LEGENDARY 装備中' },
      { icon: 'history', label: '最近のマッチ', sub: 'バックエンド実装後に表示されます' },
    ],
    cta: 'プロフィールを編集',
  },
}

export default function PlaceholderPanel({ page }: { page: PlaceholderKey }) {
  const meta = PLACEHOLDER_PAGES[page]
  return (
    <div className="absolute inset-0 flex items-center justify-center px-6 pb-6 pt-[84px]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.3 }}
        className="steel-panel clip-tac w-[640px] p-6"
      >
        <div className="flex items-start gap-4">
          <div className="clip-tac-sm metal-orange flex h-16 w-16 shrink-0 items-center justify-center">
            <Icon name={meta.icon} size={36} />
          </div>
          <div className="min-w-0">
            <div className="font-display text-5xl leading-[0.9] tracking-wide glow-text">
              {meta.title}
            </div>
            <div className="text-xs font-bold tracking-[0.25em] text-cod-400">{meta.tagline}</div>
          </div>
          <span className="clip-slant ml-auto shrink-0 bg-steel-600/60 px-4 py-1 text-[10px] font-bold tracking-[0.2em] text-steel-300">
            PREVIEW
          </span>
        </div>

        <p className="mt-4 text-sm font-semibold leading-relaxed text-steel-300">
          {meta.description}
        </p>

        <div className="mt-4 flex flex-col gap-1.5">
          {meta.rows.map((r) => (
            <SteelButton
              key={r.label}
              onClick={() =>
                toast({
                  kind: 'info',
                  title: r.label,
                  desc: 'この項目はバックエンド実装後に利用できます(デモ)',
                })
              }
              className="flex items-center gap-3 px-3.5 py-2.5 text-left"
            >
              <Icon name={r.icon} size={22} className="shrink-0 text-cod-400" />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-xl leading-none tracking-wide">
                  {r.label}
                </span>
                <span className="block truncate text-[11px] font-bold text-steel-400">{r.sub}</span>
              </span>
              <Icon name="chevron_right" size={20} className="shrink-0 text-steel-500" />
            </SteelButton>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <OrangeButton
            onClick={() =>
              toast({
                kind: 'success',
                title: `${meta.title}: ${meta.cta}`,
                desc: 'デモ操作を受け付けました。実処理はバックエンド実装後に有効になります。',
              })
            }
            className="flex h-12 items-center gap-2 px-6 font-display text-2xl tracking-wider"
          >
            <Icon name="bolt" size={20} className="relative" />
            <span className="relative">{meta.cta}</span>
          </OrangeButton>
          <span className="text-[11px] font-bold tracking-widest text-steel-500">ESC · 戻る</span>
        </div>
      </motion.div>
    </div>
  )
}

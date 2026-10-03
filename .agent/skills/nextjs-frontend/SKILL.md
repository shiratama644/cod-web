---
name: nextjs-frontend
description: apps/web（Next.js 16）をSandbox/Arenaプレビューで確実に動かし、モノレポのBiome/tsc/Vitest体制と共存させるスキル。2026-10-03のVite削除・Next主化で確立。
---

# Next.js Frontend — apps/web（Next.js）運用スキル

> 2026-10-02 にユーザー提供の CoD-Mobile-UI（Next.js）を `apps/web-next` として採用（eb3aa2f）、
> 2026-10-03 に Vite+React クライアントを削除して `apps/web` に昇格（2a93a99）。
> 旧 Vite クライアント（Babylon/GameClient/InputController 等）は **git 履歴 ≤40b44eb のみ**に存在。
> 純粋ネットコード（ClientPrediction / Interpolator）は `packages/engine-core/src/client/` に移設済み。

## 構成（2026-10-03 現在）

| 項目 | 値 |
| :--- | :--- |
| 場所 | `apps/web/`（package name `web`） |
| スタック | Next 16 (App Router) + React 19 + Tailwind 4 + framer-motion 13 + drizzle-orm/pg |
| scripts | `dev`=`next dev -H 0.0.0.0 -p 3000` / `build` / `start` / `preview`=`next start -H 0.0.0.0 -p 4173` / `lint`=eslint / `typecheck`=tsc |
| 画面 | Home（MP/BR）・Loadout（5クラス）・Gunsmith（9スロット+stat mod）・TopBar・横画面ロック。データは `src/lib/data.ts` |
| DB | `src/db/` drizzle+pg。**DATABASE_URL 未設定ならインメモリfallback**（`getDb()`/`hasDb` の遅延初期化）。`/api/health` が `{ok, db}` を返す |

## ツールチェーンの分担（重要）

- **Biome は apps/web を見ない**: `biome.json` の `files.includes` = `["**", "!apps/web/**"]`。apps/web は **app ローカルの ESLint**（`next lint` 系）が正。
- **root `pnpm run typecheck` は apps/web を含まない**（root tsconfig include から除外済み）。web の型検査は `cd apps/web && pnpm run typecheck`。
- **Vitest coverage も apps/web を含まない**（E2E と app ローカル検証でカバー）。
- root の TypeScript は JS tsc 6.x ピン（`tech-stack/SKILL.md`）、apps/web は app ローカルに typescript 5.9.x を持つ（Next 公式要件。これは root ピンと矛盾しない — workspace 別依存）。

## ハマりどころ（実績）

1. **@types/react の二重解決で typecheck 崩壊**: app と root で @types/react のバージョンがずれると framer-motion 経由で `'unique symbol' Key` 系の TS2322 が大量発生。**app 側の @types/react / @types/react-dom を root と同じ ^19.2.x に揃えて dedupe** する。lockfile に @types/react が2エントリあったら要修正。
2. **Arena ライブプレビュー（e2b.app）**: `next.config.ts` に `allowedDevOrigins`（`*.e2b.app`）が必要。`-H 0.0.0.0` でバインド。未設定だと dev オーバーレイ/HMR がブロックされる。
3. **依存変更直後の `pnpm install --frozen-lockfile` は失敗する**: まず素の `pnpm install` で lockfile を更新してから frozen を使う（check:all は frozen 前提）。
4. **.gitignore**: `.next/` と `*.tsbuildinfo`（next typecheck の incremental 出力）を ignore（40b44eb）。
5. **Playwright**: `playwright.config.ts` の webServer は `cd apps/web && pnpm run build && pnpm run preview`（:4173）単発構成。spec は `e2e/main-menu.spec.ts`（Home パネル文言 + `/api/loadouts` round-trip + `/api/health`）。timeout 300s（next build が遅い）。

## S フェーズ（ゲーム統合）に向けて

- ゲームキャンバス・WS 接続は今後この Next app に組み込む（R7 INTEGRATION_SPEC で提案 → 承認後実装）。
- その際、旧クライアントの実装知見は `babylon-engine` / `input-accumulation` / `networking` スキルが引き続き有効（コードは消えたがパターンは再利用する）。
- ブラウザコードから localhost 直叩き禁止・相対 URL + proxy の原則は Next でも同じ（Route Handlers / rewrites を使う）。

## 監査コマンド

```bash
cd apps/web && pnpm run typecheck && pnpm run lint   # web はこの2つが正
grep -c '"@types/react"' pnpm-lock.yaml                   # 二重解決チェック
grep -n "allowedDevOrigins" apps/web/next.config.ts # プレビュー設定確認
```

## 関連

- `.agent/logs/2026-10-03_nextjs-frontend-adoption-and-vite-removal.md`
- `packages/engine-core/src/client/`（prediction.ts / interpolation.ts、テストは `_tests_/packages/engine-core/client/`）
- `e2e/main-menu.spec.ts`, `playwright.config.ts`

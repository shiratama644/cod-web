# ログ: P0-A — Vite + React + TypeScript プロジェクト初期化（bun）

- 日時: 2026-09-03
- 種別: feat（Phase 0 基盤・サブタスク P0-A）
- ブランチ: arena/01a062ac-cod-web
- 計画書: docs/planning/PHASE00_PLAN.md（§10 bun 仕様）

## 0. サンドボックス再構築への遭遇（復旧）

- 作業開始時、`git log` が起点 `f5c630a` のみで、前セッションの push 済み成果（〜`8d93a29`）が「未コミット変更＋ untracked」としてスナップショット復元されていた（3 度目の再構築）。
- AGENTS.md §4.1.1 に従い `git fetch origin arena/01a062ac-cod-web` → FETCH_HEAD=`8d93a29` を確認 → `git reset --hard FETCH_HEAD` でブランチポインタ復旧。作業ツリー内容はコミットと一致しており喪失なし。新規 `.nvmrc`（"22"）は untracked として保持。
- bun 未導入のため restore 手順に沿って `npm install -g bun@1.4.0` で導入（bun.sh は到達不可、registry.npmjs.org は到達可）。`/usr/local/bin/bun` = **1.4.0**。node v22.22.3（`.nvmrc` = "22"）。

## 1. 作成したファイル（P0-A スコープ）

- `package.json` — type:module、packageManager `bun@1.4.0`、engines.bun `>=1.4.0`、scripts（dev/build/preview/typecheck/lint/format/test:unit）。
- `tsconfig.json` — strict・noUnusedLocals/Parameters・noFallthroughCasesInSwitch・moduleResolution bundler・jsx react-jsx・noEmit。`src` と `vite.config.ts` を include。
- `vite.config.ts` — @vitejs/plugin-react、`@` → src エイリアス、server/preview を `host:true` + **`allowedHosts:true`**（ライブプレビュー e2b.app プロキシのホスト許可。未設定だと Vite が 403 で弾く）。ESM のため `__dirname` ではなく `fileURLToPath(import.meta.url)` を使用。
- `index.html` — `#root` マウント＋ `/src/main.tsx`。
- `src/main.tsx` — createRoot + StrictMode、`#root` 不在時に throw。
- `src/App.tsx` — 最小画面（cod-web タイトル）。
- `src/index.css` — ダークベース・全画面レイアウト。
- `src/vite-env.d.ts` — `/// <reference types="vite/client" />`。
- `.gitignore` — node_modules/ dist/ *.log .env 等。
- `.nvmrc` — `22`。

## 2. 依存（bun add / bun.lock 生成）

- dependencies: react **19.2.8**、react-dom **19.2.8**。
- devDependencies: typescript **7.0.2**、vite **8.2.2**、@vitejs/plugin-react **6.1.1**、@types/react **19.2.18**、@types/react-dom **19.2.5**、@types/node **26.4.1**、**bun は exact 1.4.0 固定**。
- テストランナー Vitest は P0-C で導入（この時点では未導入。test:unit スクリプトは先に定義）。

## 3. 検証結果（証拠）

| 項目 | コマンド | 結果 |
|---|---|---|
| パッケージ導入 | `bun add` / lockfile | bun.lock 生成、依存解決成功 |
| 型検査 | `bun run typecheck`（tsc --noEmit） | **exit 0（0 error）** |
| 本番ビルド | `bun run build`（vite build） | **exit 0**。dist/index.html + assets 出力。**JS 190.60 kB（gzip 60.06 kB）**、CSS 0.39 kB（gzip 0.26 kB）、16 modules |
| dev サーバー | `bun run dev`（Vite v8.2.2、0.0.0.0:5173） | HTTP **200**。HTML に `#root`・main.tsx、`/src/App.tsx` が TSX 変換されて配信 |
| プレビュー host | e2b.app プロキシ | `allowedHosts:true` 設定後 403 解消、warnings なし |

## 4. スコープ遵守

- ゲームプレイ・Three.js/R3F・Zustand・Biome・Vitest は各後続サブタスク（P0-B/C/D/E/F）に分離。本コミットには含めない。
- 無関係なリファクタリングなし。

## 5. 知見（skills 同期候補）

- **Vite のライブプレビューでは `server.allowedHosts: true`（と preview も）が必須**。e2b.app のプロキシホストからのアクセスを Vite がデフォルトで 403 Blocked host にする。dev/preview 両方に設定。
- **ESM な vite.config.ts では `__dirname` が未定義**。`path.dirname(fileURLToPath(import.meta.url))` を使う。
- bun 導入は `npm install -g bun@<version>`（bun.sh は Sandbox で SSL エラー）。バージョン固定は `bun add -d bun@1.4.0 --exact`。

## 6. 次

P0-B（Biome 導入・`bun run lint` 整備）へ。

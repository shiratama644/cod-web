# ログ: P0-D（R3F シーン・WebGPU/WebGL2）・P0-E（ゲームループ）・P0-F（Zustand）・P0-G（4検証）・P0-H（docs/skills 追従）

- 日時: 2026-09-03
- 種別: feat/chore/docs（Phase 0 基盤・サブタスク P0-D〜H）
- ブランチ: arena/01a062ac-cod-web
- 前提: P0-A（`08c65d7`）、P0-B/C（`85c1a78`）完了

## 導入した依存（bun.lock 更新）

- dependencies: three **0.185.1**、@react-three/fiber **9.7.0**、@react-three/drei **10.7.8**、zustand **5.0.15**。
- devDependencies: @types/three **0.185.4**、（P0-C で vitest 4.1.11 / jsdom 30 / @testing-library/react 16.3.3 他）。

## P0-D: R3F シーン基盤（WebGPU 最優先 + WebGL2 フォールバック）

- `src/game/renderer/createRenderer.ts`:
  - `detectWebGPU()` = `navigator.gpu?.requestAdapter()` の有無（非ブラウザでは安全に false）。
  - `createRenderer(props)`: WebGPU あり → `new WebGPURenderer({ antialias:true, forceWebGL:false, ...props })`（`three/webgpu`）→ `await init()` で backend='webgpu'。失敗/不在 → `new WebGLRenderer({ antialias, canvas })` で backend='webgl2'。
  - R3F v9 の `<Canvas gl={asyncFactory}>` に渡す。ファクトリ引数は HTMLCanvasElement ではなく **R3F のレンダラープロパティ**（canvas 含む）。WebGL フォールバックには WebGPU 固有 `context` を渡さない（型エラー回避のため canvas/antialias のみ）。
- `src/game/GameCanvas.tsx`: Canvas（gl ファクトリ・camera position [4,4,6] fov60・dpr[1,2]）。決定 backend を Zustand に書込み。
- `src/game/scene/SceneContents.tsx`: 背景色・ambientLight＋directionalLight・Ground・Box。
- `src/game/scene/Objects.tsx`: Ground（plane 40x40）、Box。
- `src/components/RendererHud.tsx`: バックエンドを DOM オーバーレイ表示（`role=status`）。
- **実機描画は実環境検証待ち**: Sandbox は Playwright/Chromium 不可（AGENTS.md §6.2）。WebGPU/非WebGPU 環境での目視はユーザー実機/プレビューで確認。コード上のフォールバック機構は明示済み、dev 配信・build・型は通過。

## P0-E: ゲームループ骨架（黄金ルール4・5）

- `src/game/loop/useSpin.ts`: `useFrame((_, delta) => { meshRef.current.rotation.y += ... })`。
  - **ref 直接更新**（React state 不使用）・**ループ内で new なし**（プリミティブ数値演算のみ、一時 Vector3 不要）・**delta time ベース**（60/90/120Hz で速度一定）。
  - delta は **0.05s（50ms）にクランプ**してタブ復帰直後の巨大ジャンプを防止。
- Box が `useSpin(meshRef)` を使用。

## P0-F: Zustand

- `src/store/gameStore.ts`: renderer（null/webgpu/webgl2）・hp（[0,100] クランプ）・ammo（>=0 クランプ）と setter。
- React 外（R3F レンダラー生成・ループ）用に `gameStoreApi = { getState, subscribe }` をラップ export。高頻度座標はストアに入れず ref、という方針をコメント明記。
- GameCanvas が backend を `gameStoreApi.getState().setRenderer(...)` で書き、RendererHud がフックで購読。

## P0-G: 4 検証（全 PASS を一括確認）

| コマンド | 結果 |
|---|---|
| `bun run typecheck`（tsc --noEmit） | exit **0** |
| `bunx biome lint .` | exit **0**（Checked 22 files, no fixes） |
| `bun run test:unit`（vitest run） | **Test Files 2 passed / Tests 11 passed**（clamp 5・gameStore 4・RendererHud 2… 内訳: clamp.test 5, App.test 6） |
| `bun run build`（vite build） | exit **0**。39 modules。**JS 1,642.04 kB（gzip 453.30 kB）**、CSS 0.58 kB |

- `.agent/hooks/verify-before-commit.md` の 4 コマンドは package.json の実スクリプトと一致（typecheck/lint/test:unit/build）。
- バンドルサイズ大（>500kB warning）は three/webgpu 同梱による想定内。chunk 分割・code-split は Phase 1 以降（計画書 §11 で許容）。

## P0-H: docs / skills 追従

- `README.md`: 「初期化前」注記を Phase 0 動作済みの記述に更新、未実装の `bun run test:e2e` をセットアップ手順から削除、bun 1.4.0 固定明記、タイポ `biteps`→`bitecs（候補）`。
- `.agent/skills/tech-stack.md`: Phase 0 の実バージョン固定値と、実機で踏んだコツを追記（R3F v9 WebGPU gl ファクトリ / TS7 の baseUrl 廃止と paths 相対化 / Biome2 の preset と useIgnoreFile / ESM の __dirname 廃止→fileURLToPath / Vite allowedHosts / jsdom で Canvas テスト不可 / jest-dom 型の tsc 解決 / Zustand の getState-subscribe パターン）。

## 型解決で踏んだ点（再掲・skills 同期済み）

- TS 7: `baseUrl` 廃止 → `paths` は `"@/*": ["./src/*"]`（相対）。
- tsconfig にも `paths` エイリアスが必要（vite/vitest.config には alias があるが tsc は tsconfig を見る）。
- jest-dom マッチャーの tsc 認識: vite-env.d.ts の triple-slash reference + vitest.setup.ts を tsconfig include。

## スコープ遵守・残事項

- ECS / 物理 / 入力 / 武器 / ネットワーク実装・Playwright 実行は Phase 1 以降。本フェーズでは追加していない。
- **実環境検証待ち**: WebGPU 対応端末と非対応端末（WebGL2）の両方でシーン表示・回転・HUD の backend 表示を目視確認（Sandbox ではブラウザ実描画不可）。
- chunk 分割は Phase 1。

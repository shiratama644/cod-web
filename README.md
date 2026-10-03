# cod-web

ブラウザ向け **マルチタイプ・ゲームプラットフォーム**（`voxel` / `fps`）。ハブからルームに参加し、タイプごとのシミュレーションだけを差し替える。各タイプ内に `official` / `ugc` のコンテンツソースを持ち、Krunker.io のように誰でもマップ/ワールドを作れるエディタを目指します。

**理想形の仕様正本:** [`docs/arch/`](./docs/arch/README.md)
**進捗正本:** [`docs/task-list.md`](./docs/task-list.md)
**計画書入口:** [`docs/planning/`](./docs/planning/README.md)
**調査入口:** [`docs/research/DEEP_RESEARCH_SYNTHESIS.md`](./docs/research/DEEP_RESEARCH_SYNTHESIS.md)
**作業規約:** [`AGENTS.md`](./AGENTS.md)

現行コードは Bun workspaces モノレポ（`apps/*`, `packages/*`）。単一ルーム FPS 原型から理想形へ段階移行中。描画は Babylon.js、トランスポートは当面 **WebSocket のみ**。ライセンスは **MIT**（[`LICENSE`](./LICENSE)）。

旧 FPS 専用ドキュメントは [`.archive/docs/`](./.archive/docs/) にあります。

## 起動・ビルド・テスト

```bash
bun install                          # 依存インストール (bun@1.4.0, bun.lock)

# 本番構成: install → build → gameserver :8080 + preview :4173 を並列起動
bun run start                        # = bun run scripts/execute.ts

# 開発時
bun run dev                          # apps/web Vite :5173 (/ws を :8080 へプロキシ)
bun run server                       # 権威ゲームサーバ :8080 (apps/gameserver)
bun run server:dev                   # gameserver --watch
bun run preview                      # apps/web preview :4173 (/ws プロキシ)

# ビルド
bun run build                        # = build:packages + build:apps
bun run build:packages               # protocol → engine-core → profile-fps の依存順
bun run build:apps                   # gameserver + web

# 検証 (AGENTS.md §3.1 の4種)
bun run typecheck                    # tsc --noEmit + tsc -p tsconfig.server.json
bunx biome lint .                    # Biome 直接呼び出し (bun run lint より高速)
bun run lint                         # = biome lint . (エイリアス)
bun run format                       # biome format --write .
bun run test:unit                    # vitest run
bun run test:coverage                # vitest run --coverage (閾値: statements85/branches85/functions85/lines85, EM2 95.12%/87.97%/90.7%/96.8%)
bun run test:e2e -- --list           # Playwright spec discovery (browser不要)
bun run test:e2e                     # E2E実行 (要 browser, CI/実環境)

# 詳細は docs/ops/quality-gates.md
```

マルチプレイヤー確認: `bun run start` でサーバとクライアントを起動し、プレビュー URL を開く。タブをもう1つ開くと互いにカプセルが見える（位置同期）。

テストは `./_tests_/` にソース構造をミラー。エイリアスは `@` → `apps/web/src`, `@cod/protocol`, `@cod/engine-core`, `@cod/profile-fps`。ランタイムは bun。テストランナーは Vitest（`bun test` は使わない）。

## 理想形の要点

| 層 | 内容 |
| --- | --- |
| L0 | プロトコル framing、WS、マッチメイカー、ハブ |
| L1 | Room / ティック / 入力キュー（タイプ非依存） |
| L2 | VoxelProfile / FpsProfile のみ分岐 |
| L3 | `defineGameMode`（bedwars / FFA / TDM 等） |

公式/UGC 階層とエディタ方針は [`docs/arch/editor.md`](./docs/arch/editor.md)。詳細は [`docs/README.md`](./docs/README.md)。

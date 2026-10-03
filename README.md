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
# 初回セットアップ(環境準備のみ。アプリ・ビルドは実行しない)
bun run setup                        # 環境診断 → apt(必要時) → bun install → postgres イメージ取得 → check:env
bun run setup --no-apt               # apt によるシステム依存インストールをスキップ
bun run setup --no-docker            # Docker の導入を試みない(proot 等 daemon 不可環境向け)
bun run setup --e2e                  # Playwright ブラウザ(chromium)も取得
# ※ docker なし → Docker 公式 apt リポジトリ(keyrings/docker.asc + sources.list.d)を
#   設定して docker-ce 一式を導入。daemon が使えない環境(Termux proot 等)では
#   フォールバックとして apt で PostgreSQL を導入し、
#   パスワード/app_db/.env/スキーマまで自動設定する(フェイルソフト)

bun install                          # 依存インストール (bun@1.4.0, bun.lock)

# 本番構成: install → PostgreSQL(Docker) → build → gameserver :8080 + preview :4173
bun run start                        # = bun run scripts/execute.ts
bun run start --no-db                # PostgreSQL を起動せずに実行(インメモリ保存)
# ※ docker が無い環境では自動的に DB なしで続行する(警告のみ・停止しない)

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

## データベース (PostgreSQL)

`apps/web` のロードアウト永続化 (`/api/loadouts`) は PostgreSQL + Drizzle を使う。
ローカルではルートの `compose.yaml` で簡単に起動できる（要 Docker + Compose v2）。

```bash
# 1. PostgreSQL 起動（postgres:17-alpine, healthy になるまで待機）
bun run db:up

# 2. 接続設定（compose のデフォルトと一致済み）
cp apps/web/.env.example apps/web/.env

# 3. スキーマ反映（drizzle-kit push → loadouts テーブル作成）
bun run db:push

# 運用
bun run db:logs                      # ログ追尾
bun run db:psql                      # psql シェル (app_db)
bun run db:down                      # 停止（データは volume に保持）
bun run db:destroy                   # 停止 + データ削除
cd apps/web && bun run db:studio     # Drizzle Studio（GUI ブラウザ）
```

- 接続先: `postgresql://postgres:postgres@127.0.0.1:5432/app_db`（`POSTGRES_PORT` 等の環境変数で上書き可）
- `DATABASE_URL` 未設定でもアプリは動く（`/api/loadouts` はインメモリ保存にフォールバック）。`/api/health` の `db` フィールドで接続状態を確認できる。

## Docker（フルスタック実行 / イメージビルド）

`Dockerfile` はマルチステージ構成（base = node:22-alpine + bun）。
ターゲット: `web`（Next.js 本番 :3000）/ `gameserver`（Bun 権威サーバ :8080）/ `development`（devcontainer 用）。

```bash
# web + gameserver + postgres をまとめてコンテナ起動（compose profile: app）
bun run app:up                       # = docker compose --profile app up --build -d
bun run app:logs                     # 全サービスのログ追尾
bun run app:down                     # 停止

# 個別イメージビルド
bun run docker:build:web             # -> cod-web-web
bun run docker:build:gameserver      # -> cod-web-gameserver
```

- コンテナ内の web は `DATABASE_URL` をサービス名 `postgres` で解決する（compose が注入、手動設定不要）
- VS Code の **Dev Containers** にも対応: `.devcontainer/devcontainer.json`（development ターゲット + bun install、ポート 3000/4173/8080/5432 転送）

## 理想形の要点

| 層 | 内容 |
| --- | --- |
| L0 | プロトコル framing、WS、マッチメイカー、ハブ |
| L1 | Room / ティック / 入力キュー（タイプ非依存） |
| L2 | VoxelProfile / FpsProfile のみ分岐 |
| L3 | `defineGameMode`（bedwars / FFA / TDM 等） |

公式/UGC 階層とエディタ方針は [`docs/arch/editor.md`](./docs/arch/editor.md)。詳細は [`docs/README.md`](./docs/README.md)。

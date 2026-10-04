# 2026-10-04 DB を組み込み SQLite へ移行(PostgreSQL/Neon をサイトから切り離し)

## 依頼

「DB はサイトから消して(設定ファイルとかは残して)、sqlite を使うようにしてください。
それなら簡単に動くと思います。」— ローカル PostgreSQL も Neon CLI も環境起因で
うまく動かなかったため、ゼロ設定で動く組み込み DB に切り替える。

## 設計判断

- ドライバは **@libsql/client**(ローカル `file:` モード)を採用。
  - ネイティブビルド不要・postinstall スクリプト不要(bun の trustedDependencies 問題を回避)
  - プリビルトは npm の optional dependencies(@libsql/linux-arm64-gnu 等)として配布され、
    ユーザーの Termux proot(arm64 glibc)でも bun install だけで入る
  - better-sqlite3 は postinstall(prebuild-install)が bun でブロックされるため不採用
- スキーマは drizzle sqlite-core に変換: id integer PK / data text(json) /
  updated_at integer(timestamp_ms, $defaultFn)。
- **`dbReady()` を新設**: 初回アクセス時に `CREATE TABLE IF NOT EXISTS`(db:push と同一 DDL)。
  → `db:push` を忘れても `cd apps/web && bun run dev` 直叩きで動く。
- 保存先 `apps/web/.data/cod.sqlite`(SQLITE_PATH で上書き可)。gitignore に
  `.data/` / `*.sqlite*` を追加。
- drizzle.config.ts: dialect sqlite + **mkdirSync で親ディレクトリを先に作成**
  (SQLite error 14 "Unable to open connection" の対策。実際に踏んで修正)。
- next.config.ts: `serverExternalPackages: ['@libsql/client']`(ネイティブ依存の外部化)。
- インメモリフォールバックは撤去(SQLite は常に利用可能)。hasDb は互換のため残置(常に true)。

## 残置した設定ファイル(ユーザー指示「設定ファイルとかは残して」)

- `neon.ts` + `@neon/config` / `@neon/env`(root deps)
- `compose.yaml` の postgres サービスと `db:up` / `db:psql` 等の root スクリプト
- `.agent/skills/neon-*`(ユーザーが 4662a10 でコミット)
- `.gitignore` の `.neon` / `.mcp.json` / `skills-lock.json`

## 削除・簡素化

- apps/web から `pg` / `@types/pg` を削除。
- scripts/execute.ts: PostgreSQL 起動ロジック(リモート検出 / tcp 検出 / proot クラスタ /
  docker compose / DATABASE_URL 注入 / `--no-db`)を全て削除 → `db:push` のみ(739→461 行台)。
- scripts/setup.ts: setupAptPostgres / setupProotPostgres / setupRemoteDb /
  finalizeDbEnvAndSchema / printPgFailureDiagnostics / asPostgres 等を削除(873→493 行)。
  ステップ 4 として `db:push`(SQLite)を追加。Docker 導入(2a)は任意機能として残置。
- README: DB 節を SQLite に書き換え。PostgreSQL/Neon は「現在未使用(設定は残置)」節に集約。
- .agent/skills/nextjs-frontend/SKILL.md の DB 行を更新。
- cspell.json: libsql + 以前から辞書漏れだった nala/newgrp/nohup/overlayfs/pgdata/udocker を追加。

## 検証

- biome / typecheck PASS、check:all 7/7 PASS、cspell 0 issues
- `bun run db:push` → apps/web/.data/cod.sqlite 作成を確認
- DB ファイル削除 → next dev 起動 → /api/health `{ok,db,storage:'sqlite'}` /
  GET null / PUT→GET 保存・上書き / 不正 JSON 400 — 全て自動作成経路で成功
- `next build` 成功 → `next start`(preview :4173)でも dev で保存したデータを読めること
  (ファイル永続)を確認
- `bun run setup --no-apt` 通し: ✔ bun install → ✔ DB (SQLite) → ✔ check:env

# 2026-10-03 Neon(リモート PostgreSQL)統合

## 依頼

proot で PostgreSQL が使えなかったため Neon を使う。Neon Auth もチェック済み。
PostgreSQL 18 / DB 名 `cod` / プロジェクト `misty-sea-87909993` / ブランチ `production`。
ユーザー提示の手順: `bun i -g neon@latest && neon login` → `neon skills -y` →
`neon mcp -y` → `neon link --project-id misty-sea-87909993 --branch production -y` →
`neon config init` → neon.ts に `auth: true` → `neon deploy`。

## 調査(Web、2026-08 時点の公式情報)

- CLI は `neonctl` → **`neon`** に改名(npm i -g neon@latest)。`neon config init` が
  `neon.ts` を作成し **@neon/config + @neon/env** をルート package.json に導入する。
- `neon link` は `.neon` ファイル(プロジェクトコンテキスト)を書き、ブランチの
  DATABASE_URL を**ルートの .env** に書き出す。`neon deploy` は neon.ts を照合して
  サービス(Auth 等)をプロビジョニングし、資格情報を .env に注入する。
- `neon skills` は agent skills(.claude/skills/ 配下)、`neon mcp` は MCP 設定
  (.mcp.json)を作る → 本リポジトリは .claude/ 禁止規約のため gitignore で除外。

## 実装

- **neon.ts**(ルート、コミット): `defineConfig({ auth: true })` + 注釈。
- **deps**: `bun add @neon/config @neon/env`(@neon/env 1.5.0)。
- **.gitignore**: `.neon` / `.mcp.json` / `skills-lock.json` 追加(.claude/ は既存)。
- **scripts/execute.ts**: `startDatabase()` の最優先ステップ 0 を追加 —
  DATABASE_URL を env → apps/web/.env → ルート .env の順で探索し、リモートホスト
  (127.0.0.1/localhost/[::1] 以外)なら **ローカル DB を一切起動せず** db:push のみ。
  process.env に設定するため Next サーバにも自動伝播。ホスト名のみログ(資格情報非表示)。
- **scripts/setup.ts**: 同じ検出を診断直後に実施。リモート時は 2b(compose/proot/apt)
  と postgres イメージ pull を SKIP し、**bun install 後(3b)** に `setupRemoteDb()`:
  apps/web/.env に DATABASE_URL が無ければ書き込み(Next.js が読むのはここ。
  neon CLI はルート .env に書くためのブリッジ)→ db:push → サマリ記録。
- **apps/web/.env.example**: Neon 用の記入例(cod / sslmode=require&channel_binding=require)。
- **README.md**: 「Neon(リモート PostgreSQL)」節を追加(手順・自動検出の仕様)。

## 確認事項

- `pg` 8.20 は URL の `sslmode=require` を TLS 接続(verify-full 相当)として解釈する
  ことを pg-connection-string の実パースで確認 → db/index.ts の変更は不要。
- Neon Auth のアプリ側統合(ログイン UI・セッション・neon_auth スキーマ利用)は
  未実装。`auth: true` の宣言と deploy での環境変数注入までが今回のスコープ。

## 検証

- biome / typecheck PASS
- 疑似リモート URL(127.0.0.2:9)でセットアップ実走: 検出 → apps/web/.env 書込 →
  db:push 試行(到達不能なので WARN)→ サマリまで正常。実行後 .env は削除済み
  (サンドボックスに .env を残さない規約)。
- `bun run check:all` 7/7 PASS
- 制約: 実際の Neon 接続(login/link/deploy はユーザーの手元でのみ可能)は実機確認待ち。

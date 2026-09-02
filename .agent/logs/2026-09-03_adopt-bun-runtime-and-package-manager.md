# bun 採用（パッケージ管理 + ランナー、ゲームサーバーランタイム想定）

> Date: 2026-09-03(JST) / Commit: `eaa2239`（ログ追記コミットは後続）/ Branch: arena/01a062ac-cod-web

## 1. 指示内容 (Task Summary)

- ユーザー質問: 「bun はあなたのサンドボックスで使えますか？ できたら bun を使うようにしてほしい。」
- 実機確認 → bun はプリインストールされていないが、**npm registry 経由で導入できフル動作**することを確認。
- ask_user で適用範囲を確認 → ユーザーは **「full-bun」** を選択:
  - パッケージ管理・スクリプトランナーを bun に（`bun install` / `bun run` / `bunx`、`bun.lock`）
  - テストランナーは **Vitest 据え置き**（`bun test` / bun:test は使わない）
  - 将来のゲームサーバー（Colyseus 等）も **bun ランタイムを想定**（互換検証はネットワークフェーズ）

## 2. 実行内容 (Executed Actions)

| # | 確認/変更 | 内容 |
|---|---|---|
| 1 | bun 動作確認 | `bun` 未インストール。`bun.sh` は SSL エラーで到達不可、`registry.npmjs.org` は到達可。`npm install bun` で **bun 1.4.0** 動作（install / run / TS実行 / bun:test すべて確認）。`npm install -g bun@1.4.0` で `/usr/local/bin/bun` に導入 |
| 2 | AGENTS.md | §3.1 検証コマンドを `bun run typecheck` / `bunx biome lint` / `bun run test:unit` / `bun run build` に。「`bun test` は使わず Vitest」を明記。§4.1.1 復旧を bun 化。§6.1 に bun ツールチェーン・サーバーランタイム方針を追記。§6.4/§7.2 のコマンド例も bun 化 |
| 3 | フック | `restore-sandbox-env.sh` を bun 対応に書換え（npm 経由で bun 導入 → `bun install --frozen-lockfile`。devDependencies.bun の固定バージョン優先、package.json 無しはスキップ）。`verify-before-commit.md` / `pre-task.md` / `sandbox-rebuild-recovery.md` / hooks/index を bun コマンドに |
| 4 | docs / skills | README（セットアップを bun コマンド + bun 未インストール時の導入注記）、task-list（P0-A に bun 固定を明記）、PHASE00_PLAN（§10 に bun 設計を追記・pnpm-lock.yaml→bun.lock）、skills/tech-stack・project-overview・sandbox-constraints を bun 化 |
| 5 | バージョン固定方針 | bun は devDependency で `1.4.0` 固定（Phase 0 の package.json で設定）。復旧スクリプトはこの固定値を優先してグローバル導入 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- **bun.sh の install スクリプトは Sandbox から到達不可**（OpenSSL SSL_ERROR_SYSCALL）だが、npm パッケージ `bun` 経由ならインストール・実行とも問題なし。Sandbox で bun を使う唯一の確実な経路は npm。
- bun の npm パッケージは postinstall でプラットフォーム別バイナリ（`@oven/bun-*`）を引く。グローバル導入すれば `/usr/local/bin/bun` に置かれ、セッション中は永続する（サンドボックス再構築では消えるので restore スクリプト必須）。
- `restore-sandbox-env.sh` は元々 corepack+pnpm 前提だった。bun には corepack が無いため、`package.json` の `devDependencies.bun` からバージョンを読んで `npm install -g bun@<ver>` する方式に変更した。
- テストを bun:test に寄せない判断（Vitest 維持）は、jsdom + @testing-library/react の DOM テスト資産と R3F の将来テストを考慮。bun の強みはパッケージ管理・ランナー・サーバーランタイムで享受し、テスト層は互換性優先。
- Colyseus 等のゲームサーバーが bun ランタイムで完全動作するかは未検証。Phase 1（ネットワーク）で実機確認が必要（リスクとして PHASE00_PLAN §11 相当で管理）。

## 4. 次にすべきこと (Next Actions)

- **Phase 0（P0-A）**: bun で Vite + React + TS を初期化。`bun init` 等は使わず Vite テンプレートをベースに `package.json` を用意し、devDependencies に `bun@1.4.0` を固定。`bun install` → 4 検証を bun コマンドで通す。
- Phase 1（ネットワーク）で Colyseus / geckos.io の bun ランタイム互換を実機検証。問題があればサーバーのみ Node ランタイムへの切替を再検討（その時点でユーザーに報告）。
- CI ワークフロー（docs/ops、Phase 1 以降）では `oven-sh/setup-bun` を使う前提で記述する。

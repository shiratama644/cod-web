# 2026-10-03 一括セットアップコマンド `bun run setup` の新設

## 目的
初回環境構築を 1 コマンド化する(ユーザー要望)。「実行はしない」=
環境準備のみでアプリ・ビルド・サーバ起動は行わない。
※ TEMPLATE_REPO の scripts/setup.ts(pnpm 版)は第2弾で「ユーザー明示指示により不採用」
だったが、今回の明示指示により**採用へ転換**。移植ではなく bun 版を新規設計した。

## 実施内容
- scripts/setup.ts 新規 + package.json に `"setup"` スクリプト追加
- ステップ(冪等・フェイルソフト。必須は bun install のみ):
  1. 環境診断(bun/node/docker/apt)
  2. apt システム依存: **docker あり → apt postgresql は入れない**(compose が提供、
     ホスト postgres と :5432 衝突回避)。docker なし(Termux proot 等)→
     apt install postgresql → service 起動 → パスワード postgres 設定 → app_db 作成 →
     apps/web/.env 生成(無い場合のみ)→ bun run db:push
  3. bun install --frozen-lockfile(失敗時のみ exit 1)
  4. husky hooks 確認(bun install の prepare で導入済みのはず。無ければ bunx husky)
  5. docker あり → docker compose pull postgres(イメージ取得のみ、起動しない)
  6. --e2e → bunx playwright install chromium
  7. bun run check:env(軽量診断のみ。品質ゲートは回さない)
- フラグ: `--no-apt` / `--e2e`。終了時にサマリ表+次の手順(start / --no-db / db:up)を表示
- README 起動節の先頭にセットアップ手順を追記

## 検証(Sandbox 実測)
- `bun run setup --no-apt`: 全ステップ完走、サマリ表示、exit 0
- `bun run setup`(apt ミラー到達不可): apt install 失敗 → WARN 記録で続行、
  .env は生成されない(provisioning 未達時の正しい挙動)、exit 0
- typecheck(両 tsconfig)/ biome / cspell(createdb/runuser/datname/proot 等を辞書追加): PASS
- apt 成功パス(実 proot)・docker ありパスは**実環境検証待ち**

## 知見
- 非 root + sudo なし環境では apt/provisioning を WARN スキップ(privileged() ヘルパ)。
- postgres OS ユーザー実行は root → runuser(無ければ su -s)、非 root → sudo -u postgres。
- secret-scan: `ALTER USER ... PASSWORD 'postgres'` は `password[:=]` 形式でないため非検知。

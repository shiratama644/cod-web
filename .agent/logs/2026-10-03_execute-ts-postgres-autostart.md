# 2026-10-03 execute.ts に PostgreSQL(Docker)自動起動 + --no-db フラグ追加

## 目的
`bun run start` だけで DB 込みの本番構成が立ち上がるようにする(ユーザー要望)。
DB なし実行も `--no-db` フラグで可能にする。

## 実施内容
- scripts/execute.ts: ステップ 2 として DB 起動を挿入(1 install → **2 db** → 3 build → 4 servers)
  - `docker compose up -d --wait postgres` → 成功時 `bun run db:push`(スキーマ反映)
  - **フェイルソフト設計**: docker 不在・起動失敗・push 失敗のいずれでも警告して続行
    (アプリ側に DATABASE_URL 未設定時のインメモリフォールバックがあるため、起動は止めない)
  - DB 起動成功かつ DATABASE_URL 未設定なら、web client(preview)へ compose デフォルトの
    DATABASE_URL を注入(POSTGRES_USER/PASSWORD/PORT/DB 環境変数を尊重)。明示設定が優先
  - `--no-db`: process.argv 判定。`bun run start --no-db` で bun がフラグをそのまま転送する
  - ログタグ `[DB]`(青)を追加
- README: 起動節に `--no-db` と自動 DB 起動を記載

## 検証(Sandbox 実測)
- `bun run start --no-db`: [DB] Skipping... が出て build へ進むことを確認(フラグ転送 OK)
- `bun run start`(docker 不在): [DB] docker not found 警告 → build → SERVER :8080 +
  CLIENT :4173 起動まで完走。SIGINT で全子プロセス終了・ポート解放を確認
- typecheck(両 tsconfig)/ biome / check:all 7/7 / cspell: PASS
- docker あり環境での DB 起動パスは**実環境検証待ち**(Sandbox に docker なし)

## 知見
- ユーザーは「pnpm start --no-db」と表現したが、本リポジトリは bun が正
  (2026-10-03 の pnpm→bun 差し戻し指示)。`bun run start --no-db` として実装。
- `bun run <script> <args>` は `--` なしでも引数をスクリプトへ転送する(実測)。

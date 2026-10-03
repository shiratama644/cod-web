# 2026-10-03 setup/execute: proot PostgreSQL 起動の診断強化 + mmap/socket 設定

## 依頼(ユーザー実環境ログより)

ユーザーローカルクラスタ方式の初回実走で:

- `! 起動確認ができませんでした。ログ: tail ~/.cod-web/pgdata/log`
- しかし **log ファイルが存在しない**(tail: No such file or directory)
- この実行では initdb / pg_ctl の出力が一切なし
  → PG_VERSION は既存(前回実行で initdb 済み)、`pg_ctl status` が「起動中」を
    返した可能性が高い(stale postmaster.pid の誤判定)が、確証となる出力が無かった。

## 修正(scripts/setup.ts)

- `postgresql.conf` に proot/Android 向け設定を**冪等追記**(マーカー `# cod-web proot settings`):
  - `unix_socket_directories = '/tmp'`(権限不要。-o 渡しから conf へ移行)
  - `shared_memory_type = mmap` / `dynamic_shared_memory_type = mmap`
    (Android は SysV IPC 非対応・/dev/shm 不安定のため)
- `pg_ctl status` の結果行を**常に表示**。
- **status=起動中 かつ pg_isready 失敗 → `pg_ctl restart -m fast`**(stale pid 対策)。
- PG_VERSION 無しでディレクトリだけ残っている場合は壊れた初期化とみなし
  `rm -rf` してから initdb(冪等リカバリ)。
- 起動待ちを 15→30 秒(低速ストレージ)。
- `printPgFailureDiagnostics()` 追加: 失敗時に
  ①pg_ctl status 行 ②ログ末尾 15 行(存在時)
  ③ログ未作成なら `timeout 5 postgres -D <dir>` の**前景起動で stderr を直接採取**して表示。

## 修正(scripts/execute.ts)

- user-local 起動から `-o '-k /tmp'` を削除(conf に移行)。
- `pg_ctl start` 失敗時に `-m fast restart` を一度リトライ。それでも失敗なら
  ログ末尾 10 行を表示。

## 検証

- biome / typecheck PASS(エスケープは od で `'\n'` 単一バックスラッシュを確認)
- TERMUX_VERSION + fake nala で proot 分岐の実走確認
- `bun run check:all` 7/7 PASS
- 制約: サンドボックスに postgres バイナリ無し・apt ミラー不達のため、
  実クラスタでの成功/診断パスはユーザー実機の次回ログ待ち。
- 事故: サンドボックス再構築で bun 消失 → `npm install -g bun` + `bun install` で復旧(既知手順)。

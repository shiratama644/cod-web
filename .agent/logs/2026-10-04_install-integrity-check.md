# 2026-10-04 依存の実体検証と自動修復(`next: command not found` 対策)

## 事象(ユーザー実機・Termux proot)

`bun run start` で:
- `bun install --frozen-lockfile` は「Checked 392 installs across 571 packages (no changes)」
  と成功報告
- しかし直後の db:push が「Please install either 'better-sqlite3' or '@libsql/client'」、
  next build が「next: command not found」(exit 127)で失敗

→ **bun のインストール状態ファイルと node_modules の実体がずれている**。bun は状態
ファイルを信じて no changes と判断するが、実体(next / @libsql/client 等)が欠けている。
部分削除・pull 直後・ストレージ掃除・proot 環境などで起こり得る。

## 対策

- scripts/execute.ts: `verifyAndRepairInstall()` を追加。install 成功後に重要
  パッケージ(next / @libsql/client / dexie / drizzle-kit / typescript)の
  `package.json` 実在を root と apps/web の両 node_modules で確認。欠けていれば
  `bun install --force` を一度だけ実行して再検証。それでも欠ける場合は
  手動復旧手順(rm -rf node_modules → bun install)を表示して exit 1
  (以前のように build まで進んで exit 127 で落ちない)。
- scripts/setup.ts: 同じ検証を 3b として追加(サマリ「依存の実体検証」)。

## 検証

- biome / typecheck PASS、check:all 7/7
- node_modules/next と @libsql/client を**完全削除** → setup: bun install が自力検知し
  再取得 → 実体検証 ✔(素通り、余計な --force なし)
- 中身だけ削除(ディレクトリ残し)でも同様に回復 ✔
- `bun run start` フル通し: install → 実体検証 → db:push(No changes)→ build 成功 →
  gameserver :8080 + preview :4173 起動まで確認
- 注: サンドボックスの bun は欠損を自力検知したため --force 経路は実機でのみ発火する
  見込み(ロジックは実在チェック+再 install のみで安全)

## ユーザー向け即時復旧(スクリプト更新を pull しない場合)

```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules
bun install
bun run start
```

おまけ: `setlocale: LC_ALL: ja_JP.UTF-8` 警告は無害。消すには
`sudo locale-gen ja_JP.UTF-8` または `export LC_ALL=C.UTF-8`。

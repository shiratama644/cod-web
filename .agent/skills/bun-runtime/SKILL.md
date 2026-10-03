---
name: bun-runtime
description: pnpm + Node/tsx 運用と gameserver 用 bun ランタイムを Sandbox で確実に動かすスキル。2026-10-03 bun→pnpm 移行後の正。npm 経由導入、restore-sandbox-env.sh、workspaces、Bun.serve、Vitest 維持判断。
---

# Runtime & Package Manager — pnpm + Node(tsx) + gameserver 用 bun

> 2026-10-03 に **パッケージマネージャを bun→pnpm に全面移行**（ユーザー指示）。
> スキル名 `bun-runtime` は過去ログからの参照を壊さないため維持。内容は pnpm 移行後の正。
> 仕様正本: `AGENTS.md` §3.1/§6.1、`docs/ops/quality-gates.md`

## 役割分担（2026-10-03〜）

| 層 | ツール | 備考 |
|---|---|---|
| パッケージ管理 | **pnpm**（`packageManager` フィールドで固定、`pnpm-workspace.yaml`） | ロックファイルは `pnpm-lock.yaml` のみ |
| TS スクリプト実行（scripts/*.ts） | **tsx**（devDep、`pnpm run check:all` 等が内部で使用） | Bun API は使わない（child_process 等 Node API のみ） |
| テスト | **Vitest**（Node 上） | bun:test は過去も今後も使わない（jsdom + @testing-library 資産） |
| gameserver 実行ランタイム | **bun**（`Bun.serve` ネイティブ WebSocket） | devDependencies.bun → `node_modules/.bin/bun`。グローバル導入不要 |

## Sandbox で pnpm を使う経路

- pnpm はプリインストールされていない。**npm 経由でグローバル導入**（registry.npmjs.org は到達可）
- バージョンは package.json の `packageManager`（`pnpm@x.y.z`）に従う

```bash
npm install -g pnpm@10
pnpm --version
pnpm install --frozen-lockfile
```

### restore-sandbox-env.sh

- `.nvmrc` の Node メジャー版を npm registry の `node-linux-x64` から復元（nodejs.org は SSL で到達不可）
- pnpm を `packageManager` 記載バージョンで `npm i -g`
- `pnpm install --frozen-lockfile` で依存復元（bun バイナリも devDep として入る）

```bash
bash .agent/hooks/restore-sandbox-env.sh
export PATH=$PATH:/usr/local/bin   # グローバル bin が PATH から消えることが多い
```

## package.json 固定

```json
{
  "packageManager": "pnpm@10.34.6",
  "engines": { "node": ">=22", "pnpm": ">=10" },
  "devDependencies": { "bun": "1.4.0", "tsx": "^4.20.6" },
  "pnpm": {
    "onlyBuiltDependencies": ["@biomejs/biome", "bun", "esbuild", "sharp", "unrs-resolver"],
    "auditConfig": { "ignoreGhsas": ["GHSA-vfj7-8cjw-p6xm"] }
  }
}
```

- **pnpm 10 はビルドスクリプトをデフォルト拒否** → bun バイナリの postinstall が走らず gameserver が起動しない。`onlyBuiltDependencies` に必ず `bun` を含める
- ワークスペース定義は `pnpm-workspace.yaml`（package.json の `workspaces` は pnpm では無効）
- フィルタ実行: `pnpm --filter web dev`、`pnpm --filter @cod/gameserver start`

## pnpm 固有の落とし穴（移行時に実測）

- `pnpm run script -- --flag` は **`--` ごと子コマンドに渡る**（npm と違う）。`pnpm run test:e2e --list` のように `--` なしで書く
- packageManager フィールドが他 PM のままだと pnpm が `ERROR This project is configured to use bun` で拒否 → 先に package.json を書き換える
- 脆弱性の個別無視は CLI フラグではなく `pnpm.auditConfig.ignoreGhsas`（package.json）

## gameserver（Bun.serve）

- `apps/gameserver` の `start`/`dev` は `bun run src/index.ts` / `bun --watch` のまま（Bun.serve 使用のため）
- bun バイナリは root devDep から `node_modules/.bin/bun` に入り、pnpm run 経由で PATH 解決される
- Bun.serve の使い方・backpressure 設定は `networking/SKILL.md`

## Vitest 維持判断（PH0-A で確立、pnpm 移行後も不変）

- テストを bun:test に寄せない。jsdom + @testing-library/react の DOM テスト資産と互換性を優先
- uWebSockets.js は glibc 前提バイナリで Sandbox 不可 → Bun.serve を採用した経緯（`networking/SKILL.md`）

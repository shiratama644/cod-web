---
name: bun-runtime
description: BunをSandboxで確実に動かすスキル。npm経由導入、restore-sandbox-env.sh、workspaces、serve、uWebSockets注意点、Vitest維持判断。
---

# Bun Runtime — Sandboxで確実にBunを使うスキル

> 仕様正本: `docs/arch/tech-stack.md`、`docs/ops/quality-gates.md`  
> ログ: `.agent/logs/2026-09-03_adopt-bun-runtime-and-package-manager.md`

## SandboxでBunを使う唯一の確実な経路

- `bun.sh` のinstallスクリプトはSandboxから到達不可（OpenSSL SSL_ERROR_SYSCALL）
- npmパッケージ `bun` 経由ならインストール・実行とも問題なし
- グローバル導入で `/usr/local/bin/bun` に置かれ、セッション中は永続（サンドボックス再構築では消えるのでrestoreスクリプト必須）

```bash
npm install -g bun@1.4.0
bun --version
```

### restore-sandbox-env.sh

- 元々 corepack+pnpm 前提だったが、bunにはcorepackが無い
- `package.json` の `devDependencies.bun` からバージョンを読んで `npm install -g bun@<ver>` する方式に変更済み
- `.nvmrc` と package.jsonのpackageManagerを読む汎用スクリプトなので、Nodeバージョン管理も兼ねる

```bash
./.agent/hooks/restore-sandbox-env.sh
```

## package.json固定

```json
{
  "devDependencies": {
    "bun": "1.4.0"
  },
  "packageManager": "bun@1.4.0",
  "workspaces": ["packages/*", "apps/*"]
}
```

- `bun init` 等は使わず Viteテンプレートをベースに package.jsonを用意
- `bun install` → 4検証をbunコマンドで通す

## Vitest維持判断（PH0-Aで確立）

- テストを bun:test に寄せない、jsdom + @testing-library/react のDOMテスト資産とR3Fの将来テストを考慮
- bunの強みはパッケージ管理・ランナー・サーバーランタイムで享受、テスト層は互換性優先
- Colyseus等のゲームサーバーがbunランタイムで完全動作するかはPhase1で実機確認が必要（リスクとしてPHASE00_PLAN §11相当で管理）

## Bun.serve注意

- ネイティブWSは内部でuWebSockets、追加パッケージ `uWebSockets.js` はbunでは動かない（PH0実績）
- `perMessageDeflate: false` 必須、60Hz高頻度では圧縮が遅延を生む

## CIでのBun

- `oven-sh/setup-bun@v2` を使う
- `bun install --frozen-lockfile` でlockb固定
- 公式: https://bun.com/docs/pm/cli/install / https://github.com/oven-sh/setup-bun

## 関連

- `.agent/logs/2026-09-03_adopt-bun-runtime-and-package-manager.md`
- `.agent/skills/tech-stack/SKILL.md`

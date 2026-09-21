---
name: sandbox-constraints
description: Sandbox / ブラウザ・ネットワーク / GitHub App の恒常的制約と迂回策。環境トラブル時に参照。
---

# Sandbox Constraints — 環境制約と迂回策

> AGENTS.md §6.2 の実態版。「乗り越える」のではなく「迂回する」。制約は修正対象ではない。

## 恒常的制約

| 制約 | 影響 | 対処 |
| :--- | :--- | :--- |
| **Chromium バイナリの install 不可** | Playwright がローカルで実行できない | Phase 1.5 では config/spec は実装できるが、Sandbox で browser 実行済みと主張しない。CI / 実環境のみ |
| **外部ネットワークの一部到達不可** | bun ゲームサーバーへの実 WS 結合が限定的 | パック/アンパック・入力キュー・`SimProfile.step` を純粋関数で Vitest。実結合は「**実環境検証待ち**」 |
| **3D のヘッドレス差** | Babylon / noa の目視が Sandbox では限定的 | ライブプレビューで確認。シムは DOM/GPU 非依存でテスト |
| **`.github/workflows/` 書き込み許可 (2026-09-19〜)** | 以前は書き込み不可だったが許可に変更 | 本番は `.github/workflows/quality-gates.yml` が唯一正本、proposal ymlは2026-09-22削除。旧制約は AGENTS.md §6.3 更新で解除 |
| **bun.sh install不可** | `bun.sh` SSL到達不可 | npm registry経由 `npm install -g bun@<ver>`、restoreスクリプトは `package.json devDependencies.bun` からversion読む |

## ゲーム開発での具体的な迂回パターン

- **ネットワーク**: バイナリ pack/unpack、seq、入力 FIFO、Lag Compensation の巻き戻しはソケット非依存の純粋関数 → Vitest。`ws.send` の戻り値分岐はモック（-1/0/1+）。実パケットは実環境確認。Coverage は baseline → meaningful → threshold ratchet、数字だけの shallow test を避ける。EM02では handlers.ts分離でBun.serveモック。
- **物理・当たり判定**: ヒット確定・ダメージは純粋関数。現行の three-mesh-bvh は bun ヘッドレスで動くが、理想形の fps は Babylon 側（移行後は現行 BVH テストを移植判定する）。PH2-Eでは `createPlaneWorld`（静的平面のみ）でheavy determinism 0.8s。
- **3D 表示**: jsdom で Canvas/WebGL をレンダリングしない。HUD など DOM とシムを分離する。Babylonは `babylonDeps.ts` ファサード分離 + `vi.mock` でWebGL非依存テスト。
- **決定論**: `step` に乱数・時計・I/O を入れない。同じ入力なら同じ出力のテストを書く。軽量smoke 100x10はunit常時、heavy 1000x100は `scripts/determinism-heavy.ts` 分離。
- **E2E**: Sandboxでは `bun run test:e2e -- --list` discoveryまで、browser実行は捏造しない。webServer配列 + PLAYWRIGHT_BASE_URL分岐でlocal/CI/preview同じspec。

## 復旧手順

- Sandbox 再構築時（`git log` が起点 1 件のみ / 大量削除+未追跡 / node_modules 無）は [`.agent/hooks/sandbox-rebuild-recovery.md`](../../hooks/sandbox-rebuild-recovery.md) ＋ [`restore-sandbox-env.sh`](../../hooks/restore-sandbox-env.sh)。復旧後は `git log` で b3dd3ed (PH2-E) まで戻っていることを確認してから作業再開（EM01知見）。
- `git fetch origin <session-branch>` → `reset --hard FETCH_HEAD` → `restore-sandbox-env.sh` が必須手順（頻発するため）。
- `bun run build` 後のバンドルは `ls -lh dist/assets` で確認（3D エンジンは大きい。重複依存・chunk 分割に注意）。

## 追加制約・知見（2026-09-20〜22）

- **pre-commit hook timeout**: `git commit` without --no-verifyは typecheck+biome+determinism+vitest 30files 189tests ~5sで15s timeoutする可能性。docs-onlyなら `--no-verify` で回避可（AGENTS.md §3.1）。
- **push timeout**: `git add -A; git commit; git push` 単一bashはpushで15s timeout。commitとpushを分離。
- **bun workspaces**: `restore-sandbox-env.sh` はbunにはcorepackが無い、npm経由固定。
- **リンクチェッカー**: Markdownリンク検査ではfenced codeとinline codeを除外して検査、 `[id](url)` 例示を実リンクとして誤検出しない。

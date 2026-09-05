---
name: sandbox-constraints
description: Sandbox / ブラウザ・ネットワーク / GitHub App の恒常的制約と迂回策。環境トラブル時に参照。
---

# Sandbox Constraints — 環境制約と迂回策

> AGENTS.md §6.2 の実態版。「乗り越える」のではなく「迂回する」。制約は修正対象ではない。

## 恒常的制約

| 制約 | 影響 | 対処 |
| :--- | :--- | :--- |
| **Chromium バイナリの install 不可** | Playwright がローカルで実行できない | `package.json` に `test:e2e` が無いなら捏造しない。ある場合も**実行しない**。CI のみ |
| **外部ネットワークの一部到達不可** | bun ゲームサーバーへの実 WS 結合が限定的 | パック/アンパック・入力キュー・`SimProfile.step` を純粋関数で Vitest。実結合は「**実環境検証待ち**」 |
| **3D のヘッドレス差** | Babylon / noa の目視が Sandbox では限定的 | ライブプレビューで確認。シムは DOM/GPU 非依存でテスト |
| **`.github/workflows/` 書き込み不可** | CI をリポジトリに直接置けない | YAML は `docs/ops/` に保管し、ユーザーが配置（AGENTS.md §6.3） |

## ゲーム開発での具体的な迂回パターン

- **ネットワーク**: バイナリ pack/unpack、seq、入力 FIFO、Lag Compensation の巻き戻しはソケット非依存の純粋関数 → Vitest。`ws.send` の戻り値分岐はモック。実パケットは実環境確認。
- **物理・当たり判定**: ヒット確定・ダメージは純粋関数。現行の three-mesh-bvh は bun ヘッドレスで動くが、理想形の fps は Babylon 側（移行後は現行 BVH テストを移植判定する）。
- **3D 表示**: jsdom で Canvas/WebGL をレンダリングしない。HUD など DOM とシムを分離する。
- **決定論**: `step` に乱数・時計・I/O を入れない。同じ入力なら同じ出力のテストを書く。

## 復旧手順

- Sandbox 再構築時（`git log` が起点 1 件のみ / 大量削除+未追跡 / node_modules 無）は [`.agent/hooks/sandbox-rebuild-recovery.md`](../../hooks/sandbox-rebuild-recovery.md) ＋ [`restore-sandbox-env.sh`](../../hooks/restore-sandbox-env.sh)。
- `bun run build` 後のバンドルは `ls -lh dist/assets` で確認（3D エンジンは大きい。重複依存・chunk 分割に注意）。

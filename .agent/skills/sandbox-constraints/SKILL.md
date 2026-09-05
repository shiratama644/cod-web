---
name: sandbox-constraints
description: Sandbox / ブラウザ・ネットワーク / GitHub App の恒常的制約と、その迂回策（E2E・実結合・WebGPU のローカル検証不可など）。環境トラブル時に参照。
---

# Sandbox Constraints — 環境制約と迂回策

> AGENTS.md §6.2 の実態版。Sandbox / ブラウザ・ネットワーク / GitHub App の制約と、その迂回方法。
> 「乗り越える」のではなく「迂回する」。制約は修正対象ではない。

## 恒常的制約

| 制約 | 影響 | 対処 |
| :--- | :--- | :--- |
| **Chromium バイナリの install 不可** | Playwright（E2E）がローカルで実行できない | E2E は**書けるが実行しない**。CI（GitHub Actions）上でのみ実行。ローカルで無理に走らせない（AGENTS.md §6.2） |
| **外部ネットワークの一部到達不可** | ゲームサーバー（Colyseus / geckos.io）や外部 API への実結合が Sandbox では限定的 | ネットワーク結合が要る機能は、ロジックを純粋関数・モック境界で分離してユニットテスト。実結合は CI / 実機確認として「**実環境検証待ち**」で報告 |
| **WebGPU のヘッドレス/ブラウザ差** | 3D レンダリングの目視確認が Sandbox では限定的 | シーン表示はライブプレビュー（ユーザーのブラウザ）で確認。ロジック（ECS・物理・判定の入出力）は WebGL/WebGPU 非依存の純粋関数に分離してユニットテスト |
| **`.github/workflows/` 書き込み不可** | CI ワークフローをリポジトリに直接置けない | ワークフロー YAML は `docs/ops/` に保管し、ユーザーが手動で `.github/workflows/` へ配置（AGENTS.md §6.3） |

## ゲーム開発での具体的な迂回パターン

- **ネットワーク**: サーバー/クライアント共有の状態同期ロジック（リコンサイル・入力バッファ・Lag Compensation の巻き戻し計算）は、socket/geckos に依存しない純粋関数として実装 → Vitest で入出力を検証。実パケット送受は実環境確認。
- **物理・当たり判定**: Rapier の WASM や three-mesh-bvh のレイキャスト結果を直接テストできない部分は、判定ロジック（命中条件・ダメージ計算）を純粋関数に切り出してテスト。
- **ECS**: システム（system）はコンポーネント配列を入出力する純粋関数にし、Canvas 非依存でテスト。
- **3D 表示**: R3F の `<Canvas>` を jsdom でレンダリングすると WebGL 未サポートで失敗しうる。WebGL 非依存の UI・ロジックとシーンコンポーネントを分離する。

## 復旧手順

- Sandbox 再構築時（`git log` が起点 1 件のみ / 大量削除+未追跡 / node_modules 無）は [`.agent/hooks/sandbox-rebuild-recovery.md`](../../hooks/sandbox-rebuild-recovery.md) ＋ [`restore-sandbox-env.sh`](../../hooks/restore-sandbox-env.sh) に従う。
- `bun run build` 後のバンドルサイズは `ls -lh dist/assets` 等で直接確認（Three.js はバンドルが大きいため、重複依存・chunk 分割に注意）。

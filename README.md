# cod-web

ブラウザで動く **AAA級クロスプラットフォーム・オンラインFPS**。PC（マウス＆キーボード / ゲームパッド）とモバイル（タッチ / 仮想スティック / ジェスチャー）の両対応を目標とし、権威型ゲームサーバー＋超低遅延 UDP 通信（WebRTC）＋クライアント予測・サーバー調停のアーキテクチャで開発します。

技術スタックの全容と設計ルールは [`docs/CONFIG.md`](./docs/CONFIG.md) を参照してください。

## 技術構成（要点）

| 層 | 使用技術 |
| --- | --- |
| 3D レンダリング | Three.js（WebGPU ファースト + WebGL2 フォールバック）/ @react-three/fiber / @react-three/drei、TSL |
| 物理・当たり判定 | @react-three/rapier（クライアント）/ Rapier（サーバー）、three-mesh-bvh（射撃判定） |
| ゲームロジック | ECS（miniplex / biteps）、ゲームループは React レンダリングから分離 |
| ネットワーク | Colyseus（権威サーバー）/ geckos.io（UDP over WebRTC）/ socket.io（ロビー等）/ LiveKit（ボイス） |
| UI / 状態 | React + TypeScript、Zustand（ゲーム状態）、Radix UI、framer-motion、lucide-react |
| オーディオ | Web Audio API（HRTF 立体音響）、howler.js、resonance-audio |
| ビルド / ツール | Vite、bun、Biome（Lint/Format）、Vitest、Playwright（E2E） |

## セットアップ（プロジェクト初期化後に有効）

```bash
bun install            # 依存インストール（bun.lock 使用）
bun run dev            # 開発サーバ（Vite）
bun run typecheck      # 型チェック（tsc --noEmit）
bun run lint           # Biome lint
bun run test:unit      # 単体テスト（Vitest run、watch ではない）
bun run build          # 本番ビルド（vite build）
bun run preview        # 本番ビルドのローカル確認
bun run test:e2e       # E2E（Playwright、CI 推奨）
```

> **ランタイム/パッケージ管理は bun**（`bun install` / `bun run` / `bunx`、ロックファイルは `bun.lock`）。
> bun が未インストールの環境では `npm install -g bun`（npm 経由）で導入できます。
> なおテストランナーは Vitest を使用し、bun 組み込みの `bun test` は使いません（jsdom +
> @testing-library との互換性優先）。ゲームサーバーのランタイムも bun を想定しています。

> 現状はリポジトリ初期化前（ドキュメント/ガバナンスのみ）。`package.json` は
> Phase 0（`docs/task-list.md`）で作成します。

## 開発ドキュメント

- [`AGENTS.md`](./AGENTS.md) — AI Agent 開発規約（コミット手順・検証・Git 運用・コミュニケーション）。**作業時の最優先規約**
- [`docs/CONFIG.md`](./docs/CONFIG.md) — 技術スタック完全ガイド＋AAA 品質の設計・実装黄金ルール
- [`docs/README.md`](./docs/README.md) — ドキュメント索引
- [`docs/task-list.md`](./docs/task-list.md) — **タスク管理の唯一の正本**（進捗・証拠）
- [`docs/planning/`](./docs/planning/) — フェーズ別計画書（`_TEMPLATE.md` 準拠）
- [`.agent/`](./.agent) — Agent の記憶システム（skills: コードベース知識 / hooks: 定型手順 / logs: 実行記録）

## ライセンス

ライセンスファイルは Phase 0 で配置予定。

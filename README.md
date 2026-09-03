# cod-web

[Krunker.io](https://krunker.io) にインスパイアされた、ブラウザで動く**クロスプラットフォーム・オンラインFPS**（Krunker の完全上位互換を目指す）。

**最重要目標: どの端末（PC ブラウザ / スマートフォン / タブレット）でも安定 60FPS 以上**。Krunker と同等以上の軽量さ・低遅延・高速読み込みを優先し、PC（マウス＆キーボード / ゲームパッド）とモバイル（タッチ / 仮想スティック / ジェスチャー）の両対応とします。レンダラーは **WebGPU を最優先、WebGPU が使えない端末では WebGL2 へ自動フォールバック**します。

技術スタックの全容と設計ルールは [`docs/arch/tech-stack.md`](./docs/arch/tech-stack.md) を参照してください。

## 技術構成（要点）

| 層 | 使用技術 |
| --- | --- |
| 3D レンダリング | Three.js（**WebGPU 最優先 + WebGL2 自動フォールバック**、WebGL2 が全端末の基準）/ @react-three/fiber / @react-three/drei、TSL |
| 衝突・当たり判定 | **three-mesh-bvh**（キネマティック・キャラクターコントローラー＝浮遊カプセルのマップ衝突 ＋ 射撃レイ、ヘッドレス対応）。マップは 3D Mesh Map（GLTF）。剛体エンジンは当初不使用 |
| アニメーション | Three.js AnimationMixer ＋ **XState v5**（状態遷移 FSM） |
| ゲームロジック | ECS（miniplex / bitecs 候補、Phase 1 で選定）、ゲームループは React レンダリングから分離 |
| ネットワーク | 権威型サーバー + クライアント予測・サーバー調停 + ラグ補償。**WebTransport（HTTP/3・datagrams+streams）主 / WebSocket フォールバック**、シミュレーション tick 60Hz・スナップショット送信 30Hz・入力 60Hz、描画は可変フレームレート。[設計記録](docs/arch/networking.md) |
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
```

> **ランタイム/パッケージ管理は bun**（`bun install` / `bun run` / `bunx`、ロックファイルは `bun.lock`）。
> bun が未インストールの環境では `npm install -g bun`（npm 経由）で導入できます。
> なおテストランナーは Vitest を使用し、bun 組み込みの `bun test` は使いません（jsdom +
> @testing-library との互換性優先）。ゲームサーバーのランタイムも bun を想定しています。

> **進捗: Phase 0（プロジェクト基盤）** — `bun install` で Vite + React 19 + TypeScript + R3F
> （three/webgpu 最優先・WebGL2 自動フォールバック）+ Biome + Vitest + Zustand の基盤が動作します。
> ゲームプレイ・ネットワークは Phase 1 以降。タスク状況は [`docs/task-list.md`](./docs/task-list.md) を参照。

## 開発ドキュメント

- [`AGENTS.md`](./AGENTS.md) — AI Agent 開発規約（コミット手順・検証・Git 運用・コミュニケーション）。**作業時の最優先規約**
- [`docs/arch/tech-stack.md`](./docs/arch/tech-stack.md) — 技術スタック完全ガイド＋全端末 60FPS・WebGPU/WebGL2 の設計・実装黄金ルール
- [`docs/README.md`](./docs/README.md) — ドキュメント索引
- [`docs/task-list.md`](./docs/task-list.md) — **タスク管理の唯一の正本**（進捗・証拠）
- [`docs/planning/`](./docs/planning/) — フェーズ別計画書（`_TEMPLATE.md` 準拠）
- [`.agent/`](./.agent) — Agent の記憶システム（skills: コードベース知識 / hooks: 定型手順 / logs: 実行記録）

## ライセンス

ライセンスファイルは Phase 0 で配置予定。

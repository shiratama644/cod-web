# cod-web

[Krunker.io](https://krunker.io) にインスパイアされた、ブラウザで動く**クロスプラットフォーム・オンラインFPS**（Krunker の完全上位互換を目指す）。

**最重要目標: どの端末（PC ブラウザ / スマートフォン / タブレット）でも安定 60FPS 以上**。Krunker と同等以上の軽量さ・低遅延・高速読み込みを優先し、PC（マウス＆キーボード / ゲームパッド）とモバイル（タッチ / 仮想スティック / ジェスチャー）の両対応とします。レンダラーは **WebGPU を最優先、WebGPU が使えない端末では WebGL2 へ自動フォールバック**します。

技術スタックの全容と設計ルールは [`docs/arch/tech-stack.md`](./docs/arch/tech-stack.md) を参照してください。

## 技術構成（要点）

| パス | 内容 |
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

# 本番構成を一括起動（ビルド → ゲームサーバ＋Web クライアントを並列、ログ色分け）
bun run start          # = scripts/execute.ts: vite build → bun run server + vite preview

# 開発時は 2 プロセスを個別に起動する（HMR が効く）
bun run server         # 権威ゲームサーバ（bun・ネイティブ WebSocket、:8080、60Hz シム/30Hz 送信）
bun run dev            # 開発サーバ（Vite、:5173。/ws をゲームサーバへプロキシ）

bun run typecheck      # 型チェック（クライアント/shared とサーバの 2 構成）
bun run lint           # Biome lint
bun run test:unit      # 単体テスト（Vitest run、watch ではない）
bun run build          # 本番ビルド（vite build）
bun run preview        # 本番ビルドのローカル確認（:4173、/ws をプロキシ）
```

> **一括起動（`bun run start` / `scripts/execute.ts`）**: `vite build` を先に実行し、
> 成功したら **ゲームサーバ（:8080）と Web クライアントの本番プレビュー（:4173）を
> 並列起動**します。ログはプロセスごとに色分けされます —
> **[BUILD]** シアン（ビルド）／**[SERVER]** 緑（ゲームサーバ）／**[CLIENT]** マゼンタ
> （vite preview）。Ctrl+C で両プロセスを終了します。

> **マルチプレイヤーの確認方法**: `bun run start`（または `bun run server` と
> `bun run dev`）を起動し、ブラウザで http://localhost:4173 （開発時は 5173）を開く。
> **「TAP TO START」をタップで全画面化**し、PC はクリックでマウスロック、スマホは
> 画面を**ドラッグで視点操作**、**WASD（物理キーボード）で移動**。タブをもう 1 つ開いて
> 同じ URL に接続すると、互いのプレイヤー（カプセル）が 100ms 補間で滑らかに動いて見える。
> 接続先は同一オリジンの `/ws`（Vite がゲームサーバへプロキシ）。

> **テストの配置**: テストファイルはすべて **`./_tests_/`** 配下に集約し、ソースと
> **同じディレクトリ構造をミラー**します（例: `src/lib/clamp.ts` →
> `_tests_/src/lib/clamp.test.ts`、`server/room/Room.ts` → `_tests_/server/room/Room.test.ts`）。
> import は相対パスではなく `@/`（src）・`@shared/`（shared）・`@server/`（server）の
> エイリアスを使います。

> **ランタイム/パッケージ管理は bun**（`bun install` / `bun run` / `bunx`、ロックファイルは `bun.lock`）。
> bun が未インストールの環境では `npm install -g bun`（npm 経由）で導入できます。
> なおテストランナーは Vitest を使用し、bun 組み込みの `bun test` は使いません（jsdom +
> @testing-library との互換性優先）。ゲームサーバーのランタイムも bun を想定しています。

> **進捗: Phase 1（ネットワーク初期・位置同期）実装中** — Phase 0 の基盤（Vite + React 19 +
> TypeScript + R3F［three/webgpu 最優先・WebGL2 自動フォールバック］+ Biome + Vitest + Zustand）の上に、
> bun の権威ゲームサーバ（60Hz シミュレーション・30Hz スナップショット・ネイティブ WebSocket）と
> shared の純粋ゲームロジック（three-mesh-bvh のキネマティック移動・バイナリパケット）、クライアント
> 予測・リモート補間・調停を実装。**動くプレイヤーが互いに見える位置同期**がゴール。射撃・ラグ補償判定・
> マッチメイキング等は後続フェーズ。タスク状況は [`docs/task-list.md`](./docs/task-list.md)、計画は
> [`docs/planning/PHASE01_PLAN.md`](./docs/planning/PHASE01_PLAN.md) を参照。

## 開発ドキュメント

- [`AGENTS.md`](./AGENTS.md) — AI Agent 開発規約（コミット手順・検証・Git 運用・コミュニケーション）。**作業時の最優先規約**
- [`docs/arch/tech-stack.md`](./docs/arch/tech-stack.md) — 技術スタック完全ガイド＋全端末 60FPS・WebGPU/WebGL2 の設計・実装黄金ルール
- [`docs/README.md`](./docs/README.md) — ドキュメント索引
- [`docs/task-list.md`](./docs/task-list.md) — **タスク管理の唯一の正本**（進捗・証拠）
- [`docs/planning/`](./docs/planning/) — フェーズ別計画書（`_TEMPLATE.md` 準拠）
- [`.agent/`](./.agent) — Agent の記憶システム（skills: コードベース知識 / hooks: 定型手順 / logs: 実行記録）

## ライセンス

ライセンスファイルは Phase 0 で配置予定。

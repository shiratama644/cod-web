# Project Overview — cod-web

> 製品の全体像。新規セッションの最初に読む 1 ファイル。技術スタックの網羅は [`../../docs/CONFIG.md`](../../docs/CONFIG.md) が正。

## 製品

**cod-web** は、ブラウザで動く **AAA級クロスプラットフォーム・オンラインFPS**。

- PC（マウス＆キーボード / ゲームパッド）＋ モバイル（タッチ / 仮想スティック / ジェスチャー）両対応
- アーキテクチャ: 権威型ゲームサーバー ＋ 超低遅延 UDP（WebRTC）＋ クライアント予測・サーバー調停
- 目標: 低遅延・高フレームレート（60〜120 FPS）・高品質グラフィックス

## 技術スタック（要点）

| 層 | 技術 |
| :--- | :--- |
| ビルド | **Vite** + React + TypeScript（strict）、bun |
| 3D | Three.js（**WebGPU ファースト** + WebGL2 フォールバック）/ @react-three/fiber / @react-three/drei、TSL |
| 物理・判定 | @react-three/rapier（クライアント）/ Rapier（サーバー）、**three-mesh-bvh**（射撃判定） |
| ECS | miniplex / @miniplex/react（R3F 向け）、bitecs（TypedArray・GCレス） |
| ネットワーク | **Colyseus**（権威サーバー）/ **geckos.io**（UDP over WebRTC）/ socket.io（ロビー等）/ LiveKit（ボイス）/ msgpackr・protobufjs（シリアライズ） |
| UI / 状態 | React、**Zustand**（ゲーム状態、Context 不使用）、Radix UI、framer-motion、lucide-react、troika-three-text（3Dテキスト） |
| オーディオ | Web Audio API（HRTF）、howler.js、resonance-audio、drei PositionalAudio |
| アセット | useGLTF/useTexture、gltfjsx、DRACO / meshoptimizer / KTX2、@gltf-transform |
| Lint / Test | **Biome**（ESLint/Prettier 不使用）、Vitest + @testing-library/react、Playwright（E2E・CI のみ） |

詳細・ライブラリの役割分担は [`tech-stack.md`](./tech-stack.md)、設計ルールは [`game-engineering-principles.md`](./game-engineering-principles.md) を参照。

## フェーズ進捗

> 進捗の正本は [`docs/task-list.md`](../../docs/task-list.md)。下表は要点のみ。

| Phase | 内容 | 状態 |
| :--- | :--- | :--- |
| **0** | プロジェクト基盤（Vite/React/TS/Biome/Vitest、R3F シーン、ゲームループ骨架、Zustand） | ⏳ 計画済み・未着手（[`PHASE00_PLAN.md`](../../docs/planning/PHASE00_PLAN.md)） |
| 1 以降 | プレイヤー操作 / 物理・判定 / ECS / 武器・射撃 / ネットワーク / ボイス / HUD / モバイル入力 / アセット / パフォーマンス | 未定（Phase 0 完了後に計画） |

## 規模

プロジェクト初期化前（ドキュメント/ガバナンスのみ）。`package.json`・`src/` は Phase 0 で作成。

## 関連

- 開発規約・コミット手順・検証: [`../../AGENTS.md`](../../AGENTS.md)
- 技術スタック完全ガイド: [`../../docs/CONFIG.md`](../../docs/CONFIG.md)
- タスク正本: [`../../docs/task-list.md`](../../docs/task-list.md)

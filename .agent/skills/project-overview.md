# Project Overview — cod-web

> 製品の全体像。新規セッションの最初に読む 1 ファイル。技術スタックの網羅は [`../../docs/arch/tech-stack.md`](../../docs/arch/tech-stack.md) が正。

## 製品

**cod-web** は、[Krunker.io](https://krunker.io) にインスパイアされたブラウザ向け**クロスプラットフォーム・オンラインFPS**（Krunker の完全上位互換を目指す）。

- **最重要目標: どの端末（PC ブラウザ / スマートフォン / タブレット）でも安定 60FPS 以上**。軽量さ・低遅延・高速読み込みを優先し、重厚な AAA グラフィックスは優先しない
- PC（マウス＆キーボード / ゲームパッド）＋ モバイル（タッチ / 仮想スティック / ジェスチャー）両対応
- アーキテクチャ: 権威型ゲームサーバー ＋ クライアント予測・サーバー調停 ＋ ラグ補償。トランスポートは **WebTransport（datagrams+streams）主 / WebSocket フォールバック**で確定（[networking](../../docs/arch/networking.md)）。サーバー tick・入力 30Hz、描画は可変フレームレート
- **レンダラー: WebGPU 最優先 + WebGL2 自動フォールバック**（WebGL2 を全端末 60FPS の基準レンダラーとする）
- **描画 FPS は可変**（rAF = 60〜120Hz+。60 は下限フロアであり上限ではない）、delta time ベースでネット tick と独立

## 技術スタック（要点）

| 層 | 技術 |
| :--- | :--- |
| ビルド | **Vite** + React + TypeScript（strict）、bun |
| 3D | Three.js（**WebGPU 最優先 + WebGL2 自動フォールバック**、WebGL2 が全端末 60FPS の基準）/ @react-three/fiber / @react-three/drei、TSL |
| 物理・判定 | @react-three/rapier（クライアント）/ Rapier（サーバー）、**three-mesh-bvh**（射撃判定） |
| ECS | miniplex / @miniplex/react（R3F 向け）、bitecs（TypedArray・GCレス） |
| ネットワーク | 権威サーバー + クライアント予測・サーバー調停 + ラグ補償。**WebTransport（HTTP/3・datagrams+streams）主 / WebSocket フォールバック**。サーバー tick・入力 30Hz。シリアライズは msgpackr。FX はアクションフラグ＋トリガーのみ送信しクライアント再生 |
| UI / 状態 | React、**Zustand**（ゲーム状態、Context 不使用）、Radix UI、framer-motion、lucide-react、troika-three-text（3Dテキスト） |
| オーディオ | Web Audio API（HRTF）、howler.js、resonance-audio、drei PositionalAudio |
| アセット | useGLTF/useTexture、gltfjsx、DRACO / meshoptimizer / KTX2、@gltf-transform |
| Lint / Test | **Biome**（ESLint/Prettier 不使用）、Vitest + @testing-library/react、Playwright（E2E・CI のみ） |

詳細・ライブラリの役割分担は [`tech-stack.md`](./tech-stack.md)、設計ルールは [`docs/arch/game-engineering-principles.md`](../../docs/arch/game-engineering-principles.md) を参照。

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
- 技術スタック完全ガイド: [`../../docs/arch/tech-stack.md`](../../docs/arch/tech-stack.md)
- タスク正本: [`../../docs/task-list.md`](../../docs/task-list.md)

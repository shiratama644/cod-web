# Tech Stack — cod-web の技術構成

> ライブラリの役割・選定理由・使い分け。網羅の大本は [`../../docs/CONFIG.md`](../../docs/CONFIG.md)（そちらが正）。
> このスキルは「実装時にどれを使うか」の判断用。プロジェクト初期化（Phase 0）後に実際のバージョンを追記して育てる。

## レンダリング（3D）

| ライブラリ | 役割 | 使いどころ |
| :--- | :--- | :--- |
| `three` | 3D レンダリングエンジン | 全 3D の基盤。WebGPU レンダラー（`three/webgpu`）+ TSL、WebGL2 へ自動フォールバック |
| `@react-three/fiber` | React 用 Three.js ラッパー | 宣言的シーン。`useFrame` で毎フレーム更新 |
| `@react-three/drei` | R3F ユーティリティ集 | `Environment` / `PointerLockControls` / `Html`（3D内HTML）/ `PositionalAudio` / `useGLTF` / `useTexture` / `Preload` 等 |
| `troika-three-text` | SDF 3D テキスト | 頭上ネームタグ・ダメージポップアップの高速描画 |

## 物理・当たり判定

| ライブラリ | 役割 |
| :--- | :--- |
| `@react-three/rapier` | クライアント物理（WASM 版 Rapier）。プレイヤー移動・剛体・投射物 |
| Rapier（サーバー） | 権威物理。チート防止・サーバー調停に必須 |
| `three-mesh-bvh` | 高速 BVH レイキャスト。**射撃判定をクライアント側でローカル即時判定**（数万ポリゴンもミリ秒未満） |
| `three-bvh-csg` | リアルタイム CSG（弾痕・破壊表現） |

## ECS・大量オブジェクト

- `miniplex` / `@miniplex/react`: R3F 向け ECS。弾丸・ドロップアイテム・エフェクトのライフサイクルをデータ指向で処理。
- `bitecs`: TypedArray ベースの高性能 ECS。サーバー/クライアント共通で数万エンティティを GC レス処理。

## ネットワーク

> ✅ **トランスポートは確定**（2026-09-03、詳細は [`../../docs/planning/NETWORK_DESIGN.md`](../../docs/planning/NETWORK_DESIGN.md)）。**WebTransport 主 / WebSocket フォールバック**。

| 技術 | 用途 | 特性 |
| :--- | :--- | :--- |
| **WebTransport**（ブラウザ標準） | **主トランスポート** | HTTP/3・QUIC over UDP/443。datagrams（非信頼・HOL なし）= 座標・入力・状態、streams（信頼）= ダメージ確定・チャット。NAT 越え（STUN/TURN）不要。Chrome97+/FF114+/Safari26.4。**UDP/443 ブロック・非対応時は WS へ自動フォールバック** |
| **WebSocket**（`ws` / Bun.serve） | フォールバック＆信頼チャネル | チャット・ロビー・マッチメイキング、WT 不可環境のゲームプレイ。bun ネイティブ（uWS）。Krunker.io も socket.io 方式 |
| **Caddy**（HTTP/3 エッジ） | HTTP/3・WebTransport 終端 | bun は WT サーバー未実装のためエッジで終端し bun（WS＋ロジック）へプロキシ。bun の WT 対応後に寄せる |
| ~~geckos.io~~ | 不採用 | WebRTC-UDP だが node-datachannel ネイティブ依存で bun 非互換の恐れ、別 UDP ポートが FW に弱い |
| Colyseus | 権威サーバーFW（選択肢） | ルーム管理・状態同期の候補。自前軽量実装と Phase 1 で比較 |
| `livekit-client` | WebRTC ボイス（後方フェーズ） | 近接ボイチャ。WebRTC MediaStream/SFU でゲームデータとは別系統 |
| **msgpackr** | バイナリシリアライズ | **全メッセージで採用**。高頻度パケットは将来 bitpacking へ移行する余地を残す |
| protobufjs | 将来の選択肢 | スキーマ厳密管理が必要になった場合 |

**tick/描画**: サーバー tick・入力・状態スナップショット = **30Hz**。描画 = **可変フレームレート（60〜120Hz+、rAF 準拠、60 は下限フロア）**で tick と独立、delta time ベース。

## UI / 状態

- **Zustand**: ゲーム状態（HP / 残弾 / キルログ / スコア / プレイヤー座標）。**Context API は新規使用しない**。毎フレーム更新は `getState()` / `subscribe` で React レンダリングを介さない（[game-engineering-principles.md](./game-engineering-principles.md)）。
- Radix UI: 設定メニュー・クロスヘア選択・スコアボード・スライダー等のアクセシブル UI。
- framer-motion: キルフィード・被弾赤フラッシュ・ヒットマーカー等の UI モーション。
- `lucide-react`: アイコン。

## オーディオ

- drei `PositionalAudio` / Web Audio API HRTF: 足音・銃声の方向・距離定位。
- `howler.js`: BGM / UI 効果音 / 環境音の同時発音数制御・プリロード。
- `resonance-audio`: HRTF・残響・遮蔽（オクルージョン）。

## アセットパイプライン

- drei `useGLTF` / `useTexture`（`preload()` 付き、Suspense 対応）。
- `gltfjsx`: GLTF → React コンポーネント化。
- `three-stdlib`: KTX2Loader / DRACOLoader 等の拡張ローダー。
- DRACO / meshoperator / KTX2 (Basis Universal): メッシュ・テクスチャ圧縮（モバイル VRAM 対策）。
- `@gltf-transform/core`: ポリゴン削減・KTX2 変換・LOD 自動生成（ビルドツール）。

## VFX・アニメーション・シェーダー

- パーティクル: `three.quarks` 等。`InstancedMesh` / `BatchedMesh` で Draw Call 削減。
- ポストプロセス: `@react-three/postprocessing`。
- アニメーション: Three.js ミキサー + IK / FSM、WebGPU compute は TSL で記述。

## ツールチェーン

| 用途 | 技術 |
| :--- | :--- |
| ビルド/Dev | Vite（`bun run dev` / `bun run build` / `bun run preview`） |
| Lint/Format | **Biome**（ESLint/Prettier 不使用） |
| Unit | **Vitest** + @testing-library/react（jsdom） |
| E2E | **Playwright**（Chromium、CI のみ・Sandbox 実行不可、[sandbox-constraints.md](./sandbox-constraints.md)） |
| パッケージ / ランタイム | **bun**（`bun install` / `bun run` / `bunx`、`bun.lock`）+ Node LTS（`.nvmrc`）。ゲームサーバーも bun ランタイムを想定 |

## 導入時の注意（実装で確認したら追記）

<!-- Phase 0 で実際にバージョン固定・ハマりどころを記録していく。 -->
- **bun**: Sandbox ではプリインストールされていない。`bun.sh` は SSL エラーで到達不可だが、**npm registry 経由なら導入可**（2026-09-03 に `bun 1.4.0` で install / run / test 動作確認済み）。導入は `npm install -g bun`、復旧は `restore-sandbox-env.sh`。テストランナーは Vitest を使い `bun test` は使わない（AGENTS.md §6.1）。
- ライブラリの API 仕様に不安があれば Web 検索（threejs.org / docs.pmnd.rs / colyseus.io 等の公式を優先、AGENTS.md §7.5）。
- ネットワークは **WebTransport 主 / WebSocket フォールバック**で確定（[NETWORK_DESIGN](../../docs/planning/NETWORK_DESIGN.md)）。bun は WebTransport サーバー未実装（HTTP/3 は v1.3.14 で実験サポート、WT は issue #13656 で進行中）のため、初期は Caddy エッジで HTTP/3 終端 → bun（WS＋ロジック）。WT の bun ネイティブ対応状況は Phase 1 で再調査。
- ブラウザは WebTransport が Safari26.4（2026-03）で Baseline 入り。古い Safari・iOS WebView・UDP/443 ブロック企業網では WS へフォールバックが必須。
- geckos.io は不採用（node-datachannel ネイティブ依存で bun 非互換の恐れ、別 UDP ポートが FW に弱い）。
- **Krunker.io は socket.io（WebSocket/TCP）で動作**し、クライアント予測＋ラグ補償で高速感を実現。「ブラウザFPS＝UDP 必須」ではない。

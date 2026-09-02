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

> ⚠️ **トランスポートは議論中・未確定**（2026-09-03）。下表は候補。確定するまで特定ライブラリにハードコードしない（AGENTS.md §6.6）。

| ライブラリ | 用途 | 特性 |
| :--- | :--- | :--- |
| **Colyseus** | 権威ゲームサーバー（ルーム管理・状態同期） | クライアント予測・サーバー調停の母体。WebSocket ベース・MIT・セルフホスト可 |
| **socket.io** | WebSocket（TCP） | Krunker.io も採用する方式。チャット・ロビー・マッチメイキング。信頼性・順序保証（ヘッドオブラインブロッキングあり）。bun/Node で動く |
| **geckos.io** | UDP over WebRTC（unreliable/unordered） | 座標・入力・射撃イベント向け。パケットロス許容・HOL ブロッキングなし。ただしシグナリング(ポート 9208)・STUN/TURN・UDP ポート開放が必要でデプロイ複雑。サーバーは node-datachannel ネイティブ依存で **bun 互換は未検証** |
| `livekit-client` | WebRTC ボイス | 近接ボイチャ（Proximity Voice）。機能確定後に導入検討 |
| `msgpackr` / `protobufjs` | バイナリシリアライズ | パケット圧縮 |

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
- ネットワーク（Colyseus / socket.io / geckos.io）の選定と bun ランタイム互換はネットワークフェーズ（Phase 1 以降）で実機検証。特に geckos.io はサーバー側が node-datachannel（ネイティブ）依存のため bun で動かない可能性があり、要確認。
- **Krunker.io は socket.io（WebSocket/TCP）で動作**し、クライアント予測＋ラグ補償で高速感を実現（2026-09-03 調査）。「ブラウザFPS＝UDP 必須」ではなく、WebSocket でも小部屋なら十分実用的。

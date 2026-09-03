# モジュール & アーキテクチャ構成（仕様書）

> コードベースを**どうモジュール分割し、どの責務をどこに置くか**の設計仕様。
> 「どのライブラリを使うか」は [`tech-stack.md`](./tech-stack.md)、「ネットワークのプロトコル・信頼性」は [`networking.md`](./networking.md)、設計原則は [`game-engineering-principles.md`](./game-engineering-principles.md) を参照。
> Phase 0（基盤）では `client` の骨組みを作り、`shared` / `server` は Phase 1（ネットワーク）で具体化する。

## 1. 全体の層構成

大きく **4 つの実行主体**に分ける。

```
┌─────────────────────────────────────────────────────────────┐
│ Client（ブラウザ / Vite + React + R3F、bun でビルド）          │
│  描画（可変FPS）・入力・予測・補間・FX再生・HUD                 │
└───────────────┬──────────────────────────────┬──────────────┘
                │ リアルタイム（WebTransport/WS）│ HTTPS（REST/CDN）
┌───────────────▼──────────────┐   ┌───────────▼───────────────┐
│ Game Server（bun・権威）       │   │ Web API / CDN（HTTPS）      │
│  30Hz 固定シミュレーション・     │   │  認証・課金・インベントリ・   │
│  ルーム・マッチ・ラグ補償       │   │  戦績（DB）・アセット配信     │
└───────────────┬──────────────┘   └───────────────────────────┘
                │
        ┌───────▼────────┐
        │ Shared（共有）   │  クライアント/サーバー両方から import
        │  型・プロトコル・  │  bun でもブラウザでも動く純粋コード
        │  純粋ゲームロジック│
        └────────────────┘
```

- **Client** と **Game Server** はともに **Shared** に依存する（双方向依存はしない）。
- **Game Server はレンダラー（WebGPU/WebGL）/ React / DOM に依存しない**（ヘッドレス）。ただし **three の core/math（Vector3・Capsule・Geometry 等）と three-mesh-bvh は CPU のみで WebGL 不要**なので、`shared` の衝突計算（BVH）経由でサーバーも使う（同一マップ・同一 BVH で権威計算）。
- **課金・認証・永続化** はリアルタイムのゲームサーバーと分離し、HTTPS API + DB で扱う（[`networking.md`](./networking.md) §4.3）。

## 2. 責務分担の原則

| 責務 | 置く場所 | 理由 |
| :--- | :--- | :--- |
| 描画・アニメーション・FX 再生 | Client | 可変 FPS（rAF）。サーバーは関知しない |
| 入力収集（マウス/キー/パッド/タッチ） | Client | デバイス API はブラウザのみ |
| クライアント予測・補間・調停 | Client（ロジックは Shared） | 体感向上。純粋計算は Shared に置いてテスト |
| 位置・当たり判定・ダメージ・スコアの**確定** | **Game Server（権威）** | チート防止。クライアント判定は先行表示のみ |
| ラグ補償（位置履歴の巻き戻し） | Game Server（計算は Shared） | 権威判定の一部 |
| 30Hz 固定シミュレーション | Game Server（ロジックは Shared） | 描画とは独立した固定 tick |
| メッセージ型・シリアライズ・プロトコル定数 | **Shared** | クライアント/サーバーで同一の定義を使う |
| 移動計算・当たり判定ロジック（純粋関数） | **Shared** | 予測と権威シミュレーションで同一コードを共有 |
| 認証・課金・インベントリ・戦績 | Web API（HTTPS） | ACID・冪等性・DB 永続化 |
| アセット（GLTF/KTX2）配信 | CDN（HTTPS） | 大容量・キャッシュ |

> 重要: **クライアント予測とサーバー権威シミュレーションは同じ純粋関数（Shared）を呼ぶ**。これにより「予測した結果」と「サーバー確定結果」が食い違わず、調停（Reconciliation）がシンプルになる。

## 3. Client モジュール構成（`src/`）

Phase 0 で作成する Vite + React + R3F のクライアント。

```
src/
├── main.tsx                # エントリ（React マウント）
├── App.tsx                 # アプリのルート
├── game/                   # ★ ゲーム本体（React の外側のループを含む）
│   ├── scene/              # R3F シーン（Canvas・カメラ・ライト・地面・オブジェクト）
│   ├── loop/               # ゲームループ（useFrame・可変FPS・delta time・ゼロアロケーション）
│   ├── ecs/                # ECS（miniplex/bitecs）。エンティティ・コンポーネント・システム
│   ├── player/             # プレイヤー制御（three-mesh-bvh キネマティックCC の薄い R3F ラッパー）・カメラ・武器ビューモデル
│   ├── input/              # 入力アダプタ（PointerLock/Keyboard/joypad/nipplejs タッチ）
│   ├── fx/                 # エフェクト・パーティクル・トレーサー（フラグ/トリガーから決定論的再生）
│   ├── net/                # ネット層（Client）
│   │   ├── transport.ts    #   NetTransport 抽象インターフェース（Phase 0 で定義のみ）
│   │   ├── webtransport.ts #   WebTransport 実装（datagrams/streams）
│   │   ├── websocket.ts    #   WebSocket フォールバック実装
│   │   ├── prediction.ts   #   クライアント予測
│   │   ├── reconciliation.ts # サーバー確定値との調停
│   │   └── interpolation.ts  # リモートエンティティ補間（~100ms バッファ）
│   └── audio/              # 3D 立体音響（howler / PositionalAudio）
├── components/             # React UI（HUD・メニュー・設定・スコアボード）
├── store/                  # Zustand ストア（ゲーム状態。高頻度は getState/subscribe）
└── lib/                    # 汎用ユーティリティ（DOM/Three 依存なしは shared へ）
```

- 毎フレーム更新される座標等は **React State にせず**、Three.js `ref` または Zustand の `getState()`/`subscribe` で直接更新（[`game-engineering-principles.md`](./game-engineering-principles.md)）。
- `game/net/transport.ts` の **NetTransport 抽象** は Phase 0 でインターフェースだけ定義し、WT/WS 実装は Phase 1。

## 4. Shared モジュール（クライアント/サーバー共有）

bun でもブラウザでも動く、**DOM / React / WebGL レンダラーに依存しない**純粋ロジック。衝突計算は three の core/math と three-mesh-bvh（いずれも CPU のみ・WebGL 不要）を使用可。

```
shared/
├── protocol/
│   ├── messages.ts         # メッセージ型（入力・状態スナップショット・イベント）
│   ├── serialize.ts        # msgpackr シリアライズ/デシリアライズ
│   └── constants.ts        # tick rate(30Hz)・パケットヘッダ・チャネル定義
├── sim/                    # 純粋なゲームシミュレーション（予測と権威で共用）
│   ├── movement.ts         # 移動計算（入力 + 状態 → 次状態。delta 引数）
│   ├── combat.ts           # 当たり判定・ダメージ計算（純粋ロジック）
│   └── lagcomp.ts          # ラグ補償の巻き戻し計算（位置履歴 + 時刻 → 当時の状態）
├── ecs/                    # ECS のコンポーネント/型定義（描画非依存）
└── types.ts                # 共通型（プレイヤー・武器・状態フラグ等）
```

- ここに置くコードは **jsdom / WebGL 不要で Vitest のユニットテストが可能**（Sandbox 制約を回避、[`../../.agent/skills/sandbox-constraints.md`](../../.agent/skills/sandbox-constraints.md)）。
- 純粋関数（入力＝出力）にし、副作用（ネット送信・描画）は呼び出し側に分離する。

## 5. Game Server モジュール（bun）

権威ゲームサーバー。**30Hz 固定 tick** でシミュレーション。

```
server/
├── index.ts                # bun サーバ起動（WebSocket 受付・Caddy からの WT プロキシ）
├── room/                   # ルーム・マッチメイキング・プレイヤー参加/退出
├── sim/                    # 権威シミュレーション（shared/sim を 30Hz で回す）
├── net/
│   ├── connections.ts      # 接続管理（WS ネイティブ / WT はエッジ経由）
│   ├── snapshot.ts         # 状態スナップショット生成（30Hz）
│   └── lagcomp-store.ts    # 各プレイヤーの位置履歴（~100ms）保持
├── physics/                # 衝突世界（3D Mesh Map の BVH 構築・BVH キャラクター衝突。ヘッドレス可）
└── api/                    # 信頼イベント処理（被弾確定・スコア・購入）
```

- 接続層: WebSocket は bun ネイティブ（uWS）。WebTransport は Caddy エッジで終端してサーバーへプロキシ（[`networking.md`](./networking.md) §6）。bun の WT ネイティブ対応後に寄せる。
- サーバーは **React / DOM / WebGL レンダラー（three/webgpu・WebGLRenderer）を使わない**。描画ロジックを持たない。衝突のため three の core/math と three-mesh-bvh（いずれも CPU のみ）を shared 経由で使うことは可。

## 6. Web API / CDN（HTTPS 層）

```
web/（または別サービス）
├── auth/        # ログイン・JWT/OAuth
├── billing/     # 課金・ガチャ（ACID・冪等性）
├── inventory/   # ロードアウト・スキン永続化（DB）
├── stats/       # 戦績・ランキング（CDN キャッシュ可）
└── cdn/         # アセット（GLTF/KTX2）・静的ファイル配信
```

## 7. 依存方向のルール（変更してはいけない）

- `shared` は一番内側。client/server の層には依存しない（依存してよいのは three の core/math と three-mesh-bvh など CPU のみのライブラリ、React/DOM/レンダラーは不可）。
- `client` と `server` は `shared` に依存してよいが、**互いに依存しない**。
- `server` は `react` / DOM API / WebGL レンダラー（WebGPU/WebGLRenderer）を使わない（ヘッドレス）。three core/math と three-mesh-bvh は shared 経由で利用可（CPU のみ・WebGL 不要）。
- 純粋ゲームロジック（移動・BVH 衝突・当たり判定・ラグ補償計算）は必ず `shared` に置き、クライアントの描画/入力/FX コードに埋め込まない。
- ネット送信・描画といった副作用は、純粋ロジック（shared）の外側の薄いアダプタ層（client/net, server/net）に閉じ込める。

## 8. リポジトリ構成（bun workspaces）

- bun のワークスペースとして `client`（Vite フロント）・`server`（bun ゲームサーバ）・`shared`（共有）を分ける方向を基本とする。具体的なディレクトリ分割（単一 `src/` か monorepo か）は Phase 1（ネットワーク）着手時に確定する。
- Phase 0 ではクライアント単体の `src/` を作り、`shared` の配置はサーバー実装フェーズで整理する。

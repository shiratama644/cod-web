# Architecture & Data Flow — CodWeb

> 全体レイヤ構造とデータフロー。コンポーネントを横断して触る時に読む。

## レイヤ構造

```
packages/client  (ブラウザ)
  ├ React + three.js (@react-three/fiber)
  ├ Input (mouse/keyboard/touch/gamepad)
  ├ Client Simulation (予測) ← shared の決定論シミュレーションをローカル実行
  └ Renderer (WebGL2) ← 他エンティティは Entity Interpolation
        │
        │  input / command (Client → Server, geckos.io WebRTC: 低遅延 UDP)
        ▼
packages/server  (Node.js 24, VPS)
  ├ Socket.IO (制御系 / TCP): 認証・ロビー・ルーム・チャット・マッチイベント
  └ geckos.io (ゲーム同期層 / UDP):
       ├ 権威シミュレーション (shared をそのまま実行)
       ├ バリデーション (入力・射撃・状態)
       ├ Lag Compensation (射撃時、ターゲットを時点に巻き戻し)
       └ State Broadcast (Snapshot) ── unreliable (位置・視点・入力) / { reliable: true } (射撃・被弾)
        │
        │  snapshot (Server → Client, geckos.io WebRTC)
        ▼
packages/shared  (決定論シミュレーション)
  └ 移動・射撃・状態遷移 (クライアント/サーバーで import 共有)
```

### 層 / 責務

| 層 | 責務 | 置き場 |
| :--- | :--- | :--- |
| Shared Simulation | 決定論的ゲームロジック（移動・射撃・状態）。クライアント/サーバーで同一 | `packages/shared` |
| Client | 入力収集・クライアント予測・描画・ネットワーク送受信 | `packages/client` |
| Server | 権威シミュレーション・バリデーション・ブロードキャスト | `packages/server` |

> **設計原則**: クライアントは入力と予測だけを持ち、確定状態は常にサーバーが握る（チート防止 = 権威）。

## データフロー例

**「移動」（1 ティック）**:
`Client 入力` → `コマンド送信` → `Server 検証` → `決定論シミュレーション step` → `Snapshot 配信` → `Client が予測を補正（Reconciliation）`。

**「射撃判定」**:
`Client 入力` → `Server で Lag Compensation（ターゲット位置を巻き戻し）` → `three-mesh-bvh でレイキャスト判定` → `結果をブロードキャスト`。

**「他プレイヤー描画」**:
`Server Snapshot` → `Client は過去の 2 状態間で補間（Entity Interpolation）` → `滑らかに描画`。

## Server / Client 境界の要点

- **Server (Node.js 24)**: 権威シミュレーション・バリデーション・ブロードキャスト。**ゲーム同期層 = geckos.io WebRTC**（tick / 入力検証 / Snapshot / interpolation・prediction）、**制御系 = Socket.IO**（認証・ロビー・ルーム・チャット・マッチイベント）。永続稼働。Vercel 等のサーバーレスは不可。
- **Client (Browser)**: 入力・予測・描画。UI/HUD。ネットワーク送信（Socket.IO 制御系 + geckos.io ゲーム同期）。
- **Shared**: 決定論的シミュレーション。クライアント/サーバーで import 共有。React の `state` に載せず `ref`/`getState()`/`subscribe` で直接更新。

## 同期 / 非同期の境界

- **同期（毎フレーム / 毎ティック）**: 入力収集・予測・シミュレーション・Snapshot 配信（タイトなループ）。
- **非同期**: マッチメイキング・チャット・ロビー・設定保存（`async`）。

## 関連

- [project-overview.md](./project-overview.md) / [testing.md](./testing.md) / `docs/ARCH.md`

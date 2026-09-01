# CodWeb アーキテクチャ設計書（ARCH）

> 対象: ブラウザ向けオンライン FPS（権威型サーバー + クライアント予測）
> 方針: WebGL2 で安定優先、権威サーバーは **Node.js + geckos.io (WebRTC)**、MVP の主経路は **WebRTC（WebRTC DataChannel over UDP）**、完全オリジナルアセット。

## 1. 全体アーキテクチャ

```
┌───────────────────────────── ブラウザ (クライアント) ─────────────────────────────┐
│  Input (keyboard/mouse/touch/gamepad)                                               │
│      ↓                                                                              │
│  Client Simulation (predicted state) ← deterministic shared sim :: クライアント予測 │
│      ↓                     ↑ snapshot                                              │
│  Renderer (three.js WebGL2)  ← Entity Interpolation (他プレイヤーは過去に補間)      │
│      ↓                                                                              │
│  Network (Socket.IO … 制御系 / geckos.io WebRTC … ゲーム同期) ── input/command ──►  │
└────────────────────────────────────────────────────────────────────────────────────┘
                                     │  (Socket.IO: reliable 制御系)
                                     │  (geckos.io WebRTC DataChannel: UDP 相当・高頻度同期, 権威)
┌────────────────────────────────────▼──────────────────────────────────────────────┐
│  Authoritative Game Server (Node.js 24, VPS)                                        │
│  ├─ Socket.IO (信頼性が必要な制御系 / TCP)                                          │
│  │    · 認証   · ロビー   · ルーム管理   · チャット   · マッチイベント              │
│  └─ geckos.io (WebRTC / UDP) — ゲーム同期層                                        │
│       · ティックループ (固定タイムステップ)                                         │
│       · Deterministic Simulation (shared をそのまま実行)                            │
│       · バリデーション (入力・射撃・状態)                                           │
│       · Lag Compensation (射撃時、ターゲットを時点に巻き戻して判定)                 │
│       · State Broadcast (snapshot)                                                 │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### 層 / 責務

| 層 | 責務 | 置き場 |
| :--- | :--- | :--- |
| Shared Simulation | 決定論的ゲームロジック（移動・射撃・状態遷移）。クライアント/サーバーで同一 | `packages/shared` |
| Client | 入力収集・クライアント予測・描画・ネットワーク送受信 | `packages/client` |
| Server | 権威シミュレーション・バリデーション・ブロードキャスト | `packages/server` |

> 本質: **クライアントは入力と予測だけを持ち、確定状態は常にサーバーが握る**（チート防止 = 権威）。
> 層の分離: **高頻度のゲーム状態（座標・視点・入力・Snapshot）は geckos.io WebRTC（UDP 低遅延）**、**低頻度で信頼性必須の制御系（認証・ロビー・ルーム・チャット・マッチイベント）は Socket.IO（TCP 確実）** に分ける。

## 2. ネットワーク設計

### 2.1 輸送層の選択（方針）

**権威サーバーは Node.js 24 + geckos.io (WebRTC) でゲーム同期層を構築**し、**信頼性が必要な制御系（認証・ロビー・ルーム・チャット・マッチイベント）は Socket.IO に分離**する。**MVP の主経路 = geckos.io WebRTC（WebRTC DataChannel over UDP）**で、高頻度のゲーム状態（座標・視点・入力・Snapshot）を低遅延に同期する。

- **ゲーム同期 = geckos.io (WebRTC/UDP)**: unreliable/unordered（`ordered:false`, `maxRetransmits:0`）をデフォルトにし、`autoManageBuffering` で古い位置は破棄。イベント系は `{ reliable: true }`（重複除去・再送）で確実に送る。
- **制御系 = Socket.IO (WebSocket/TCP)**: 認証・ロビー・ルーム入退室・チャット・マッチイベントなど、欠落・順序逆転を許さない低頻度メッセージを扱う。Colyseus を廃止し、ルーム管理・マッチメイキングも Socket.IO で自前実装する。
- **WebTransport は見送り**: Node.js 側の実装が未成熟／Experimental（`@colyseus/h3-transport`）で、WebRTC が低遅延 UDP 要件を満たすため。将来の再検討余地は残すが、本設計では対象外。

> **技術的事実（検索確認・2026-09）**: geckos.io は「authoritative server 向け」として設計され、WebRTC DataChannel over UDP で低遅延を実現。**公開 IP の専用サーバーにクライアントが直接接続する構成では TURN 不要**、ICE はホスト候補で成立（Reddit 指摘どおり）。ただし一部ネットワークは UDP をブロックするため、制御系の Socket.IO（WebSocket/TCP）と、必要に応じた WebSocket フォールバックで補完する。`node-datachannel` はネイティブ依存で、本サンドボックスでのビルド検証に制約がある点に注意。

| 候補 | 長所 | 短所 |
| :--- | :--- | :--- |
| **geckos.io (WebRTC/UDP)** | **採用（ゲーム同期層の主経路）**。UDP 相当・低遅延・HoL ブロッキング無し・authoritative server 向け・`reliable:true`（重要イベント）と unreliable（位置・入力）を使い分け可 | UDP ポート開放が必要。接続ごとにランダムポートだが `multiplex:true` で集約可。`node-datachannel` ネイティブ依存 |
| **Socket.IO (WebSocket/TCP)** | **採用（制御系）**。全ブラウザ対応・成熟・確実・順序保証。認証/ロビー/ルーム/チャット/マッチイベントに最適 | TCP 依存・HoL ブロッキング → 高頻度ゲーム状態には不向き（制御系に限定する） |
| **WebTransport (`datagrams`/`streams`)** | UDP 相当 + 確実を 1 接続で使い分け。NAT 越え不要 | **見送り**。Node 側の実装が未成熟／Experimental。サーバーライブラリ依存 |
| **Colyseus (v0.16+)** | ルーム・状態同期・マッチメイキングが最初から揃う | **廃止**。WebRTC/UDP のゲーム同期に未対応。自前でルーム/Socket.IO を組む方針へ |
| Playroom | ゼロバックエンドで手軽 | 大人数/競技向きでない |

### 2.2 機能別 通信プロトコル選定マトリクス

| 機能カテゴリ | 具体的な機能 | 推奨プロトコル / 転送方式 | 到達 | 順序 | レイテンシ |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **ゲーム同期（高頻度）** | プレイヤー座標 / 視点 / 姿勢 | geckos.io WebRTC（unreliable/unordered） | ❌ | ❌ | 極小 (<20ms) |
| | プレイヤー入力（WASD / エイム） | geckos.io WebRTC（unreliable/unordered） | ❌ | ❌ | 極小 (<20ms) |
| | 視覚エフェクトトリガー（`isShooting` 等） | geckos.io WebRTC（unreliable） | ❌ | ❌ | 小 |
| | Snapshot（決定論状態） | geckos.io WebRTC（unreliable/unordered, 高ティック） | ❌ | ❌ | 極小 (<20ms) |
| | 射撃・着弾・被弾確定 | geckos.io WebRTC（`{ reliable: true }`） | ✅ | ✅ | 小 (<50ms) |
| | キルログ / スコアボード | Socket.IO（reliable/ordered） | ✅ | ✅ | 中 |
| **制御系（低頻度・確実）** | 認証 / ログイン | Socket.IO（または HTTPS） | ✅ | ✅ | 中 |
| | ロビー / マッチメイキング / ルーム入退室 | Socket.IO | ✅ | ✅ | 中 |
| | テキストチャット | Socket.IO | ✅ | ✅ | 中 |
| | マッチイベント（開始・終了・チーム分け・武器購入） | Socket.IO | ✅ | ✅ | 中 |
| **Web / 決済 / 永続** | ショップ / 課金 / ガチャ | HTTPS (REST/gRPC) | ✅ | ✅ | 不問 |
| | インベントリ / ロードアウト保存 | HTTPS (REST/GraphQL) | ✅ | ✅ | 不問 |
| | 戦績 / ランキング閲覧 | HTTPS (REST/CDN) | ✅ | ✅ | 不問 |
| | 3D モデル / テクスチャ配信 | HTTPS (CDN) | ✅ | ✅ | 不問 |

> **役割分担の原則**: ゲーム同期は geckos.io（UDP 低遅延、unreliable 主体）、制御系・確実性必須は Socket.IO（TCP 確実）。**高頻度のゲーム状態を Socket.IO に載せない**（HoL ブロッキングで遅延が増えるため）。

### 2.3 プロトコル選定の 3 原則

1. **「失われても次の瞬間に上書きされるデータ」**（位置・視点・入力・Snapshot）→ **geckos.io WebRTC（unreliable/unordered、UDP 相当）**
2. **「マッチ中に絶対に失われてはいけないが即時性も欲しいデータ」**（被弾確定・射撃・イベント）→ **geckos.io WebRTC `{ reliable: true }`**（重要インバンド）、**認証・ロビー・チャット・マッチイベント等は Socket.IO**（確実・別経路）
3. **「お金・アイテム・アカウントなどの永続データ」**（課金・インベントリ・認証の永続化）→ **HTTPS API**（TCP / DB トランザクション）

### 2.4 視覚エフェクトの設計方針

実際の商用 FPS では「エフェクト用のパケット」すら個別に送らないように最適化している。原則は **エフェクトの描画・パーティクル演算は 100% クライアント側で処理** し、サーバーは**発生の合図（トリガー）だけを極めて軽量に流す**。

1. **エフェクト専用パケットは送らない**。
2. サーバーから毎フレーム送られてくるプレイヤー情報（位置・向き）の中に **1 ビットのフラグ（`isShooting: true`）** だけを混ぜておく。
3. 受信側クライアントの Three.js が `isShooting: true` を受け取ったら、**クライアントが勝手にその敵の銃口からパーティクル（マズルフラッシュ・薬莢）を自律生成**する。

| 項目 | 処理の置き場所 |
| :--- | :--- |
| エフェクトの描画・パーティクル演算 | **100% クライアント（Three.js / r3f-vfx）で処理** |
| 他人のエフェクトの発生合図（トリガー） | サーバーから **geckos.io WebRTC（unreliable、低遅延 UDP）で超軽量に流す**か、**通常のプレイヤー同期フラグに相乗り**させてクライアント側でローカル生成 |

> 視覚エフェクトは装飾のため、欠落してもゲーム進行に影響しない。専用パケット削減で帯域を節約する。

### 2.5 ネットコードの必須技術（ベース）

権威サーバーを前提として、以下を実装する（Gabriel Gambetta の Fast-Paced Multiplayer 流）。

| 技術 | 目的 |
| :--- | :--- |
| **クライアント予測 (Client Prediction)** | 自分の入力は即時にローカルで反映（往復待ちを隠す） |
| **サーバー調停 (Server Reconciliation)** | サーバースナップショット到着時、予測を巻き戻して入力リプレイ・補正 |
| **エンティティ補間 (Entity Interpolation)** | 他プレイヤーを「少し過去」で描画し、動きを滑らかに |
| **ラグ補正 (Lag Compensation)** | 射撃判定時、サーバーがターゲットの位置を当該時刻に巻き戻して正当性を検証 |

これらは「クライアントが勝手に決めない」「サーバーが最終権威」という前提で成立します。

### 2.6 同期データ

| データ | 送信元 → 送信先 | 方法 |
| :--- | :--- | :--- |
| 入力・コマンド | Client → Server | geckos.io WebRTC（unreliable/unordered, 高頻度） |
| Snapshot（位置・視点・姿勢） | Server → Client | geckos.io WebRTC（unreliable/unordered, 高ティック） |
| 射撃・被弾確定 | 双方向 | geckos.io WebRTC（`{ reliable: true }`） |
| キルログ・スコア・マッチイベント | 双方向 | Socket.IO（reliable/ordered） |
| 認証・ロビー・ルーム・チャット | 双方向 | Socket.IO（reliable/ordered） |
| 決済・認証・インベントリ・戦績 | Client → HTTPS API | HTTPS (REST/gRPC)、DB トランザクション |

> **MVP**: ゲーム同期層（tick / 入力検証 / Snapshot / interpolation・prediction）は **geckos.io WebRTC**、制御系（認証・ロビー・ルーム・チャット・マッチイベント）は **Socket.IO** で成立させる。UDP ブロック網では Socket.IO（TCP）が主経路として機能し、ゲーム同期の低遅延は劣化するが動作は継続する。

## 3. データフロー

### 3.1 1 ティック（サーバー）

```
[入力受信] → [バリデーション(レート制限・正当性)] → [決定論シミュレーション step]
     ↓                    ↓                                  ↓
[射撃? → Lag Compensation で巻き戻し判定]          [状態更新]
                                                          ↓
                                              [Snapshot を全クライアントへ broadcast]
```

### 3.2 クライアントループ

```
[入力取得] → [予測シミュレーションをローカルで実行] → [描画 (他エンティティは補間)]
     ↓                                                 ↑
[コマンドをサーバーへ送信]  ──────►  [Snapshot 受信 → 調停 (予測を補正)]
```

## 4. 当たり判定・物理

| 用途 | ライブラリ | 備考 |
| :--- | :--- | :--- |
| プレイヤー移動・剛体 | `@dimforge/rapier3d`（決定論的）| クライアント/サーバーで同一条件なら同一結果 |
| 射撃のレイキャスト判定 | `three-mesh-bvh` | 数万ポリゴンでも ms 未満。ヘッドショット/壁判定に使用 |
| クライアント側描画用物理 | `@react-three/rapier` | UI から宣言的に剛体を配置 |
| 破壊表現（任意） | `three-bvh-csg` | 壁に弾痕・穴（デストラクション） |

**決定論性**: `shared` のシミュレーションは固定タイムステップ・乱数シード化を徹底する。Rapier は決定論的だが、可変タイムステップは非決定論を招くため**固定ステップ**で回す。

## 5. クライアント/サーバー境界

| 境界 | 内容 |
| :--- | :--- |
| Server (Node.js 24) | 権威シミュレーション・バリデーション・ブロードキャスト。**ゲーム同期層 = geckos.io WebRTC（tick / 入力検証 / Snapshot / interpolation・prediction）**、**制御系 = Socket.IO（認証・ロビー・ルーム・チャット・マッチイベント）**。永続稼働 |
| Client (Browser) | 入力・予測・描画。UI/HUD。ネットワーク送信（Socket.IO 制御系 + geckos.io ゲーム同期） |
| Shared | 決定論的シミュレーション（移動・射撃・状態）。クライアント/サーバーで import 共有 |

> **重要**: Vercel 等のサーバーレス / edge は権威ゲームサーバーには不向き（永続・UDP・状態保持が必要）。**永続サーバー（VPS / ゲームサーバー）**で必ず稼働させる。

## 6. 同期 / 非同期の境界

- **同期（毎フレーム / 毎ティック）**: 入力収集・予測・シミュレーション・Snapshot 配信はタイトなループ。React の `state` に載せず `ref`/`getState()`/`subscribe` で直接更新。
- **非同期**: マッチメイキング・チャット・ロビー・設定保存は非同期でよい。

## 7. キャッシュ・パフォーマンス

- アセットは KTX2/Basis 圧縮・Draco メッシュ圧縮・遅延読み込み。
- モバイルは `PerformanceMonitor` で解像度（DPR）・シャドウ品質を動的調整。
- Draw Calls を 80〜100 以下に抑える（`InstancedMesh` / `BatchedMesh` 活用）。

## 8. 主要な設計判断のまとめ

| 判断 | 理由 |
| :--- | :--- |
| WebGL2 でスタート | 全ブラウザ対応と安定性を優先。WebGPU はパフォーマンス要求時に段階導入 |
| 権威サーバー + クライアント予測 | 競技 FPS の公正さ・チート対策・低体感ラグに必須 |
| 決定論的 shared シミュレーション | クライアント予測とサーバー調停が破綻しないため |
| ゲーム同期 = geckos.io WebRTC | authoritative server 向け。UDP 相当の低遅延（unreliable）で位置・入力・Snapshot を送り、`{ reliable: true }` で射撃・被弾確定を確実に配達。WebTransport の段階導入は不要 |
| 制御系 = Socket.IO | 認証・ロビー・ルーム・チャット・マッチイベントなど、欠落・順序逆転を許さない低頻度メッセージ。TCP の確実性・順序保証が強み。高頻度ゲーム状態は載せない（HoL ブロッキング対策） |
| WebTransport は見送り | Node.js 側の実装が未成熟／Experimental。WebRTC（geckos.io）が低遅延 UDP 要件を満たすため。将来再検討余地は残す |
| Colyseus は廃止 | WebRTC/UDP のゲーム同期に未対応。ルーム管理・マッチメイキングは Socket.IO + 自前実装へ |
| TURN は不要（公開 IP の専用サーバー） | クライアント→公開 IP サーバー直結では ICE ホスト候補で成立（Reddit 指摘どおり）。UDP ブロック網は Socket.IO（TCP）で補完 |
| Node 専用サーバー（VPS） | 永続稼働・ルーム状態保持・（WebRTC/geckos.io の UDP ポート）が必要。サーバーレスは不可 |
| 完全オリジナルアセット | CoD は商用 IP のため Web 配信不可。「CoD 相当の品質」を自前で目指す |
| 権威ゲームサーバーは Node.js + geckos.io | C++ は採用しない（単一言語 TypeScript、`packages/shared` を import 共有）。ゲーム同期は geckos.io、制御系は Socket.IO |

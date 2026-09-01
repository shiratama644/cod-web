# CodWeb アーキテクチャ設計書（ARCH）

> 対象: ブラウザ向けオンライン FPS（権威型サーバー + クライアント予測）
> 方針: WebGL2 で安定優先、ネットワークは **Colyseus (v0.16+) + WebTransport** ベース、完全オリジナルアセット。

## 1. 全体アーキテクチャ

```
┌───────────────────────────── ブラウザ (クライアント) ─────────────────────────────┐
│  Input (keyboard/mouse/touch/gamepad)                                               │
│      ↓                                                                              │
│  Client Simulation (predicted state) ← deterministic shared sim :: クライアント予測 │
│      ↓                     ↑ snapshot                                              │
│  Renderer (three.js WebGL2)  ← Entity Interpolation (他プレイヤーは過去に補間)      │
│      ↓                                                                              │
│  Network Client (WebTransport / WebSocket) ── input / command ──► 信号 ■■■■        │
└────────────────────────────────────────────────────────────────────────────────────┘
                                     │  (WebTransport: datagrams + streams, 権威)
┌────────────────────────────────────▼──────────────────────────────────────────────┐
│  Authoritative Game Server (Node.js, VPS)                                          │
│  · ティックループ (固定タイムステップ)                                              │
│  · Deterministic Simulation (shared をそのまま実行)                                │
│  · バリデーション (入力・射撃・状態)                                                │
│  · Lag Compensation (射撃時、ターゲットを時点に巻き戻して判定)                       │
│  · State Broadcast (snapshot)                                                       │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### 層 / 責務

| 層 | 責務 | 置き場 |
| :--- | :--- | :--- |
| Shared Simulation | 決定論的ゲームロジック（移動・射撃・状態遷移）。クライアント/サーバーで同一 | `packages/shared` |
| Client | 入力収集・クライアント予測・描画・ネットワーク送受信 | `packages/client` |
| Server | 権威シミュレーション・バリデーション・ブロードキャスト | `packages/server` |

> 本質: **クライアントは入力と予測だけを持ち、確定状態は常にサーバーが握る**（チート防止 = 権威）。

## 2. ネットワーク設計

### 2.1 輸送層の選択（方針）

**権威サーバー（Colyseus v0.16+）+ WebTransport をベース**とします。WebTransport は HTTP/3 over QUIC で、**UDP 相当の `datagrams`（unreliable / unordered）**と**確実な `streams`（reliable / ordered）**の両方を 1 接続で提供します。これにより、ブラウザから権威サーバーへ **機能カテゴリごとに最適な転送方式**を選べます。

> **技術的事実（検索確認・2026-03）**: WebTransport は Safari 26.4 で **Baseline 到達**（Chrome/Edge/Firefox/Safari/Opera 全対応）。ただし ①一部ネットワークは UDP/QUIC をブロックするため **WebSocket フォールバック**の併設、②**Node.js はネイティブの WebTransport サーバーを提供しない**（quic-go / aioquic / コミュニティパッケージ等で終端）点が実装上の注意。

| 候補 | 長所 | 短所 |
| :--- | :--- | :--- |
| **WebTransport (`datagrams`)** | UDP 相当・低遅延・HoL ブロッキング無し・1 接続で複数ストリーム | 一部ネットワークで UDP ブロック。Node 終端が要る |
| **WebTransport (`streams`)** | 確実・順序保証・QUIC ストリーム・同一接続で datagrams と共存 | 実装は WebSocket より複雑 |
| WebSocket（フォールバック） | 全ブラウザ対応・成熟・シンプル | TCP 依存・HoL ブロッキング・UDP 相当が無い |
| **geckos.io (WebRTC)** | UDP ライク・低遅延 | **見送り**。WebRTC は P2P 前提のため、クライアント↔サーバーでは (a) シグナリングサーバー必須、(b) ICE/STUN/TURN の NAT 越え（TURN は 1〜2 割で必要・有料化・遅延増）、(c) UDP ダイレクト必須で LB 迂回・IP 公開、(d) Node に組み込み WebRTC 無し（native 依存）、(e) 権威サーバー型と矛盾（P2P の利点が得られない）。→ WebTransport（Client→Server QUIC）なら NAT 越え不要で同効果 |
| socket.io | WebSocket 抽象化・チャット/イベント | ゲーム用には過剰、低遅延に不向きな場面 |
| Playroom | ゼロバックエンドで手軽 | 大人数/競技向きでない |

### 2.2 機能別 通信プロトコル選定マトリクス

| 機能カテゴリ | 具体的な機能 | 推奨プロトコル / 転送方式 | 到達 | 順序 | レイテンシ |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **超高速同期** | プレイヤー座標 / 視点 / 姿勢 | `datagrams` | ❌ | ❌ | 極小 (<20ms) |
| | プレイヤー入力（WASD / エイム） | `datagrams` | ❌ | ❌ | 極小 (<20ms) |
| | ボイスチャット | `datagrams` + WebCodecs | ❌ | ❌ | 極小 (<50ms) |
| | 視覚エフェクト（火花 / 薬莢） | `datagrams` | ❌ | ❌ | 小 |
| **重要イベント** | 射撃・着弾・被弾確定 | `streams` | ✅ | ✅ | 小 (<50ms) |
| | キルログ / スコアボード | `streams` | ✅ | ✅ | 中 |
| | テキストチャット | `streams`（または WebSocket） | ✅ | ✅ | 中 |
| | ラウンド中の武器購入 / 投擲 | `streams` | ✅ | ✅ | 小 |
| | マッチメイキング / ルーム管理 | `streams` / WebSocket | ✅ | ✅ | 中 |
| **Web / 決済 / 永続** | ショップ / 課金 / ガチャ | HTTPS (REST/gRPC) | ✅ | ✅ | 不問 |
| | ログイン / 認証 | HTTPS (REST) | ✅ | ✅ | 不問 |
| | インベントリ / ロードアウト保存 | HTTPS (REST/GraphQL) | ✅ | ✅ | 不問 |
| | 戦績 / ランキング閲覧 | HTTPS (REST/CDN) | ✅ | ✅ | 不問 |
| | 3D モデル / テクスチャ配信 | HTTPS (CDN) | ✅ | ✅ | 不問 |

### 2.3 プロトコル選定の 3 原則

1. **「失われても次の瞬間に上書きされるデータ」**（位置・視点・音声・入力）→ **`datagrams`**（UDP 相当）
2. **「マッチ中に絶対に失われてはいけないが即時性も欲しいデータ」**（被弾判定・チャット・キルログ）→ **`streams`**（QUIC ストリーム）
3. **「お金・アイテム・アカウントなどの永続データ」**（課金・インベントリ・認証）→ **HTTPS API**（TCP / DB トランザクション）

### 2.4 視覚エフェクトの設計方針

実際の商用 FPS では「エフェクト用のパケット」すら個別に送らないように最適化している。原則は **エフェクトの描画・パーティクル演算は 100% クライアント側で処理** し、サーバーは**発生の合図（トリガー）だけを極めて軽量に流す**。

1. **エフェクト専用パケットは送らない**。
2. サーバーから毎フレーム送られてくるプレイヤー情報（位置・向き）の中に **1 ビットのフラグ（`isShooting: true`）** だけを混ぜておく。
3. 受信側クライアントの Three.js が `isShooting: true` を受け取ったら、**クライアントが勝手にその敵の銃口からパーティクル（マズルフラッシュ・薬莢）を自律生成**する。

| 項目 | 処理の置き場所 |
| :--- | :--- |
| エフェクトの描画・パーティクル演算 | **100% クライアント（Three.js / r3f-vfx）で処理** |
| 他人のエフェクトの発生合図（トリガー） | サーバーから **WebTransport `datagrams`（UDP）で超軽量に流す**か、**通常のプレイヤー同期フラグに相乗り**させてクライアント側でローカル生成 |

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
| 入力・コマンド | Client → Server | WebTransport `streams`（reliable/ordered） |
| Snapshot（位置・視点・姿勢） | Server → Client | WebTransport `datagrams`（unreliable/unordered, 高ティック） |
| 射撃・被弾・キルログ・チャット | 双方向 | WebTransport `streams`（reliable/ordered） |
| 決済・認証・インベントリ・戦績 | Client → HTTPS API | HTTPS (REST/gRPC)、DB トランザクション |

> フォールバック: WebTransport 非対応環境（一部 UDP ブロック / 旧 Safari）では WebSocket（Colyseus）へフォールバックする。マトリクス上の「重要イベント」「Web/決済」は WebSocket/HTTPS でも成立し、`datagrams` のみ WebTransport が必要。

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
| Server (Node) | 権威シミュレーション・バリデーション・ブロードキャスト。WebTransport 終端 / ルーム管理（Colyseus）。永続稼働 |
| Client (Browser) | 入力・予測・描画。UI/HUD。ネットワーク送信 |
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
| Colyseus + WebTransport | 権威サーバーのルーム管理 + `datagrams`（UDP 相当）と `streams`（確実）を機能別に使い分けられ、競技 FPS の低遅延を実現 |
| WebRTC (geckos.io) は見送り | P2P 前提のため、クライアント↔サーバーではシグナリング必須 + ICE/STUN/TURN の NAT 越え（TURN 有料・遅延増）+ UDP ダイレクト運用（LB 迂回・IP 公開）が増える。WebTransport は Client→Server QUIC で NAT 越え不要のため同効果を簡潔に得る |
| WebSocket フォールバック | WebTransport 非対応環境（旧 Safari / UDP ブロックのネットワーク）向けに併設 |
| 「カスタム UDP は？→ WebTransport に収斂」 | ブラウザは生 UDP を JS に公開しない（意図的な安全策）。ブラウザから UDP 相当を出すのは WebTransport `datagrams`（NAT 越え不要）か WebRTC（複雑）の 2 択。アプリ層プロトコルは自由に書け、トランスポート（TLS/輻輳制御/ストリーム）はブラウザが担う |
| Node 専用サーバー（VPS） | 永続稼働・QUIC/UDP（WebTransport）・ルーム状態保持が必要。サーバーレスは不可 |
| 完全オリジナルアセット | CoD は商用 IP のため Web 配信不可。「CoD 相当の品質」を自前で目指す |
| WebTransport の終端はサーバー側が未成熟 | ブラウザ（クライアント）は Baseline 済みだが、Node.js は組み込み WebTransport が無い。終端は C++(msquic 等) / Go / Rust で代替。本サンドボックスでは Go/Rust 不可（レジストリ・toolchain ブロック）のため C++ が実装可能 |

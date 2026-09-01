# CodWeb 技術選定（絞り込みと判断理由）

> `docs/CONFIG.md` は技術スタックの**全リスト（参考情報）**。本ドキュメントは、その中から**実装候補を絞り込んだ選定と判断理由**を記す。
> 方針: WebGL2 で安定優先 / ネットワークは **Colyseus (v0.16+) + WebTransport** ベース / 完全オリジナルアセット。

## 1. 選定原則

- **全ブラウザ対応・安定性を最優先**（特にモバイル / 低スペック / PRoot 等）。
- **決定論性**を保てるものを優先（権威サーバー + クライアント予測の前提）。
- **シンプル → 必要になったら高度化**。最初から高度なものに依存しない。
- 商用 IP（CoD）は使わない。オープンソース / 自作 / CC0 で「CoD 相当の品質」を目指す。

## 2. 描画 / 3D

| カテゴリ | 選定 | 備考（理由） |
| :--- | :--- | :--- |
| 3D エンジン | **three.js** (`three/webgpu` は将来) | r171 以降 WebGPU がゼロ設定で使えるが、まず **WebGL2** で確実に。WebGPU + TSL は後段導入 |
| React 統合 | **@react-three/fiber** + **@react-three/drei** | 宣言的シーン管理。`useFrame` で毎フレーム更新。drei の `PerformanceMonitor` / `PointerLockControls` / `KeyboardControls` を使用 |
| WebGPU (将来) | `three/webgpu` + TSL | 同一 API で WebGL2 へ自動フォールバック。導入時は `gl` factory で切替 |
| ポストプロセス | **@react-three/postprocessing** | ブルーム / DoF / 色補正 |

## 3. 物理・当たり判定

| 用途 | 選定 | 理由 |
| :--- | :--- | :--- |
| 床・剛体・キャラクター | **@dimforge/rapier3d** | **決定論的**。サーバー側（ヘッドレス）で権威物理、クライアント側は描画用 |
| 射撃レイキャスト | **three-mesh-bvh** | 数万ポリゴンでも ms 未満。ヘッドショット・壁判定に最適。権威サーバー検証に使う |
| 破壊表現（任意） | **three-bvh-csg** | 弾痕・穴。後段 |
| キャラクターコントローラー | **ecctrl**（または自作） | 物理駆動。FPS はカスタムが主流だが、プロトタイプには便利 |

> 決定論性のため、`shared` のシミュレーションは固定タイムステップに統一する（Rapier の可変ステップは非決定論）。

## 4. ネットワーク

### 4.1 方針（確定）

**権威サーバー（Colyseus v0.16+）+ WebTransport をベース**とする。WebTransport は HTTP/3 over QUIC で、**UDP 相当の `datagrams`（unreliable / unordered）**と**確実な `streams`（reliable / ordered）**の両方を 1 接続で提供する。これを**機能カテゴリごとに使い分ける**。

> **WebTransport の現状（2026-03〜）**: Safari 26.4 で Baseline 到達（Chrome/Edge/Firefox/Safari/Opera 全対応）。ただし ①一部ネットワークは UDP/QUIC をブロックするため **WebSocket フォールバック**を併設、②**Node.js はネイティブの WebTransport サーバーを提供しない**（コミュニティパッケージ or quic-go/aioquic 等で終端）点に注意。

### 4.2 機能別 通信プロトコル選定マトリクス

| 機能カテゴリ | 具体的な機能 | 推奨プロトコル / 転送方式 | 到達保証 | 順序保証 | 要求レイテンシ | 選定理由 |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **超高速同期** | プレイヤー座標 / 視点 / 姿勢 | **WebTransport `datagrams`** | ❌ | ❌ | 極小 (<20ms) | 最新 1 パケットさえ届けば過去の位置は不要。再送遅延・HoL ブロッキングを排除 |
| | プレイヤー入力（WASD / エイム） | **WebTransport `datagrams`** | ❌ | ❌ | 極小 (<20ms) | 毎フレーム (60〜120Hz) 送信。ロスしても次フレームで上書き |
| | ボイスチャット（マイク音声） | **`datagrams`** + WebCodecs | ❌ | ❌ | 極小 (<50ms) | ミリ秒の音飛びは気にならないが、TCP 再送による音ズレは会話を破綻させる |
| | 視覚エフェクト（火花 / 薬莢） | **`datagrams`** | ❌ | ❌ | 小 | 装飾演出のため欠落しても進行に影響しない |
| **重要イベント** | 射撃・着弾・被弾確定 | **`streams`**（単方向/双方向） | ✅ | ✅ | 小 (<50ms) | 「当たった/外れた」判定は欠落厳禁。位置同期の邪魔をしない独立ストリームで送る |
| | キルログ / スコアボード | **`streams`** | ✅ | ✅ | 中 | 通知の順序・確実性が必要 |
| | テキストチャット（マッチ/ロビー） | **`streams`**（または WebSocket） | ✅ | ✅ | 中 | 文字化け・順序逆転・送信漏れを防止 |
| | ラウンド中の武器購入 / 投擲 | **`streams`** | ✅ | ✅ | 小 | ラウンド内のゲーム状態（State）同期に確実な送達が必要 |
| | マッチメイキング / ルーム管理 | **`streams`** / **WebSocket** | ✅ | ✅ | 中 | 入退室・カウントダウン・チーム分けの状態同期 |
| **Web / 決済 / 永続** | ショップ / 課金 / ガチャ | **HTTPS (REST / gRPC)** | ✅ | ✅ | 不問 | ACID トランザクションと二重決済防止（Idempotency）が最優先。専用の安全な決済 API |
| | ログイン / 認証 (JWT / OAuth) | **HTTPS (REST)** | ✅ | ✅ | 不問 | アカウント情報の暗号化とトークン発行 |
| | インベントリ / ロードアウト保存 | **HTTPS (REST / GraphQL)** | ✅ | ✅ | 不問 | スキン・所持アイテムの確実な DB 永続化 |
| | 戦績 / ランキング閲覧 | **HTTPS (REST / CDN)** | ✅ | ✅ | 不問 | キャッシュ（CDN）活用の高速読み取り |
| | 3D モデル / テクスチャ配信 | **HTTPS (CDN)** | ✅ | ✅ | 不問 | 大容量アセット（KTX2/GLTF）の並列・高速 DL |

### 4.3 プロトコル選定の 3 原則

1. **「失われても次の瞬間に上書きされるデータ」**（位置・視点・音声・入力）→ **`datagrams`**（UDP 相当）
2. **「マッチ中に絶対に失われてはいけないが即時性も欲しいデータ」**（被弾判定・チャット・キルログ）→ **`streams`**（QUIC ストリーム）
3. **「お金・アイテム・アカウントなどの永続データ」**（課金・インベントリ・認証）→ **HTTPS API**（TCP / DB トランザクション）

### 4.4 選定・見送り

| 候補 | 判定 | 理由 |
| :--- | :--- | :--- |
| **Colyseus (v0.16+)** | **軸（採用）** | 権威ルーム・自動状態同期・マッチメイキング・MIT・自前ホスト可能。WebTransport 上で動かす |
| **WebTransport** | **軸（採用）** | HTTP/3 over QUIC。`datagrams`（UDP 相当）+ `streams`（確実）を 1 接続で使い分け。競技 FPS の低遅延を実現 |
| socket.io | 補助 | チャット・ロビー等、確実性重視イベントのフォールバック用 |
| geckos.io (WebRTC) | 使わない（WebTransport で代替） | WebTransport が UDP 相当を提供するため、WebRTC の複雑さ（ICE/STUN/TURN）は不要 |
| Playroom | 見送り | 大人数 / 競技向きでない |
| Nakama / Photon | 見送り | 自前 Node サーバー方針と合わない（Photon は商用・Unity 寄り） |

> ラグ補正・クライアント予測は輸送層に関わらず必須（権威サーバー + クライアント予測）。

## 5. ECS / 大量オブジェクト

| 候補 | 判定 | 理由 |
| :--- | :--- | :--- |
| **_bitecs** | **共有シミュレーション用（検討）** | TypedArray ベース・決定論的・サーバー/クライアント共用で数万エンティティを GC レスに処理 |
| **miniplex** | R3F シーン用 | エンティティを React と相性良く扱う |

> 初期MVP（6v6・弾道数百）では ECS 必須でない場合あり。弾・エフェクトが増えてから導入を検討。

## 6. 入出力・オーディオ・UI

| 用途 | 選定 | 理由 |
| :--- | :--- | :--- |
| 入力 (PC) | drei `PointerLockControls` / `KeyboardControls` | 標準 |
| 入力 (モバイル) | **nipplejs** | 仮想スティック（移動/視点） |
| ゲームパッド | **joypad.js** | PS5/Xbox 対応 |
| オーディオ | **howler.js** + drei `PositionalAudio` + **resonance-audio** | 3D 空間音響・HRTF |
| HUD / UI | **zustand** + @radix-ui/* + **framer-motion** | 超軽量状態管理 + アクセシブル UI + アニメ |

## 7. VFX・アセット

| 用途 | 選定 | 理由 |
| :--- | :--- | :--- |
| パーティクル | **three.quarks** | GPU パーティクル・最小 Draw Call（マズルフラッシュ・爆破・トレイル） |
| トレイル | **three.meshline** | 太さのある弾道トレース・レーザー |
| アセット最適化 | **meshoptimizer** / DRACOLoader / KTX2 (Basis) | メッシュ圧縮・テクスチャ圧縮・ロード高速化 |
| GLTF 最適化 | **@gltf-transform/core** | ポリゴン削減・LOD 自動生成 |

## 8. テスト

| 用途 | 選定 | 理由 |
| :--- | :--- | :--- |
| 単体 | **Vitest** | shared（決定論的シミュレーション）・サーバーロジックを高速検証 |
| ブラウザ | ms**w (Mock Service Worker)** | API / ネットワークモック |
| E2E | **Playwright** | クライアント描画・入力・フロー。CI で実行 |
| 決定論性テスト | shared の固定シード再生 | サーバー/クライアントで同一結果を保証 |

## 9. ビルド / モノレポ

| 用途 | 選定 | 理由 |
| :--- | :--- | :--- |
| パッケージ | **pnpm workspaces** | `packages/client` / `packages/server` / `packages/shared` を分離 |
| クライアントビルド | **Vite** | React + three.js の高速開発。Web 向け |
| サーバー | Node.js（tsx / esbuild / tsc）+ WebTransport 終端 | 権威サーバー。TypeScript で sharing。WebTransport 終端は quic-go / aioquic / コミュニティパッケージ等 |
| 型 | **TypeScript strict** | `noUncheckedIndexedAccess` 推奨 |

## 10. ホスティング

| 用途 | 選定 | 理由 |
| :--- | :--- | :--- |
| 権威ゲームサーバー | **Node 専用サーバー（VPS / ゲームサーバー）** | 永続稼働・QUIC/UDP（WebTransport）・ルーム状態保持が必要。サーバーレス（Vercel 等）は不可 |
| クライアント（static） | 任意の静的ホスティング | three.js + React は静的ビルド可。CDN で配信 |

## 11. 未採用 / 留意

| 項目 | 備考 |
| :--- | :--- |
| `@react-three/drei` の `Html` / `Text` | 使いどころ次第だが、パフォーマンスに注意 |
| `leva` / `@react-three/editor` | デバッグ・シーンオーサリング用。プロダクションには入れない |
| `vite-plugin-glsl` | GLSL/WGSL import 用。TSL に移行後は不要になるかも |
| 可変タイムステップ | 非決定論のため**禁止**。固定ステップで回す |

## 12. 総合的な初期構成（MVP 候補）

```
packages/shared   … 決定論的シミュレーション（移動・射撃・状態遷移）
packages/server   … Colyseus 権威サーバー (Node, VPS) + WebTransport 終端
                  … ティックループ + ラグ補正 + datagrams/streams 使い分け
packages/client   … React + three.js (WebGL2) + @react-three/fiber
                  … 入力(mouse/keyboard/nipplejs) + クライアント予測 + HUD(zustand)
```

この構成を第 1 マイルストーンの土台とし、小さく検証しながら進めます。

**視覚エフェクトの設計方針**: 実際の商用 FPS はエフェクト用パケットすら個別に送らない。**描画・パーティクル演算は 100% クライアント（Three.js / r3f-vfx）で処理**し、サーバーは発生の合図（トリガー）だけを極めて軽量に流す。サーバーが毎フレーム送るプレイヤー情報（位置・向き）に **1 ビットフラグ（`isShooting: true`）** を混ぜるか、**WebTransport `datagrams`** でトリガーを流し、クライアント側の Three.js が受け取ったら銃口からマズルフラッシュ・薬莢を**自律生成**する（エフェクトは装飾のため欠落しても進行に影響しない）。

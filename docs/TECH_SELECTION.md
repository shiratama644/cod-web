# CodWeb 技術選定（絞り込みと判断理由）

> `docs/CONFIG.md` は技術スタックの**全リスト（参考情報）**。本ドキュメントは、その中から**実装候補を絞り込んだ選定と判断理由**を記す。
> 方針: WebGL2 で安定優先 / 権威サーバーは **Node.js 24 + geckos.io (WebRTC)**、**ゲーム同期層 = geckos.io、制御系 = Socket.IO**（認証・ロビー・ルーム・チャット・マッチイベント）/ 完全オリジナルアセット。

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

**権威サーバーは Node.js + geckos.io (WebRTC) でゲーム同期層を構築**し、**信頼性が必要な制御系（認証・ロビー・ルーム・チャット・マッチイベント）は Socket.IO** に分離する。**MVP の主経路 = geckos.io WebRTC（WebRTC DataChannel over UDP）**で高頻度ゲーム状態（座標・視点・入力・Snapshot）を低遅延に同期。Socket.IO（WebSocket/TCP）は確実性・順序保証が求められる制御系に限定し、高頻度ゲーム状態は載せない。

> **技術的事実（検索確認・2026-09）**: geckos.io は「authoritative server 向け」として設計（README の用途表に明記）。WebRTC DataChannel over UDP で低遅延・HoL ブロッキング無しを実現。**公開 IP の専用サーバーにクライアントが直接接続する構成では TURN 不要**（ICE ホスト候補で成立、Reddit 指摘どおり）。`node-datachannel` はネイティブ依存（本サンドボックスでのビルド検証に制約）であり、UDP ポート開放（`multiplex:true` で 1 ポートに集約可）が必要。**一部ネットワークは UDP をブロックするため、制御系は Socket.IO（TCP）**で担保する。

### 4.2 機能別 通信プロトコル選定マトリクス

> **ゲーム同期（高頻度）は geckos.io WebRTC（unreliable 主体、`{ reliable: true }` で重要イベントのみ確実）、制御系（低頻度で確実性必須）は Socket.IO。** WebTransport は見送り（Node 側未成熟）。マトリクスは設計上の基準。

| 機能カテゴリ | 具体的な機能 | 推奨プロトコル / 転送方式 | 到達保証 | 順序保証 | 要求レイテンシ | 選定理由 |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **超高速同期（ゲーム）** | プレイヤー座標 / 視点 / 姿勢 | **geckos.io WebRTC（unreliable/unordered）** | ❌ | ❌ | 極小 (<20ms) | 最新 1 パケットさえ届けば過去の位置は不要。再送遅延・HoL ブロッキングを排除 |
| | プレイヤー入力（WASD / エイム） | **geckos.io WebRTC（unreliable/unordered）** | ❌ | ❌ | 極小 (<20ms) | 毎フレーム (60〜120Hz) 送信。ロスしても次フレームで上書き |
| | Snapshot（決定論状態） | **geckos.io WebRTC（unreliable/unordered, 高ティック）** | ❌ | ❌ | 極小 (<20ms) | tick ごとに生成。最新状態を低遅延で反映 |
| | 視覚エフェクト（火花 / 薬莢） | **geckos.io WebRTC（unreliable）** | ❌ | ❌ | 小 | 装飾演出のため欠落しても進行に影響しない |
| **重要イベント（ゲーム）** | 射撃・着弾・被弾確定 | **geckos.io WebRTC（`{ reliable: true }`）** | ✅ | ✅ | 小 (<50ms) | 「当たった/外れた」判定は欠落厳禁。unreliable な位置同期と別系統で確実に送る |
| **制御系（Socket.IO）** | 認証 / ログイン | **Socket.IO** | ✅ | ✅ | 中 | トークン検証・セッション管理。確実な配達が必要 |
| | ロビー / マッチメイキング / ルーム入退室 | **Socket.IO** | ✅ | ✅ | 中 | 入退室・カウントダウン・チーム分けの状態同期。順序保証 |
| | キルログ / スコアボード | **Socket.IO** | ✅ | ✅ | 中 | 通知の順序・確実性が必要 |
| | テキストチャット（マッチ/ロビー） | **Socket.IO** | ✅ | ✅ | 中 | 文字化け・順序逆転・送信漏れを防止 |
| | マッチイベント（開始・終了・武器購入・投擲） | **Socket.IO** | ✅ | ✅ | 小 | ラウンドの状態遷移は確実・順序保証が必要 |
| **Web / 決済 / 永続** | ショップ / 課金 / ガチャ | **HTTPS (REST / gRPC)** | ✅ | ✅ | 不問 | ACID トランザクションと二重決済防止（Idempotency）が最優先。専用の安全な決済 API |
| | ログイン / 認証 (JWT / OAuth) | **HTTPS (REST)** | ✅ | ✅ | 不問 | アカウント情報の暗号化とトークン発行 |
| | インベントリ / ロードアウト保存 | **HTTPS (REST / GraphQL)** | ✅ | ✅ | 不問 | スキン・所持アイテムの確実な DB 永続化 |
| | 戦績 / ランキング閲覧 | **HTTPS (REST / CDN)** | ✅ | ✅ | 不問 | キャッシュ（CDN）活用の高速読み取り |
| | 3D モデル / テクスチャ配信 | **HTTPS (CDN)** | ✅ | ✅ | 不問 | 大容量アセット（KTX2/GLTF）の並列・高速 DL |

### 4.3 プロトコル選定の 3 原則

1. **「失われても次の瞬間に上書きされるデータ」**（位置・視点・入力・Snapshot）→ **geckos.io WebRTC（unreliable/unordered、UDP 相当）**
2. **「マッチ中に絶対に失われてはいけないが即時性も欲しいデータ」**（被弾確定・射撃・イベント）→ **geckos.io WebRTC `{ reliable: true }`**（重要インバンド）、**認証・ロビー・チャット・マッチイベント等は Socket.IO**（確実・別経路）
3. **「お金・アイテム・アカウントなどの永続データ」**（課金・インベントリ・認証の永続化）→ **HTTPS API**（TCP / DB トランザクション）

### 4.4 選定・見送り

| 候補 | 判定 | 理由 |
| :--- | :--- | :--- |
| **geckos.io (WebRTC)** | **採用（ゲーム同期層の主経路）** | authoritative server 向け。UDP 相当（unreliable）で位置・入力・Snapshot を低遅延送信、`{ reliable: true }` で射撃・被弾確定を確実に配達。`node-datachannel`（ネイティブ）前提 |
| **Socket.IO** | **採用（制御系）** | 認証・ロビー・ルーム・チャット・マッチイベントなど、欠落・順序逆転を許さない低頻度メッセージ。TCP の確実性・順序保証。WebSocket/TCP |
| **WebTransport** | 見送り | HTTP/3 over QUIC で `datagrams` + `streams` を 1 接続で使えるが、Node 側の実装が未成熟／Experimental。WebRTC（geckos.io）が低遅延 UDP 要件を満たすため |
| **Colyseus (v0.16+)** | **廃止** | WebRTC/UDP のゲーム同期に未対応。ルーム管理・マッチメイキングは Socket.IO + 自前実装へ |
| socket.io（補助） | 制御系に採用（本体） | チャット・ロビー・認証・マッチイベントを担当 |
| Playroom | 見送り | 大人数 / 競技向きでない |
| Nakama / Photon | 見送り | 自前 Node サーバー方針と合わない（Photon は商用・Unity 寄り） |

> ラグ補正・クライアント予測は輸送層に関わらず必須（権威サーバー + クライアント予測）。

### 4.5 WebRTC（geckos.io）をゲーム同期に採用する判断

**結論：WebRTC は P2P 前提の規格だが、クライアント⇔公開 IP サーバーの 1 対多接続では TURN が不要で、ICE はホスト候補で成立する。本プロジェクトでは geckos.io をゲーム同期層の主経路に採用**（出典: 調査 2026-09）。従来「WebRTC は見送り」としていた判断を修正した。

- **TURN（P2P 用リレー）は不要** — クライアント→公開 IP の専用サーバーに直接接続する構成では、クライアントが接続を開始するため、NAT 越え用の STUN/TURN 中継は必要ない。ICE はホスト候補（+ Peer Reflexive）で成立する。
- **シグナリングは geckos.io が内包** — SDP/ICE 交換は geckos.io が提供（`9208/tcp` でシグナリング）。認証・ルーム管理は Socket.IO 側で担保する。
- **制御系との分離** — 高頻度ゲーム状態（unreliable）は geckos.io、確実性必須の制御系（認証・ロビー・チャット・マッチイベント）は Socket.IO（WebSocket/TCP）に分け、各々の利点を活かす。
- **UDP ブロック網への対応** — 一部ネットワークは UDP/QUIC をブロックする。その場合、ゲーム同期の低遅延は劣化するが、Socket.IO（TCP）で動作は継続させる。**完全なゲーム同期の WebSocket フォールバックは後続で評価**。
- **デプロイ / ファイアウォール** — geckos.io は UDP ポート（`multiplex:true` で 1 ポートに集約可）と `9208/tcp` の開放が必要。ロードバランサを挟む場合は UDP 透過に注意。公開 IP の専用サーバーを前提とする。

> **補足**: Reddit の指摘（「P2P でない・TURN 不要・geckos を試せ」）は、当方が従来挙げていた「TURN が 1〜2 割必要」「WebRTC は権威サーバー型と矛盾」という見送り理由の誤りを正すもの。**WebRTC を「見送り」から「ゲーム同期層の主経路」へ変更**する。

### 4.6 「カスタム UDP プロトコルでは？」という指摘への応答

> **指摘（開発者より）**: 「WS は TCP で遅延がある / UDP は安定している。なら**カスタム UDP プロトコルを作れば**いい。」

この指摘は**ネイティブゲームの文脈なら完全に正しい**（Gaffer On Games の `netcode.io` / ENet / RakNet はまさにカスタム UDP）。ただし**本プロジェクトはブラウザゲームであり、そこに 1 つの前提の誤解**がある（出典: 調査 2026-03）。

**① ブラウザは「生の UDP ソケット」を JavaScript に一切公開しない。**
生の TCP も同様。`fetch` / XHR / WebSocket はすべて HTTP(S) ベースであり、ブラウザは意図的に raw ソケットを塞いでいる（攻撃の踏み台・家庭内ネットワークへの侵入を防ぐため）[2](https://www.reddit.com/r/programming/comments/vs5r4n/no_really_why_cant_we_have_raw_udp_in_javascript/)[7](https://news.ycombinator.com/item?id=31984112)[9](https://stackoverflow.com/questions/17658368/why-no-udp-connection-via-browser-even-with-html5)。raw 接続は「アプリ層の誤用を防ぐハンドシェイクが無い」ため**今後も実装されない**。

> **Browsers deliberately do not expose raw TCP or UDP socket APIs to JavaScript.**[1](https://therelay.net/blog/rtsp-to-webrtc-browser)

→ よって「クライアント（ブラウザ）が**自前の UDP プロトコルを直接喋る**」ことは構造的に不可能。ブラウザから UDP 相当を出す手段は **WebRTC DataChannel** と **WebTransport `datagrams`** の 2 つ。本プロジェクトでは**WebRTC DataChannel（geckos.io）をゲーム同期に採用**する（WebTransport は Node 側未成熟のため見送り）。

**② 「カスタム UDP を書きたい」本能は、ブラウザでは WebRTC か WebTransport に収斂する。**
どちらも**アプリ層のメッセージフォーマット（バイナリレイアウト・優先度・フラグ）は完全に自前でカスタムできる**一方、UDP 相当のトランスポート（暗号化・輻輳制御・再送ポリシー）はブラウザ/ライブラリが担う。→ **通信ペイロードの設計は自由、トランスポートを自前で書かずに済む**。

**③ 制御系（確実性必須）は Socket.IO に分離する。**
高頻度ゲーム状態は geckos.io（unreliable）、認証・ロビー・チャット・マッチイベントは **Socket.IO（WebSocket/TCP）** に分け、**「unreliable の低遅延」と「reliable の確実性」を 2 つの経路で両立**させる。

| 側 | 採用 |
| :--- | :--- |
| **ゲーム同期（unreliable / 高頻度）** | geckos.io WebRTC（UDP、低遅延） |
| **制御系（reliable / 低頻度）** | Socket.IO（WebSocket/TCP、確実・順序保証） |

**まとめ**
1. ブラウザでは生 UDP が使えないため、「カスタム UDP」は**WebRTC（geckos.io）か WebTransport** の 2 択に収斂する。
2. **ゲーム同期には geckos.io（WebRTC）**、**制御系には Socket.IO** を使い、各々の利点を活かす。
3. **WebTransport は Node 側未成熟のため見送り**（再検討余地は残す）。

### 4.7 サーバー側トランスポートの実装判断（Socket.IO + geckos.io）

**権威サーバーは Node.js + geckos.io（WebRTC）でゲーム同期層、Socket.IO（WebSocket/TCP）で制御系を構築**する。**サーバー言語は Node.js に固定**（C++ / Go / Rust は採用しない、単一言語 TypeScript で `packages/shared` を import 共有）。

| トランスポート | 実装 | 判定 | 備考 |
| :--- | :--- | :--- | :--- |
| **geckos.io WebRTC（ゲーム同期）** | `@geckos.io/server` + `@geckos.io/client` | **採用（ゲーム同期層の主経路）** | unreliable/unordered（位置・入力・Snapshot）+ `{ reliable: true }`（射撃・被弾確定）。`node-datachannel`（ネイティブ）前提。`multiplex:true` で UDP ポート集約可 |
| **Socket.IO（制御系）** | `socket.io` + `socket.io-client` | **採用（制御系）** | 認証・ロビー・ルーム・チャット・マッチイベント（reliable/ordered）。WebSocket/TCP |
| **WebSocket フォールバック（ゲーム同期）** | 後続で評価 | 保留 | UDP ブロック網では Socket.IO が主経路として機能させる。ゲーム同期の完全な WS フォールバックは体感を実測してから判断 |
| WebTransport | 見送り | 対象外 | Node 側の実装が未成熟／Experimental。将来再検討余地は残す |
| Colyseus | 廃止 | 対象外 | WebRTC/UDP のゲーム同期に未対応 |

> **サーバー言語の統一**: 権威ゲームサーバーは **Node.js** に固定する。C++ は採用しない（`g++` が使える環境である点は事実として認識するが、TypeScript で shared をクライアント/サーバー import 共有できる利点を優先し、単一言語運用を維持する）。

**現時点の推奨**: 権威サーバーは **Node.js 24**。**ゲーム同期層 = geckos.io WebRTC**（tick / 入力検証 / Snapshot / interpolation・prediction）、**制御系 = Socket.IO**（認証・ロビー・ルーム・チャット・マッチイベント）。マッチメイキング・状態同期は自前実装（geckos.io のルーム + Socket.IO のルーム管理を組み合わせ）。WebTransport は Node 側未成熟のため見送り。

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
| サーバー | Node.js 24（geckos.io WebRTC でゲーム同期 + Socket.IO で制御系） | 権威サーバー。TypeScript で sharing。ゲーム同期 = geckos.io WebRTC、制御系 = Socket.IO |
| 型 | **TypeScript strict** | `noUncheckedIndexedAccess` 推奨 |

## 10. ホスティング

| 用途 | 選定 | 理由 |
| :--- | :--- | :--- |
| 権威ゲームサーバー | **Node 専用サーバー（VPS / ゲームサーバー）** | 永続稼働・ルーム状態保持が必要（geckos.io WebRTC の UDP ポート + Socket.IO の TCP ポート）。サーバーレス（Vercel 等）は不可 |
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
packages/server   … 権威サーバー (Node.js 24, VPS)
                  ├ Socket.IO … 認証・ロビー・ルーム・チャット・マッチイベント
                  └ geckos.io (WebRTC/UDP) … ゲーム同期層（tick / 入力検証 / Snapshot）
                     └ interpolation / prediction
packages/client   … React + three.js (WebGL2) + @react-three/fiber
                  … 入力(mouse/keyboard/nipplejs) + クライアント予測 + HUD(zustand)
```

この構成を第 1 マイルストーンの土台とし、小さく検証しながら進めます。

**視覚エフェクトの設計方針**: 実際の商用 FPS はエフェクト用パケットすら個別に送らない。**描画・パーティクル演算は 100% クライアント（Three.js / r3f-vfx）で処理**し、サーバーは発生の合図（トリガー）だけを極めて軽量に流す。サーバーが毎フレーム送るプレイヤー情報（位置・向き）に **1 ビットフラグ（`isShooting: true`）** を混ぜるか、**geckos.io WebRTC（unreliable）** でトリガーを流し、クライアント側の Three.js が受け取ったら銃口からマズルフラッシュ・薬莢を**自律生成**する（エフェクトは装飾のため欠落しても進行に影響しない）。

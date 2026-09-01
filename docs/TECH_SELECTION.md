# CodWeb 技術選定（絞り込みと判断理由）

> `docs/CONFIG.md` は技術スタックの**全リスト（参考情報）**。本ドキュメントは、その中から**実装候補を絞り込んだ選定と判断理由**を記す。
> 方針: WebGL2 で安定優先 / 権威サーバーは **Node.js + Colyseus (v0.16+)**、**MVP は WebSocket**（WebTransport は P2-B で段階導入）/ 完全オリジナルアセット。

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

**権威サーバーは Node.js + Colyseus (v0.16+)**。**MVP は Colyseus 標準の WebSocket で実装**し、**WebTransport は P2-B で段階導入**する。WebTransport（HTTP/3 over QUIC）は導入後、**UDP 相当の `datagrams`（unreliable / unordered）**と**確実な `streams`（reliable / ordered）**の両方を 1 接続で提供し、**機能カテゴリごとに使い分ける**（設計上のターゲット）。

> **WebTransport の現状（2026-03〜）**: Safari 26.4 で Baseline 到達（Chrome/Edge/Firefox/Safari/Opera 全対応）。ただし ①一部ネットワークは UDP/QUIC をブロックするため **WebSocket（MVP 主経路）を必ず併設**、②**Node.js はネイティブの WebTransport サーバーを提供しない**（コミュニティパッケージ or quic-go/aioquic 等で終端）点に注意。**MVP は WebSocket（Colyseus 標準）を主経路とし、WebTransport の終端は P2-B で環境を分けて評価する**。

### 4.2 機能別 通信プロトコル選定マトリクス

> **MVP では以下の `datagrams`/`streams` をまとめて WebSocket（Colyseus 標準で reliable/ordered）に置き換える。** WebTransport 導入（P2-B）後、このマトリクスどおりに機能別で使い分ける。マトリクスは設計上のターゲット。

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

### 4.5 WebRTC はなぜ見送るか（ICE / STUN / TURN の複雑さ）

**結論：WebRTC は P2P 前提の規格であり、クライアント↔サーバー型 FPS で使うと運用・デプロイの複雑さが WebSocket / WebTransport より明確に増す。本プロジェクトでは WebTransport が優位**（出典: 調査 2026-03）。

1. **P2P 前提（fake-peer 構成）** — WebRTC は対等ピア間の規格。クライアント↔サーバーで使うには**サーバー側も「Peer の 1 つ」として WebRTC スタックを実装**する必要がある。
2. **シグナリングサーバーが必須（規格で未規定）** — 接続前に SDP（offer/answer）と ICE 候補を交換する必要があるが、その交換手段は規格で定められず、**通常は別途 WebSocket サーバーで中継**。ルーム管理・再接続・認証・レート制限・スケールを自前で持つことになる。
3. **NAT 越え（ICE / STUN / TURN）** — 複雑さとコストの主因。
   - **STUN**（自分の外向け IP を返す）: 軽量・安価。**約 8 割**の接続で成立。
   - **TURN**（直接繋がらないときの中継）: **帯域・遅延コスト大**。**約 1〜2 割**の接続で必要。**無料の商用 TURN はほぼ無く、自前（coturn）か有料**。
   - **ICE**: 候補を並列試行。悪いネットでは **3〜10 秒**の交渉遅延。
   - 本プロジェクトは **mobile 対象**であり、**キャリアグレード NAT（CGNAT）は WebRTC と相性が悪く、TURN 中継が必須になりやすく**、遅延・コストが跳ね上がる。
4. **デプロイ / ファイアウォール** — WebRTC は UDP の**ダイレクト接続**で、**ロードバランサ・プロキシを必ず迂回**。geckos.io でも「サーバー IP を公開しクライアントは直接接続、UDP ポート開放が必須」。**UDP を開けないホスティング（Heroku 等）では動作しない**。
5. **サーバー側 WebRTC スタック** — Node に組み込み WebRTC は無く、`node-datachannel`（=libdatachannel のバインディング）や `wrtc` など**ネイティブ依存 + ビルド**が要る。
6. **権威サーバー型と矛盾** — FPS はサーバー権威が必須だが、WebRTC を真の P2P で使うとクライアント同士が対等になりチート対策が崩れる。結局「**権威サーバー + UDP トランスポート**」として使うことになり、**ICE/STUN/TURN/シグナリングのコストだけを払って P2P の利点は得られない**。

**なぜ WebTransport なら簡潔か**：WebTransport はクライアント→サーバー単方向の QUIC 接続で、**NAT 越え（ICE/STUN/TURN）が不要**（WebRTC と違い）。unreliable な `datagrams` と確実な `streams` を 1 接続で使い分けられ、シグナリングも不要。**「unreliable（UDP 相当）が欲しい」という FPS の要件を、WebRTC の複雑さを一切払わずに満たせる**。

> つまり geckos.io（WebRTC）は「Node にネイティブ WebTransport が無い」問題を**無理矢理 UDP で回避**する割高な代替であり、本プロジェクトでは採用しない。**MVP は Colyseus 標準の WebSocket で十分**（reliable/ordered で FPS に必要な同期が成立）。WebTransport は P2-B の本命（Node 終端はコミュニティパッケージ / quic-go / aioquic 等）。

### 4.6 「カスタム UDP プロトコルでは？」という指摘への応答

> **指摘（開発者より）**: 「WS は TCP で遅延がある / WebTransport はまだ実験的 / UDP は安定している。なら**カスタム UDP プロトコルを作れば**いい。」

この指摘は**ネイティブゲームの文脈なら完全に正しい**（Gaffer On Games の `netcode.io` / ENet / RakNet はまさにカスタム UDP）。ただし**本プロジェクトはブラウザゲームであり、そこに 1 つの致命的な前提の誤解**がある（出典: 調査 2026-03）。

**① ブラウザは「生の UDP ソケット」を JavaScript に一切公開しない。**
生の TCP も同様。`fetch` / XHR / WebSocket はすべて HTTP(S) ベースであり、ブラウザは意図的に raw ソケットを塞いでいる（攻撃の踏み台・家庭内ネットワークへの侵入を防ぐため）[2](https://www.reddit.com/r/programming/comments/vs5r4n/no_really_why_cant_we_have_raw_udp_in_javascript/)[7](https://news.ycombinator.com/item?id=31984112)[9](https://stackoverflow.com/questions/17658368/why-no-udp-connection-via-browser-even-with-html5)。raw 接続は「アプリ層の誤用を防ぐハンドシェイクが無い」ため**今後も実装されない**。

> **Browsers deliberately do not expose raw TCP or UDP socket APIs to JavaScript.**[1](https://therelay.net/blog/rtsp-to-webrtc-browser)

→ よって「クライアント（ブラウザ）が**自前の UDP プロトコルを直接喋る**」ことは構造的に不可能。ブラウザから UDP 相当を出す手段は **WebRTC DataChannel** と **WebTransport `datagrams`** の 2 つだけ（WebRTC は ICE/STUN/TURN が要るので前述の通り見送り）。

**② 「カスタム UDP を書きたい」という本能は、ブラウザでは WebTransport に収斂する。**
WebTransport の `datagrams` こそが「**ブラウザ安全なカスタム UDP**」。アプリ層のメッセージフォーマット（バイナリレイアウト・シーケンス番号・優先度・フラグ）は完全に自前でカスタムできる一方、UDP 相当のトランスポート（TLS 1.3 暗号化・輻輳制御・0-RTT・ストリーム多重化）はブラウザが担う。→ **通信ペイロードの設計は自由、トランスポートは自前で輻輳制御/暗号化/再送を書かずに済む**。

**③ 友人の懸念は実は「サーバー側のライブラリ未成熟」に当たっている。**
「WebTransport は実験的」というのは、**クライアント（ブラウザ）側ではなく「Node.js サーバー側の実装」に当てはまる**。

| 側 | 成熟度（調査 2026-03） |
| :--- | :--- |
| **ブラウザ（クライアント）** | **Baseline 到達**（2026-03、Safari 26.4 で全ブラウザ対応）。**実験的ではない** |
| **Node.js（サーバー）** | **組み込み実装が無い**。`@fails-components/webtransport`（libquiche）のほか、Colyseus 公式 `@colyseus/h3-transport` は **Experimental 表記**。quic-go（Go）/ wtransport（Rust）/ aioquic（Python）で終端する選択肢もある |

→ **真の論点**は「プロトコルが実験的」ではなく「**サーバー側の WebTransport ライブラリがまだ未成熟**」。これは**MVP では WebSocket（Colyseus 標準）で権威サーバーを成立させ、WebTransport は P2-B で見極める**ことで回避する（後述 §4.7）。**サーバー言語は Node.js + Colyseus**（C++ 採用はしない）。

**まとめ**
1. ブラウザでは生 UDP が使えないため、「カスタム UDP」は**WebTransport か WebRTC**（複雑）の 2 択に収斂する。
2. WebTransport の `datagrams` が「ブラウザ安全なカスタム UDP」で、**アプリ層プロトコルは自由に作れる**。設計のターゲットとして妥当。
3. サーバー側 WebTransport ライブラリは未成熟。**MVP は WebSocket で成立させ、WebTransport は P2-B で評価**する。

### 4.7 サーバー側トランスポートの実装判断（MVP = WebSocket）

**MVP は Node.js + Colyseus（標準の WebSocket）で権威サーバーを成立**させる。WebTransport は P2-B で段階導入するが、**サーバー言語は Node.js + Colyseus のまま**（C++ / Go / Rust は採用しない）。

| トランスポート | 実装 | 判定 | 備考 |
| :--- | :--- | :--- | :--- |
| **WebSocket（MVP）** | Colyseus 標準 | **採用（MVP の主経路）** | `@colyseus/ws-transport` 等。全ブラウザ対応・成熟・シンプル。HoL ブロッキングあり（ただし MVP は WebSocket で成立させる） |
| WebTransport `datagrams`（P2-B 導入） | コミュニティパッケージ or quic-go/aioquic 等 | P2-B で評価 | Node にネイティブ実装が無い。`@colyseus/h3-transport` は **Experimental** のため MVP では未使用 |
| WebTransport 用の C++/Go/Rust 終端 | msquic / quic-go / wtransport 等 | **採用しない** | サーバーを Node.js + Colyseus に統一する方針。C++ は廃止 |

> **サーバー言語の統一**: 権威ゲームサーバーは **Node.js + Colyseus** に固定する。C++ は採用しない（`g++` が使える環境である点は事実として認識するが、TypeScript で shared をクライアント/サーバー import 共有できる利点を優先し、単一言語運用を維持する）。

**現時点の推奨**: 権威サーバーは **Node.js + Colyseus**、MVP は **WebSocket**。WebTransport（datagrams/streams）は **P2-B** で `datagrams` の体感遅延を測ってから導入し、終端の選択肢（コミュニティパッケージ / quic-go / aioquic 等）をその時点で決める。WebRTC（geckos.io / libdatachannel）は「WebSocket が遅い」問題を無理矢理 UDP で回避する割高な代替なので見送り。

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
| サーバー | Node.js + Colyseus（MVP: WebSocket。P2-B で WebTransport を評価） | 権威サーバー。TypeScript で sharing。MVP は Colyseus 標準の WebSocket、WebTransport は P2-B で導入検討 |
| 型 | **TypeScript strict** | `noUncheckedIndexedAccess` 推奨 |

## 10. ホスティング

| 用途 | 選定 | 理由 |
| :--- | :--- | :--- |
| 権威ゲームサーバー | **Node 専用サーバー（VPS / ゲームサーバー）** | 永続稼働・ルーム状態保持が必要（WebTransport 導入時は QUIC/UDP）。サーバーレス（Vercel 等）は不可 |
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
packages/server   … Colyseus 権威サーバー (Node, VPS)  +  MVP は WebSocket で成立
                  … ティックループ + ラグ補正 + 状態同期（WebTransport は P2-B で導入）
packages/client   … React + three.js (WebGL2) + @react-three/fiber
                  … 入力(mouse/keyboard/nipplejs) + クライアント予測 + HUD(zustand)
```

この構成を第 1 マイルストーンの土台とし、小さく検証しながら進めます。

**視覚エフェクトの設計方針**: 実際の商用 FPS はエフェクト用パケットすら個別に送らない。**描画・パーティクル演算は 100% クライアント（Three.js / r3f-vfx）で処理**し、サーバーは発生の合図（トリガー）だけを極めて軽量に流す。サーバーが毎フレーム送るプレイヤー情報（位置・向き）に **1 ビットフラグ（`isShooting: true`）** を混ぜるか、**WebTransport `datagrams`** でトリガーを流し、クライアント側の Three.js が受け取ったら銃口からマズルフラッシュ・薬莢を**自律生成**する（エフェクトは装飾のため欠落しても進行に影響しない）。

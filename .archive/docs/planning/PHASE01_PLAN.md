# Phase 1: ネットワーク初期 — 権威サーバー＋位置同期

> 対応 task-list ID: `P1-A` 〜 `P1-H`（[docs/task-list.md](../task-list.md)）
> 計画書テンプレート: [docs/planning/_TEMPLATE.md](./_TEMPLATE.md) 準拠
> 設計正本: [`../arch/server-authority.md`](../arch/server-authority.md)（権威サーバー仕様）／[`../arch/networking.md`](../arch/networking.md)（トランスポート・プロトコル）／[`../arch/modules.md`](../arch/modules.md)（ディレクトリ・依存ルール）／[`../arch/tech-stack.md`](../arch/tech-stack.md)（ライブラリ・黄金ルール）

---

## 1. 開始前確認

- 現在のブランチ / HEAD / `git status` を確認する（未コミット変更があれば停止）。ブランチは `arena/01a062ac-cod-web`。
- `docs/task-list.md` で **Phase 0（P0-A〜P0-H）が全て完了**していることを確認する。
- 関連仕様を読む: [`../arch/server-authority.md`](../arch/server-authority.md) 全文（本フェーズの直接の仕様）、[`../arch/modules.md`](../arch/modules.md) §3-§7（ディレクトリ・依存方向）、[`../arch/tech-stack.md`](../arch/tech-stack.md) §2/§5/§13 と黄金ルール、[`../../AGENTS.md`](../../AGENTS.md) §3/§6、[`.agent/skills/`](../../.agent/skills)（tech-stack / sandbox-constraints）。
- 本計画書の **§5（完了条件）** と **§7（停止条件）** を再読する。

## 2. 目的 (Why)

Krunker 風オンラインFPS の**マルチプレイヤーの最小価値**＝「**動いているプレイヤーが互いに見える**」を、権威型サーバー構成でエンドツーエンドに通す。

- これまで（Phase 0）はクライアント単体のシーン表示まで。本フェーズで初めて **bun の権威ゲームサーバー**と **shared の純粋ゲームロジック**を立ち上げ、クライアント予測・サーバー権威・リモート補間・調停という**ネットFPS の中核パターンを確立**する。
- 以降の射撃・ラグ補償・マップ（GLTF BVH）・アニメ・マッチメイキングは、**ここで作るレール（shared 純粋関数・固定 tick・バイナリパケット・NetTransport 抽象・CollisionWorld 境界）の上に載る**。境界を最初から正しく引くことが本フェーズの最大の価値。
- 性能の土台として、**シミュレーション tick 60Hz / 入力 60Hz / スナップショット送信 30Hz（レート分離）** と **データ指向（プレーン typed データ＋純粋システム関数）** を初期コードから体現する。

**Phase 1 の最小到達点（確定）**: 位置同期のみ。**2 つ以上のクライアント（タブ/ブラウザ）で、片方を WASD 移動させると他方でそのプレイヤーが滑らかに動いて見える**こと。

## 3. 変更範囲 (Scope)

### 変更対象（新規）

- **`shared/`（リポジトリルート新規・クライアント/サーバー共有・DOM/React/レンダラー非依存）**
  - `shared/protocol/constants.ts` — レート定数（SIM 60Hz / INPUT 60Hz / SNAPSHOT 30Hz・1tickおき）・量子化スケール・パケット種別・MTU/最大人数・移動定数。
  - `shared/protocol/messages.ts` — メッセージ型（`PlayerInput`・`PlayerState`・スナップショット型・制御メッセージ型）。
  - `shared/protocol/packer.ts` — **バイナリ固定レイアウト**のエンコード/デコード（DataView/ArrayBuffer、リトルエンディアン、呼び出し側がバッファを渡す＝ゼロアロケ方針）。
  - `shared/sim/` — 純粋シミュレーション: `movement.ts`（`stepPlayer(state, input, dt, world) → state`）、データ指向の `SimWorld`（プレーン typed 配列）、`collisionWorld.ts`（three-mesh-bvh をラップする衝突世界の境界）。
  - `shared/types.ts` — 共通型。
- **`server/`（リポジトリルート新規・bun・ヘッドレス）**
  - `server/index.ts` — `Bun.serve`（ネイティブ WebSocket）で起動。
  - `server/room/` — 単一デフォルトルーム・参加/離脱（`onJoin`/`onLeave`）・`playerId` 払い出し。
  - `server/sim/` — 60Hz 固定 tick（アキュムレータ）で shared のシムを回す権威ループ・入力消費・移動検証。
  - `server/net/` — スナップショット生成（30Hz・1tickおき）・バイナリブロードキャスト・バックプレッシャ間引き。
  - `server/physics/` — CollisionWorld の構築（Phase 1 は平面/簡易ジオメトリの BVH）。
- **`src/`（クライアント、既存 Phase 0 基盤に追加）**
  - `src/game/net/transport.ts` — **NetTransport 抽象インターフェース**（WT/WS 共通）。
  - `src/game/net/websocket.ts` — WS 実装（`binaryType='arraybuffer'`）。`webtransport.ts` は置かない（WT は後続、インターフェースのみ）。
  - `src/game/net/prediction.ts` / `reconciliation.ts` / `interpolation.ts` — 予測・調停・補間（純粋計算は shared を呼ぶ）。
  - `src/game/input/` — キーボード（WASD）＋ PointerLock マウス（yaw/pitch）の最小入力アダプタ。
  - `src/game/player/` — 自プレイヤー（カプセル＋一人称カメラ）とリモートプレイヤー（カプセル）の薄い R3F ラッパー。
  - `src/game/loop/` — 60Hz 固定の入力送信（rAF アキュムレータ）。既存 `useSpin` デモは本フェーズの本物に置換してよい（スコープ内）。
- **ビルド/設定**
  - `package.json` / `bun.lock` — 依存追加（**`three-mesh-bvh`**、サーバー型用 **`@types/bun`**）、スクリプト追加（`server` / `server:dev`）。
  - `tsconfig.json` — `shared`/`server` を include、パスエイリアス（`@shared/*` 等）。サーバーは bun 型。
  - `vite.config.ts` — クライアントから `shared` を解決するエイリアス追加。
  - `vitest.config.ts` — `shared`/`server` のテストを **node 環境**で実行（DOM 不要）。既存 client テストは jsdom 維持。

### 変更対象（ドキュメント）

- `docs/task-list.md` — Phase 1 セクション新設（P1-A〜H の行・状態・証拠）＋ロードマップ表の Phase 1 状態更新。**ついでに既存の古い記述「サーバー tick・入力 30Hz」を 60/30 レートに修正**（§11 参照）。
- `docs/README.md` — planning に PHASE01_PLAN.md を追加。
- `.agent/skills/`（tech-stack / sandbox-constraints）— bun サーバー・three-mesh-bvh ヘッドレス・WS など実装で得たハマりどころを追記。
- `README.md` — サーバー起動手順（`bun run server` ＋ `bun run dev`）があれば追記。

### 変更しない（境界外）

- **射撃・ヒットスキャン・ダメージ・キル・スコア**（combat は後続。ラグ補償は履歴バッファの器だけ用意し、判定は作らない）。
- ラウンド制・勝敗・購入・チャット・ボイス・HUD（接続状態の最小表示は除く）。
- **マッチメイキング・ロビー・seat reservation・再接続**（Phase 1 は起動時に単一デフォルトルームへ自動接続）。
- **WebTransport の有効化**（NetTransport インターフェースと WS 実装のみ。WT/Caddy 経路は後続フェーズで検証）。
- **GLTF 3D マップと BVH ビルド時事前生成パイプライン**（Phase 1 は平面/簡易ジオメトリ。ただし CollisionWorld は「ビルド済み BVH を受け取る」境界で作る）。
- アニメーション（XState FSM）・本格的な武器ビューモデル・モバイルタッチ操作・本格的なアンチチート（速度上限などの最小検証は除く）。
- bitecs / @miniplex の導入（Phase 1 はプレーン typed データ＋純粋関数。ライブラリは数千体規模になってから）。
- `.github/workflows/`（書き込み不可）、Playwright E2E 実行（Sandbox 不可）。
- 既存の Phase 0 で確定したツールチェーン・レンダラー（WebGPU/WebGL2）機構の変更。

## 4. 禁止事項

- **サーバー側でレンダラー/React/DOM を import しない**。`server/` と `shared/` は three の core/math と `three-mesh-bvh`（CPU のみ）のみ可。`three/webgpu`・`WebGLRenderer`・`GLTFLoader`（window/Image 依存）・react をサーバー/shared に持ち込まない（[`../arch/modules.md`](../arch/modules.md) §7 の依存方向）。
- **高頻度パケット（入力・スナップショット）を JSON/msgpackr で送らない**。手動バイナリ固定レイアウト（DataView）で作る。低頻度の制御（welcome/参加/離脱）だけ、Phase 1 は小さな信頼 JSON テキストフレームでよい（msgpackr は信頼イベント肥大化フェーズで導入）。
- **ホットループ（シム tick・useFrame・パック）で毎フレーム `new THREE.Vector3()`/`new ArrayBuffer` を無秩序に生成しない**。バッファは呼び出し側がプール/リングで管理（黄金ルール5・ゼロアロケ）。
- **毎フレーム更新する座標を React State で管理しない**。ref / Zustand `getState()`/`subscribe` を使う（黄金ルール4）。
- **物理エンジン（Rapier 等）を導入しない**。移動は three-mesh-bvh のキネマティックCC（カプセル shapecast）で自前（[`../arch/server-authority.md`](../arch/server-authority.md) §5）。
- **移動計算に量子化前の値を使わない**。クライアント/サーバーで同一結果にするため、シムは必ず**デコード後の入力値**を使う（決定論）。
- 深い OOP 継承でシムを書かない。エンティティは整数 ID・状態はフラット配列・ロジックは純粋関数（データ指向）。境界層（Room・WS ソケット・R3F）はクラス可。
- テストを通すためだけのスキップ・アサーション緩和・安易な `any`・Lint 無効化をしない（AGENTS.md §3.2）。
- 「ついでに」の無関係なリファクタリング・機能追加をしない（AGENTS.md §1.1）。
- 不明点は推測で埋めず、§7 の停止条件に従って質問する。

## 5. 完了条件 (DoD)

**コード品質（全サブタスク完了時）**

- [ ] `bun install` 成功（`three-mesh-bvh`・`@types/bun` 追加）。
- [ ] `bun run typecheck`（`tsc --noEmit`）が 0 error（`shared`/`server`/`src` 全て対象）。
- [ ] `bunx biome lint .` が 0 error。
- [ ] `bun run test:unit`（vitest）が green。shared/server の純粋ロジック（パック・量子化・移動・衝突・補間・調停）とサーバールームのロジック統合テストを含む。
- [ ] `bun run build`（vite build）が成功。**クライアントバンドルに `server/` が含まれない**こと、shared がバンドルされること。

**機能（実環境。Sandbox では実ブラウザ/WS の E2E 不可のためユーザー実機確認＝`実環境検証待ち`）**

- [ ] `bun run server` で bun サーバーが起動し、`bun run dev` のクライアントが WS 接続できる（接続成功表示）。
- [ ] クライアント単体で WASD＋マウス視点でカプセルがオフライン予測で滑らかに動く（床を貫通しない・ジャンプ/重力あり）。
- [ ] **2 タブ（または 2 ブラウザ）で開き、片方を動かすと、他方でそのプレイヤーが 50〜100ms 補間バッファで滑らかに動いて見える**（本フェーズのゴール）。
- [ ] 自プレイヤーはサーバー確定位置へ調停され、**人工遅延（~100ms）を入れても操作感がオフライン並みに保たれる**（ラバーバンドしない）。
- [ ] プレイヤーの参加/離脱が他クライアントに反映される（離脱したプレイヤーが消える）。

**計測・記録**

- [ ] **最大 20 人**フルスナップショットのサイズをユニットテストで実測・記録。**アプリ payload（設計目標 ~330B）と、ヘッダ込みの wire サイズ（IPv4: payload+28＝~358B、IPv6: payload+48＝~378B）を別々に断言**し、wire が保守 MTU **1200B 以内**（=payload ≤ 1152B）であること。payload を「MTU サイズ」と混同しない。
- [ ] 60Hz シム / 60Hz 入力 / 30Hz 送信が定数駆動であること（マジックナンバーで直接書かない）。
- [ ] `docs/task-list.md` の P1-A〜H の状態・進捗・証拠（コミット SHA・テスト件数・パケット実測サイズ）を更新。
- [ ] 範囲外のファイル（`.archive/` 等）に意図しない変更がない。

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit（vitest・**node 環境**） | ✅ 実施 | `shared/protocol` の量子化（yaw/pos/vel）ラウンドトリップ誤差、packer のバイトレイアウトとサイズ（**20 人で payload 長と wire 長［IPv4/IPv6 ヘッダ込み］を別々に断言・wire ≤1200B**）、`stepPlayer` の決定論（同一入力→同一状態）・重力/ジャンプ/床衝突・速度上限、CollisionWorld でカプセルが床に着地し貫通しない、補間 Lerp と外挿の計算、調停の replay 計算 |
| サーバーロジック統合（vitest node / bun、ヘッドレス） | ✅ 実施 | ソケットを使わず Room/Sim を直接駆動: 入力を投入 → tick 進行で位置が進む、参加/離脱でプレイヤー集合が変化、スナップショット生成バイトの `serverTick`/`lastAckSeq`、バックプレッシャで詰まりクライアントへのスナップショットがスキップされるロジック |
| Component（testing-library・jsdom） | △ 最小限 | 接続状態の最小 HUD 表示程度。R3F シーン自体は実描画不可のため深入りしない |
| E2E（Playwright / 実ブラウザ WS） | ❌ 実施しない（Sandbox 不可） | 実ブラウザ・実 WS の 2 タブ同期は**ユーザー実機確認**（`実環境検証待ち`）。CI は別タスク（CI-1） |
| 実環境（実機・本番 build） | ✅ ユーザー確認 | `bun run server` ＋ `bun run dev`（または build/preview）で 2 タブ同期・人工遅延での操作感・参加/離退 |

- テストファイルは原則テスト対象の隣に置く（`shared/**/*.test.ts`、`server/**/*.test.ts`）。shared/server はファイル先頭で `// @vitest-environment node` を指定して jsdom を回避。

## 7. 停止条件

次の場合は作業を停止し、変更せず報告する:

- 仕様書（server-authority / networking / modules / tech-stack / 本計画書）同士に矛盾がある。
- 本計画書の変更範囲を超える機能（射撃・WT 有効化・GLTF マップ・マッチメイキング等）が必要になった。
- 設計正本に記載のない**主要ライブラリの新規導入**が必要になった（bun の WS/backpressure API や three-mesh-bvh の API 詳細は実装時に調査してよいが、ライブラリ選定の変更は要確認）。
- bun のネイティブ WS / backpressure API が設計の想定（`ws.send` 戻り値 / `bufferedAmount`）と大きく異なり、パターン変更が必要。
- three-mesh-bvh が bun ヘッドレスで DOM/WebGL を要求して動かない（設計では CPU のみで動く前提。もし動かなければ報告）。
- ユーザー判断が必要な設計論点（パケットフォーマットの拡張・レート定数の変更等）に到達した。
- 開始時点で作業ツリーに未確認の変更がある。

## 8. 完了時に行うこと

1. 差分を自己レビュー（`server/` がクライアントバンドルに混入していないか、shared に DOM/react がないか、範囲外の変更がないか）。
2. 4 検証（typecheck / lint / test:unit / build）を実行し、全 PASS を確認。
3. パケットサイズ・レートの実測値を記録。
4. `docs/task-list.md` の P1-A〜H の状態・進捗・証拠を更新。実環境確認項目は `実環境検証待ち` として残す。
5. サブタスク ID を含むコミット（例: `feat(P1-B): shared kinematic movement stepPlayer + plane CollisionWorld`）を各サブタスク単位で作成。
6. 証拠中心の完了報告（結果 / テスト件数 / コミット SHA / パケット実測値 / ユーザー実機確認の手順 / 残事項）。

## 9. サブタスク分割

> 原則 **1 サブタスク = 1 commit**。各サブタスクで typecheck/lint/test を緑に保つ。

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| **P1-A** | shared/server 基盤・ビルド設定・プロトコル | `shared/`・`server/` ディレクトリ作成。`three-mesh-bvh`・`@types/bun` 追加。tsconfig/vite/vitest の shared・server 解決（エイリアス・node テスト環境）。`shared/protocol/constants.ts`（レート・量子化・パケット種別・移動定数・**payload/wire サイズ予算定数**）・`messages.ts` 型・**バイナリ `packer.ts`**。`src/game/net/transport.ts` の **NetTransport 抽象インターフェース**定義。packer/quantize のユニットテスト（**payload と wire を区別**） | - |
| **P1-B** | shared キネマティック移動（純粋関数） | `shared/sim/movement.ts` の `stepPlayer(state,input,dt,world)`（重力・ジャンプ・yaw 進行・速度上限）、`collisionWorld.ts`（**three-mesh-bvh BVH をラップする境界**。Phase 1 は平面/簡易ジオメトリの BVH、カプセル shapecast で着地・壁・めり込み解決）、データ指向 `SimWorld`（プレーン typed 配列）。決定論・床衝突のユニットテスト | P1-A |
| **P1-C** | bun サーバ骨架（WS 受付・ルーム） | `server/index.ts`（`Bun.serve` ネイティブ WS、0.0.0.0 バインド）、`server/room/`（単一デフォルトルーム・参加/離退・`playerId` 払い出し・最小 welcome/roster 通知）。接続/離脱のロジック統合テスト。`bun run server` で起動確認 | P1-A |
| **P1-D** | 60Hz 権威シミュレーション＋入力受信 | `server/sim/`（アキュムレータで固定 1/60s ステップ、最大ステップ数クランプ）。Input Packet 受信→各 tick で最新入力を 1 つ消費→shared `stepPlayer` を権威実行。移動妥当性検証（速度上限・範囲外・めり込み補正）。入力駆動で位置が進む統合テスト | P1-B, P1-C |
| **P1-E** | 30Hz スナップショット送信＋バックプレッシャ | `server/net/snapshot.ts`（1 tick おき＝30Hz でフルスナップショットを packer でバイナリ化、全員へブロードキャスト、`serverTick`/`lastAckSeq` 付与）。送信前のバッファ量チェックで詰まりクライアントは間引き。ラグ補償履歴バッファ（~100ms）の器だけ用意。スナップショット bytes/backpressure の統合テスト | P1-D |
| **P1-F** | クライアント接続・入力送信・オフライン予測移動 | `src/game/net/websocket.ts`（WS 実装）、`src/game/input/`（WASD＋PointerLock yaw/pitch）、60Hz 固定入力送信（rAF アキュムレータ、seq 採番）、`prediction.ts`（shared `stepPlayer` でローカル予測・pending 入力保持）、`src/game/player/`（自カプセル＋一人称カメラ）。**オフラインでも快適に動く**ことを確認 | P1-A, P1-B, P1-C |
| **P1-G** | スナップショット受信・リモート補間・調停 | `interpolation.ts`（50〜100ms バッファに溜めて render 時刻で Lerp・不足時は短時間外挿）、リモートプレイヤーカプセル描画（参加/離退の反映）、`reconciliation.ts`（`lastAckSeq` までサーバー確定位置へ補正し未 ack 入力を replay）。人工遅延での操作感検証。**2 タブで互いに滑らかに動く＝ゴール**（実機確認はユーザー） | P1-E, P1-F |
| **P1-H** | 検証・ドキュメント/skills 追従 | 4 検証全 PASS 確認、パケットサイズ実測記録、`docs/task-list.md`（P1-A〜H 証拠・Phase 1 状態）、`docs/README.md`、README のサーバー起動手順、`.agent/skills/` に bun/three-mesh-bvh/WS のノウハウ追記 | P1-A〜G |

## 10. 設計詳細・仕様

### 10.1 レポジトリ構成とビルド解決

- リポジトリルートに `shared/` と `server/` を新設（[`../arch/modules.md`](../arch/modules.md) §4/§5 の構成に従う）。クライアントは既存 `src/`。
- **エイリアス**: `vite.config.ts` と `tsconfig.json` に `@shared` → `<root>/shared` を追加。クライアントは `import { stepPlayer } from '@shared/sim/movement'` の形で参照。サーバーは bun が TS を直接実行するため相対/エイリアスいずれも可（tsconfig paths に揃える）。
- **tsconfig**: `include` に `shared`・`server` を追加。サーバーの `Bun.*` グローバルのため `@types/bun` を devDependency に追加（クライアントビルドには bun 型が漏れないよう、server 専用の tsconfig リファレンスにするか、型のみ利用。実装時にクリーンな方を選ぶ）。
- **vitest**: 既定 jsdm は維持しつつ、`shared/**`・`server/**` のテストはファイル先頭 `// @vitest-environment node` で DOM 非依存に。
- **起動スクリプト**: `package.json` に `"server": "bun run server/index.ts"`、`"server:dev": "bun --watch server/index.ts"` を追加。開発時は `bun run dev`（クライアント 5173）と `bun run server`（ゲームサーバー、例: 8080）を別プロセスで起動。
- **依存**: `three-mesh-bvh`（クライアント/サーバー両方が shared 経由で使用）、`@types/bun`（dev）。three は Phase 0 で導入済み。

### 10.2 レート定数（`shared/protocol/constants.ts`）

```ts
export const SIM_TICK_HZ = 60
export const SIM_DT = 1 / SIM_TICK_HZ        // ≈ 0.01667s
export const INPUT_SEND_HZ = 60              // シム tick と 1:1
export const SNAPSHOT_SEND_HZ = 30           // 1 tick おき送信
export const SNAPSHOT_SEND_EVERY_TICKS = SIM_TICK_HZ / SNAPSHOT_SEND_HZ  // = 2
export const INTERP_DELAY_MS = 100           // リモート補間バッファ（50〜100ms）
export const LAGCOMP_HISTORY_MS = 100        // ラグ補償履歴（器だけ）
export const MAX_PLAYERS = 20            // 1 ルーム最大人数

// ── パケットサイズ予算（payload と wire を厳密に区別する）──
// 制約が効くのは「ワイヤー上の IP パケット/データグラムサイズ」であって、
// アプリが pack する payload ではない点に注意。
export const WIRE_DATAGRAM_TARGET = 1200     // 保守的な path MTU（VPN/トンネル考慮）。wire 上限
export const UDP_HEADER_BYTES = 8
export const IPV4_HEADER_BYTES = 20
export const IPV6_HEADER_BYTES = 40          // 最悪ケース（IPv6）
export const IP_UDP_HEADER_MAX = UDP_HEADER_BYTES + IPV6_HEADER_BYTES // 48B
// アプリ payload の上限 = wire 上限 − ヘッダ予備（IPv6 最悪）= 1152B
export const PACKET_PAYLOAD_MAX = WIRE_DATAGRAM_TARGET - IP_UDP_HEADER_MAX
// スナップショット payload の設計目標（20 人時の実測 ~330B に pitch/flags・余裕を見て 360）。
// packer テストは payload と wire を別々に断言する
export const SNAPSHOT_PAYLOAD_TARGET = 360

// 量子化スケール
export const POS_SCALE = 100                 // 0.01m 単位（int16: ±327.67m）
export const VEL_SCALE = 100                 // 0.01m/s 単位
export const YAW_SCALE = 65535 / (Math.PI * 2)
// pitch は int8（-π/2〜+π/2 → -128〜127）

// 移動チューニング定数（参考値・要調整）
export const MOVE_SPEED = 8.0
export const GRAVITY = -20.0
export const JUMP_FORCE = 7.0
```

- レートは全て定数駆動。マジックナンバーをループに直接書かない。
- 座標は初期マップが原点 ±327m に収まる前提。広域化したら相対オフセット/int32 化（後続）。

### 10.3 パケット（バイナリ固定レイアウト）

仕様は [`../arch/server-authority.md`](../arch/server-authority.md) §6 の正本に従う。要点:

- 全バイナリパケットは先頭に **種別 `uint8`（リトルエンディアン）**。
  - `C2S_INPUT = 1`（60Hz・非信頼・本体 ~12B）: `seq:u32` / `moveX:i8` / `moveZ:i8` / `yaw:u16` / `pitch:i8` / `flags:u8`（jump 等）/ `dtMs:u16`。
  - `S2C_SNAPSHOT = 2`（30Hz・非信頼）: ヘッダ `serverTick:u32` + `lastAckSeq:u32`、可変長プレイヤー配列（1人 ~16B: `id:u16` / `x,y,z:i16` / `vx,vy,vz:i16` / `yaw:u16`）。必要なら `pitch:i8`+`flags:u8`（+2B/人）。
- **制御メッセージ（welcome / 参加 / 離脱）は Phase 1 では信頼 WS テキスト JSON**（低頻度・微小）。`welcome` には払い出した `playerId` と現在の roster を含める。msgpackr は信頼イベント肥大化フェーズで導入。
- **packer はバッファを呼び出し側から受け取る**設計: `encodeSnapshot(target: DataView, state) => number(書き込みバイト長)`。サーバーは送信バッファを**リング（2〜3 本の事前確保 ArrayBuffer）**で運用し、ブロードキャスト中の同一バッファ上書き競合を避けつつゼロアロケに寄せる。
- **制約が効くのは「ワイヤー上の IP パケット/データグラムサイズ」であって、アプリが pack する payload ではない**。スナップショットの**アプリ payload は 20 人で ~330B**（1人16B×20＝320＋ヘッダ9）だが、これに IP/UDP ヘッダが乗る:
  - IPv4: payload 330 + UDP 8 + IPv4 20 = **358B**
  - IPv6: payload 330 + UDP 8 + IPv6 40 = **378B**
  - 判定すべきは**ヘッダ込みの wire サイズ**が保守 MTU（1200B）に収まるか。packer のユニットテストでは **payload 長と wire 長（IPv4/IPv6 両方）を別々の定数・別々の断言**にし、payload を「MTU サイズ」と呼んで混同しないこと。設計上限は payload ≤ `PACKET_PAYLOAD_MAX`（=1200−48=1152B）として定義しておくと、人数が増えても wire が 1200B を割らない。
  - Phase 1 は WebSocket/TCP（フラグメントで分割される）だが、パケットはバイナリ固定レイアウトで WS↔WT 共通なので、**将来の WebTransport datagram（1 データグラム 1200B）を見据えて同じサイズ予算で設計**する（[`../arch/server-authority.md`](../arch/server-authority.md) §6.2）。

### 10.4 データ指向シム（`shared/sim/`）

- Phase 1 は bitecs を入れず、**プレーンな typed データ＋純粋関数**。ただし配列に作用する形で書き、後で bitecs に載せ替えやすくする。
- `PlayerState`（1 エンティティの状態）は数値フィールドのフラット構造:
  ```ts
  interface PlayerState {
    id: number; x: number; y: number; z: number
    vx: number; vy: number; vz: number
    yaw: number; pitch: number
    grounded: boolean
    lastInputSeq: number   // そのプレイヤーについて処理済みの最新入力 seq
  }
  ```
- `SimWorld` は Structure-of-Arrays を想定した器（Phase 1 は `PlayerState[]` を整数 ID で索引する形でも可。ただしシステムは「配列をループして純粋関数を適用」する形にする）。
- **純粋関数**: `stepPlayer(s: PlayerState, input: PlayerInput, dt: number, world: CollisionWorld): PlayerState`。
  - 処理: ①yaw から移動方向→水平速度（`MOVE_SPEED`、入力は量子化デコード後）、②重力＋接地時のみジャンプ、③座標積分、④**カプセルを BVH に shapecast して衝突解決**（地面・壁・坂・段差、浮遊高さ維持）。
  - 同じ入力・同じ BVH ならクライアント/サーバーで同一結果（決定論）。状態は引数のオブジェクトを in-place 更新してもよいが、外部状態（ネット・描画）には副作用を出さない。
- **CollisionWorld 境界**: `three-mesh-bvh` の `MeshBVH` をラップし、`moveCapsule(pos, vel, dt, capsule) → { pos, grounded, hitNormal }` を提供。ファクトリは「**ビルド済み BVH を受け取る**」形を基本とし、Phase 1 は `createPlaneWorld()`（大きな平面＋任意の簡易ボックスのジオメトリから `new MeshBVH`）を用意する。GLTF からの `MeshBVH.deserialize` はマップ導入フェーズでこの境界に差し込む（[`../arch/server-authority.md`](../arch/server-authority.md) §5.1）。
- サーバーはループで全プレイヤーに `stepPlayer` を適用し、速度上限・範囲外・めり込みを補正。

### 10.5 サーバーループ（60Hz シム / 30Hz 送信）

- `setInterval` またはタイマーで起動し、**アキュムレータ**で固定 1/60s ステップにディスパッチ。1 フレームあたりの最大ステップ数をクランプ（spiral of death 防止）。
- 各 tick: 各プレイヤーの最新入力を 1 つ消費 → `stepPlayer` → `lastInputSeq` 更新。
- **送信は tick と分離**: `tick % SNAPSHOT_SEND_EVERY_TICKS === 0` のときだけスナップショットを生成・ブロードキャスト（30Hz）。`serverTick` は送信時の最新シム tick。
- **バックプレッシャ**: 送信前に各 WS のバッファ量（bun の `ws.bufferedAmount` / `ws.send` 戻り値。実装時に API 確認）を見て、閾値超ならそのクライアントへの今回をスキップ。
- 単一デフォルトルーム。接続時に `playerId` 払い出し → welcome、切断時に除去して roster 更新。

### 10.6 クライアント

- **NetTransport 抽象**（`transport.ts`）: `connect(url)` / `sendBinary(buf)` / `onMessage(cb)` / `onOpen/onClose` を持つインターフェース。`websocket.ts` が実装（`binaryType='arraybuffer'`）。WT は後続で同インターフェースに追加。
- **入力**: WASD で moveX/moveZ、PointerLock マウスで yaw/pitch。**60Hz 固定で Input Packet 送信**（rAF アキュムレータで送信タイミングを計る。描画は可変・送信は固定）。`seq` 単調増加。
- **予測（prediction.ts）**: 入力のたび（または固定ステップ）に shared `stepPlayer` でローカル状態を進め、送信済み入力を `seq` 付きで pending 配列に保持。自カプセル/カメラは予測位置を直接 ref 反映（React State 不使用）。
- **補間（interpolation.ts）**: スナップショットをリモートプレイヤーごとに時刻付きバッファへ蓄積。`renderTime = now - INTERP_DELAY_MS` とし、それを挟む過去 2 フレームを Lerp（位置・yaw）。バッファ不足時は短時間外挿。
- **調停（reconciliation.ts）**: スナップショットの自 `playerId` の位置と `lastAckSeq` を得たら、自状態をサーバー確定位置に補正し、`seq > lastAckSeq` の pending 入力を先頭から replay して現在位置を再計算。
- **描画**: 自プレイヤーは一人称カメラ（カプセル本体は省略可）、リモートはカプセル/ボックスの簡易メッシュ。Phase 1 は通常メッシュでよい（InstancedMesh はプレイヤー多数化/パフォーマンスフェーズで）。

## 11. リスク・Gotchas

- **bun WS の backpressure API**: 設計は `ws.send` の戻り値 / `ws.bufferedAmount` / `backpressureLimit` を想定。bun のバージョン（1.4.0）で実際の挙動を P1-E で確認する。想定と異なれば §7 で報告。
- **three-mesh-bvh のヘッドレス動作**: `import { MeshBVH, shapecast } from 'three-mesh-bvh'` が three の core/math のみを参照し WebGL/DOM を要求しないことを P1-B の node テストで先に確認する。**GLTFLoader はサーバー/shared で import しない**。
- **ブロードキャスト中のバッファ上書き競合**: 1 本のモジュール共有バッファを全員への送信で使い回すと、send が非同期コピーされる前に上書きされる恐れ。リングバッファ（2〜3 本）か、送信ごとに確保しても 30Hz×~330B は僅少なので、まず正しさ優先で実装しボトルネックになってから最適化。
- **固定ステップの spiral of death**: 重いフレームでステップが無限に積まれないよう、1 フレームの最大ステップ数（例 5）をクランプ。
- **決定論の落とし穴**: シムは量子化**デコード後**の yaw/入力を使う。クライアントの生マウス値とサーバーが受け取る値を一致させる。浮動小数点の演算順序も両者で揃える（同じ関数を呼ぶことで担保）。
- **dev でのポート/オリジン**: クライアント 5173・サーバー（例 8080）。WS URL は定数/環境で設定。ライブプレビュー（e2b.app プロキシ）配下では WS のプロキシ経路が問題になりうるため、サーバーは 0.0.0.0 にバインドし、接続 URL は同一ホスト/設定で切り替えられるようにする。実環境確認はユーザー実機で行う（Sandbox では実 WS をブラウザ検証不可）。
- **payload と wire サイズの混同（MTU テストの注意）**: 「330B」はアプリが pack する **payload**（20 人時）。実際のワイヤー上の IP パケットは payload にヘッダが加わる — IPv4 では payload 330 + UDP 8 + IPv4 20 = **358B**、IPv6 では 330 + 8 + 40 = **378B**。単体テストでは **payload 長と wire 長（IPv4/IPv6 両方）を別々の定数・別々の断言**にし、「payload が 1200B 以下」ではなく「**ヘッダ込み wire が保守 MTU 1200B 以下（payload ≤ 1152B）**」を検証する。将来の WebTransport datagram（1 データグラム）を見据えた予算。
- **既存ドキュメントの古いレート記述**: `docs/task-list.md` のプロジェクト概要に「サーバー tick・入力 30Hz」という古い記述が 1 箇所残っている。P1-H で 60Hz シム/30Hz 送信/60Hz 入力に修正する（設計は 60/30 分離で確定済み）。

## 12. 実績と証拠（実装後に記入）

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| P1-A | （コミット後に SHA 記入） | 9 passed（packer/quantize） | 20人 snapshot: payload 329B（1+8+20×16）／ wire 357B(IPv4)・377B(IPv6)、payload 上限 1152B。typecheck 2構成・lint 29files・全 test 20・build 全 PASS |
| P1-B | （SHA 記入予定） | 7 passed（movement/collision） | three-mesh-bvh は bun/node ヘッドレスで動作確認済み。平面ワールドで落下静止・ジャンプ・水平移動・壁めり込み回避・決定論を検証 |
| P1-C | （SHA 記入予定） | 5 passed（Room） | `bun run server` 起動を smoke 確認（HTTP health 200・2 WS 接続で welcome/join/leave 通知）。Room はソケット非依存でテスト |
| P1-D | （SHA 記入予定） | 4 passed（Simulation） | 固定 1/60・アキュムレータ・最大5ステップ/フレーム。入力で前進・古い seq 無視・アイドルで重力落下を検証 |
| P1-E | （SHA 記入予定） | 5 passed（snapshot/backpressure） | 20 人スナップショット: payload **329B**（1+8+20×16）／ wire 357B(IPv4)・377B(IPv6)、≤1200。ライブ smoke: 1秒でちょうど **30 snapshot**・1人=25B |
| P1-F | （SHA 記入予定） | 6 passed（prediction） | WebSocket トランスポート・WASD/PointerLock 入力・60Hz 入力送信・ClientPrediction。Vite `/ws` プロキシで同一オリジン接続 |
| P1-G | （SHA 記入予定） | 6 passed（interpolation） | Interpolator で 100ms バッファ Lerp/外挿。**ライブ往復: Vite プロキシ経由で welcome＋23 snapshot/0.8s、入力30パケットでサーバー権威 z が 0→-3.87m**。実ブラウザ2タブ目視はユーザー実機確認待ち |
| P1-H | | | 4 検証 PASS・ドキュメント追従 |

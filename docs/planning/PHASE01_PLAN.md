# Phase 1: モノレポ（fps 系）と Babylon 移行

> 対応 task-list ID: `PLAT-1`（本計画） / 実装 `PH1-A` … `PH1-F`（docs/task-list.md）
> 計画書テンプレート: docs/planning/_TEMPLATE.md 準拠
> 仕様正本: [`docs/arch/milestones.md`](../arch/milestones.md) フェーズ 1、[`architecture.md`](../arch/architecture.md)、[`client.md`](../arch/client.md)、[`protocol.md`](../arch/protocol.md)、[`adr.md`](../arch/adr.md)
> 着手合意（2026-09-05 / 2026-09-08）: モノレポは fps 系のみ / Channel 頭 1B のみ / GPU 予算は本フェーズ DoD から外す / `dtMs` は ms / fps Snapshot は `vy` を含める / package 名は `@cod/*` / Babylon options は型にあるものだけ
> 次セッション: [`HANDOFF.md`](./HANDOFF.md)。§10.5 は **PLAT-1R で公式一次情報を確認済み**。PH1-E は本計画を再読してから着手。

## 1. 開始前確認

- ブランチはセッション固定。着手時に `git status` / `git log -5` を確認し、未コミット変更があれば停止する
- 依存: フェーズ 0（PH0-A〜F）完了。本計画（PLAT-1）が実装の前提
- 関連仕様: milestones フェーズ 1、architecture（workspaces・依存規則）、client（Babylon・入力累積）、protocol（Channel・WS のみ）、adr（ADR-002 / 003 / 005）
- 本計画の §5 と §7 を再読してから実装サブタスクに入る
- **PLAT-1R で公式 Web 検索済み**。§10.5 の URL と、実装着手時の `node_modules` 型・Biome schema を突き合わせる。公式・型・arch が食い違う場合は §7 の停止条件に従って質問する

## 2. 目的 (Why)

フェーズ 0 で現行 bun WS の穴は塞いだ。次は **理想形の置き場（モノレポ）** と **描画の Babylon 化** を同時に進め、R3F シーンを捨てる（ADR-003）。

milestones フェーズ 1 の文言は「workspaces、`noRestrictedImports`、R3F シーン削除、`createEngine`、unadjustedMovement、入力累積、React を HUD/メニューのみ、単一マップで FFA が Babylon 上で動く」。

本計画は次の合意で範囲を切る。

| 論点 | 合意 |
|---|---|
| モノレポ | **fps 系パッケージだけ切る。** voxel / gamemodes パッケージはフェーズ 2–3 |
| ワイヤ | **Channel 頭 1B だけ足す。** Input 16B 本体と Snapshot レイアウト（現行 type=2）は変えない |
| GPU 予算 | engineering.md には残す。**本フェーズの完了条件からは外す**（Sandbox で計測不能） |
| Input `dtMs` | **ミリ秒**で確定。0.1ms 単位（×10）にはしない |
| fps Snapshot `vy` | **含める**。PH1-C では現行 Snapshot レイアウトを Channel 以外変えない |
| workspace package name | **`@cod/*`** に統一する |
| Babylon options | **型にあるものだけ**使う。型に無い canvas hint は後続最適化へ回す |

## 3. 変更範囲 (Scope)

変更対象:

- ルート `package.json` — bun workspaces。`packages/*` と `apps/*` を追加
- `packages/protocol` — 現行 `shared/protocol/*` と量子化を移す
- `packages/engine-core` — Room / Simulation / レート制限 / ingest など L1 相当（SimProfile インターフェースの本実装はフェーズ 2。現行クラスを置く）
- `packages/profile-fps` — 現行 `shared/sim/movement.ts` とサーバ物理（three-mesh-bvh）を移す。書き直しは最小
- `apps/gameserver` — 現行 `server/`
- `apps/web` — 現行 `src/`。ハブ相当はまだ単一ページ。Babylon シーンは `client-fps` 相当のディレクトリに置く
- `NetTransport` — `send(channel, payload)`。WS 実装は先頭 1B に Channel。ゲームコードから `WebSocket` 直接参照をやめる
- クライアント描画 — `@babylonjs/core`。R3F / Three シーン（`src/game/scene/*`, `GameCanvas.tsx`, `createRenderer.ts`）は削除
- 入力 — `requestPointerLock({ unadjustedMovement: true })`。mousemove は累積しフレーム先頭で消費
- `_tests_/` — ミラーを新パスへ。量子化・ingest fuzz・スナップショットは残す
- `biome.json` — 依存規則（実装時に公式 schema でルール名を確認。発明しない）
- マップパス — 静的埋め込み可。CDN 前提のパスだけ決める（実 CDN は置かない）。将来の階層は `/fps/{official|ugc}/{slug}`（[editor.md](../arch/editor.md)）

変更しない（境界外）:

- `packages/profile-voxel` / `apps/web/client-voxel` / `gamemodes/*`（フェーズ 2–3）。`/fps|voxel/{official|ugc}` の本格ルーティング/エディタは後続
- SimProfile インターフェース本実装・決定論 1000×100（フェーズ 2）
- `defineGameMode` / Ctx / fps-ffa を独立モードパッケージ化（フェーズ 3）。本フェーズの「FFA」は現行単一ルームの位置同期を Babylon 上で動かすこと
- Hello HMAC・座席・マッチメイカー・Redis（フェーズ 4）
- Snapshot ワイヤを type `0x11` ヘッダへ変更、`vy` 削除、entity 17B 化（`vy` は含めると決定済み。PH1-C では現行 Snapshot レイアウトを Channel 以外変えない）
- Channel 以外のプロトコル拡張（Ping / FireAction / AOI / チャンク）
- `webtransport.ts`（フェーズ 9）
- モバイルタッチ（`TouchControls.tsx` を本フェーズで新規実装・配線しない）
- ボイス
- GPU 数値 DoD（ドローコール &lt; 100、中位機 &lt; 8ms）
- `.archive/` と過去ログの書き換え

## 4. 禁止事項

- 不明点は推測で埋めず、§7 の停止条件に従って質問する
- `docs/arch/adr.md` に反する実装をしない（R3F で新規 3D を足さない。WT / geckos / 生 UDP を足さない）
- L1 に `if (type === 'voxel' | 'fps')` を書かない（voxel パッケージ自体を作らない）
- 存在しない Bun API（`bufferedAmount`）を `NetTransport` に載せない。protocol.md の型例にあるが、フェーズ 0 どおり `send()` 戻り値を使う
- Input 16B 本体のレイアウト変更、Snapshot レイアウト変更
- `dtMs` をミリ秒以外の単位として扱わない（OPEN-A はミリ秒で解決済み）
- fuzz を通すためだけのテスト削除
- Babylon / noa / Biome / Bun の **リポジトリに無い名前を発明する**。型定義や schema に無いキーは書かない。無ければ停止して質問する

強制されていないこと（本フェーズでやらない）: voxel パッケージ、Hello 認証、GPU 実測、タッチ入力、ハブ初期バンドル 300KB。

## 5. 完了条件 (DoD)

フェーズ全体（PH1-F 完了時）:

- [ ] bun workspaces で `packages/protocol` / `engine-core` / `profile-fps` / `apps/gameserver` / `apps/web` がビルドできる
- [ ] voxel / gamemodes パッケージがリポジトリに無い（意図的。フェーズ 2–3）
- [ ] 依存規則が Biome で破ると lint が落ちる（少なくとも「web から `WebSocket` 直接」「engine-core から profile-fps を跨いだ実装詳細」の一方以上）
- [ ] R3F / `@react-three/fiber` / `GameCanvas` の Three シーンがコードから無い
- [ ] Babylon `Engine` を公式 constructor / installed `.d.ts` に沿って作る。`desynchronized` / `preserveDrawingBuffer` は Canvas/WebGL context attributes として扱うが、`@babylonjs/core` の型に無い場合は渡さず、後続最適化へ回す。型に無い key を invent しない
- [ ] Pointer Lock が `unadjustedMovement: true`。視線はフレーム先頭で累積消費
- [ ] React は HUD / メニュー / オーバーレイのみ。3D を JSX で組まない
- [ ] 単一静的マップで既存の位置同期（Input 16B + Snapshot 現行）が Babylon 上で動く経路がある（ユニットまたはコンポーネント。実 2 タブは実環境検証待ち）
- [ ] WS の高頻度フレームは先頭 1B が Channel。Input の **残 16B** はフェーズ 0 と同一。長さ 16 のまま Channel 無しで来たら切断 1002
- [ ] `bun run typecheck` / `bunx biome lint .` / `bun run test:unit` / `bun run build` 全 pass
- [ ] `docs/task-list.md` の状態・進捗・証拠を更新
- [ ] タスク範囲外のファイル（`.archive/` を含む）に意図しない変更がない

GPU ドローコール / フレーム ms は **本フェーズ DoD に含めない**（engineering.md の予算は残す）。

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit (vitest) | 必須 | 既存 packer / ingest 1e6 / snapshot / Room。Channel 剥がし後に Input 16B。Channel 欠落は ProtocolError。workspaces 解決で import が通る |
| Component (testing-library) | 任意 | HUD がキャンバス外の DOM であること。3D を JSX で持たない |
| E2E (Playwright / CI) | しない | `test:e2e` 未導入。捏造しない |
| 実環境 | しない（本フェーズ） | 2 タブ位置同期・GPU 予算は「実環境検証待ち」。完了 % を 100 にしない項目 |

## 7. 停止条件

次の場合は作業を停止し、変更せず報告する:

- 仕様書同士に、本計画 §11 で解消していない矛盾があり、実装が進めない
- task-list.md 記載の変更範囲を超える変更が必要
- Snapshot ワイヤや Input 16B 本体を変えないと Babylon 化できない
- 開始時点で作業ツリーに未確認の変更がある
- bun workspaces / Biome 制限 / Babylon `Engine` の公式と arch が食い違い、arch を書き換えないと進めない

## 8. 完了時に行うこと

1. 差分を自己レビュー（R3F 残存、`bufferedAmount`、Channel 無し send、voxel パッケージ誤作を grep）
2. 4 検証を実行（ドキュメントのみならリンク整合）
3. `docs/task-list.md` を更新
4. タスク ID を含むコミット
5. 証拠中心の完了報告
6. フェーズ 1 完了時の COMPLETE メモは任意（task-list の証拠が正）

## 9. サブタスク分割

1 サブタスク = 1 commit。順序固定。進行中は 1 件。

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| PLAT-1 | 本計画書 | `PHASE01_PLAN.md`、task-list | PH0-F |
| PH1-A | bun workspaces + fps 系へ移動 | ルート workspaces、`packages/protocol` `engine-core` `profile-fps`、`apps/gameserver` `web`。描画はまだ R3F | PLAT-1R |
| PH1-B | 依存規則を Biome で強制 | `noRestrictedImports` 相当。WebSocket 直接参照禁止。ルール名は公式 schema で確認 | PH1-A |
| PH1-C | Channel 頭 1B | `NetTransport.send(channel, view)`。サーバ ingest が 1B 剥がしてから Input 16B。同一コミットで client+server | PH1-A |
| PH1-D | Babylon Engine + R3F シーン削除 | `@babylonjs/core`。`scene/*` / R3F Canvas 削除。静的マップ埋め込み | PH1-A |
| PH1-E | unadjustedMovement + 入力累積 | Pointer Lock オプション。mousemove はキュー、フレーム先頭で消費 | PH1-D |
| PH1-F | React を HUD のみ + 位置同期経路 | 3D は Babylon 命令型。既存ネットコード移植。単一マップ FFA 相当 | PH1-C, PH1-D, PH1-E |

推奨順: PLAT-1 → A → B と C は A の後（同時進行しない）→ D → E → F。B と C と D は A 後なら依存上は並列にできるが、進行中は 1 件なので A → C → B → D → E → F。

## 10. 設計詳細・仕様

### 10.1 モノレポ（PH1-A）

architecture.md の目標構成のうち、本フェーズで作るもの:

```
/
├ package.json                 # workspaces
├ packages/
│  ├ protocol/                 # package name: @cod/protocol
│  ├ engine-core/              # package name: @cod/engine-core
│  └ profile-fps/              # package name: @cod/profile-fps
├ apps/
│  ├ gameserver/               # package name: @cod/gameserver
│  └ web/                      # package name: @cod/web。React シェル + client-fps 相当
```

作らない: `profile-voxel`、`gamemode-sdk`、`matchmaker`、`gamemodes/*`、`client-voxel`。

移動は git mv 相当を優先（履歴を残す）。`shared/` と `server/` と `src/` は空になったら削除する。内部 package 名は `@cod/*`（`@cod/protocol`, `@cod/engine-core`, `@cod/profile-fps`, `@cod/gameserver`, `@cod/web`）に統一し、workspace 間依存は `workspace:*` を使う。エイリアス `@shared` は `@cod/protocol` 等の package import へ張り替える。

マップパス（CDN 前提・実ファイルはリポジトリ埋め込み可）:

```
/fps/official/pvp/render.glb
/fps/official/pvp/collision.glb
/fps/official/pvp/meta.json
```

本フェーズは平面または現行の埋め込み地形で足りる。glb が無ければプレーン地面。meta.json の sha256 照合は任意（フェーズ 2 でも可）。Krunker.io 風エディタと UGC 公開フローは後続フェーズ。

### 10.2 依存規則（PH1-B）

architecture.md より、本フェーズで意味があるもの:

```
packages/engine-core  → protocol のみ（profile-fps の実装詳細は禁止）
packages/protocol     → 他パッケージ禁止
apps/web              → protocol と net。WebSocket グローバルは net 実装ファイル以外禁止
apps/gameserver       → protocol, engine-core, profile-fps
```

Biome のルール ID は実装時に `biome.json` schema / 公式ドキュメントで確認する。存在しないルール名を書かない。

### 10.3 Channel（PH1-C）

protocol.md の Channel:

- `Reliable = 0`（制御。本フェーズの welcome JSON はこれまでどおり **テキストフレーム**でもよい。バイナリ制御は足さない）
- `Unreliable = 1`（Input / Snapshot）
- `Bulk = 2`（本フェーズ未使用。送ったらサーバは 1002）

ワイヤ（バイナリフレーム）:

```
0  u8   channel
1..    payload
```

Input の payload はフェーズ 0 の 16B のまま（type=0x10 … dtMs）。**アプリから見た Input は 16B。** ソケット上は 17B。`dtMs` は **ミリ秒**として扱う（通常 60Hz で 16〜17ms、clamp 500ms）。

サーバ `ingestInput`:

1. 空 → 1002
2. 先頭 channel ≠ Unreliable → 1002（本フェーズは入力以外のバイナリを受けない）
3. 残りを `decodeInput`（長さ ≠ 16 なら既存どおり 1002）

クライアント送信: `send(Channel.Unreliable, sendBytes.subarray(0, 16))`。先頭 1B は送信バッファ先頭に書くか、1 バイト足したビュー。**payload のコピーはしない**（リング / 既存プール。`slice` 禁止）。

`NetTransport` から `bufferedAmount` は載せない。`send` の戻り値はサーバ側 bun `ws.send` のみ（フェーズ 0）。ブラウザ `WebSocket.send` に戻り値は無いのでクライアントは void のまま。

`connect(url, ticket)` の ticket は本フェーズ未使用。署名無しで `connect(url)` を残してよい（Hello はフェーズ 4）。

同一コミットで client+server+tests。途中コミットで片方だけ Channel を付けると接続不能。

### 10.4 Babylon（PH1-D / E / F）

client.md / api-sources.md どおり（導入時の `.d.ts` で再確認してから書く）:

- `Engine` は公式 constructor `new Engine(canvasOrContext, antialias?, options?: EngineOptions, adaptToDeviceRatio?)` を使う
- `desynchronized` / `preserveDrawingBuffer` は Chrome の Canvas/WebGL context attributes として公式確認済み。ただし 2026-09-06 の Babylon typedoc `EngineOptions` ページでは同名プロパティが一覧に出ていない。実装時にインストールした `@babylonjs/core` の型で再確認し、型に無い場合は渡さず後続最適化へ回す。型に無い名前を invent しない
- `alpha: false`, `stencil: false`, `powerPreference: 'high-performance'`, `failIfMajorPerformanceCaveat` 等は導入時の型で許されるものだけ渡す
- 効いたかは WebGL context の `getContextAttributes()` で読む。Babylon private field（例: `_gl`）に依存しない
- 解像度 `setHardwareScalingLevel`。動的解像度は本フェーズ任意
- AA オフ、影 static またはオフ、ポストプロセスオフ

破棄: `src/game/scene/*`、`GameCanvas.tsx` の R3F、`@react-three/fiber` / `@react-three/drei` / クライアントの `three` 描画。サーバ衝突の `three-mesh-bvh` は **profile-fps に残す**（ADR-006。Havok を足さない）。

入力:

- `requestPointerLock({ unadjustedMovement: true })`（[Pointer Lock](https://w3c.github.io/pointerlock/)）
- mousemove はカメラに直接足さない。累積し、**描画フレーム先頭で消費**してからレンダ
- タッチは配線しない

React: `App.tsx` / HUD / StartOverlay は DOM。キャンバスは `Engine` が所有する `<canvas>`。

ネット: `GameClient` / prediction / interpolation はレンダラ非依存のまま移植（product.md）。

### 10.5 PLAT-1R: 公式一次情報で確認した API（2026-09-06）

PLAT-1R では `HANDOFF.md` の指示どおり、下表を公式ドキュメント / 一次情報で確認した。PH1-A 以降は、ここに無い API 名・設定キーを記憶で足さない。実装時は `node_modules` の `.d.ts` / Biome schema と再照合し、食い違えば §7 の停止条件で止まる。

| 領域 | 公式確認した内容 | PH1 実装での扱い | 出典 |
|---|---|---|---|
| Bun workspaces | ルート `package.json` の `workspaces` キーに workspace ディレクトリを列挙する。例は `"workspaces": ["packages/*"]`。各 workspace は自分の `package.json` を持ち、workspace 内依存は `"workspace:*"` 等で参照できる。glob と negative pattern も対応。最新 docs には catalog / self-contained workspaces もある。 | PH1-A は単純な `workspaces` に `packages/*` と `apps/*` を置く。内部 package 名は `@cod/*` に統一する。catalog / self-contained は必要になった時だけ再確認して導入する。 | [1](https://bun.com/docs/pm/workspaces) |
| Bun install / workspace 実行 | `bun install` は workspace をサポートする。`--filter` で一部 package の依存インストールや script 実行対象を絞れる。 | まず root で `bun install --frozen-lockfile`。必要なら `bun --filter` を使うが、root の 4 検証を正とする。 | [2](https://bun.com/docs/pm/cli/install) |
| Bun WebSocket | `Bun.serve({ websocket })` は `open` / `message` / `close` / `error` / `drain` を持つ。`maxPayloadLength` 既定 16MB、`idleTimeout` 既定 120 秒、`backpressureLimit` 既定 16MB、`closeOnBackpressureLimit` 既定 false、`sendPings` 既定 true、`publishToSelf` 既定 false、`perMessageDeflate` を設定できる。最新 docs は `ws.data` typing を `websocket.data` property で示す。 | PH1 でも現行の明示値（`idleTimeout: 30`, `backpressureLimit: 1MB`, `closeOnBackpressureLimit: true`, `sendPings: true`, `perMessageDeflate: false`）を維持する。serve call の generic 型引数 前提は使わない。 | [1](https://bun.com/docs/runtime/http/websockets) |
| Bun `ServerWebSocket.send` | `send(message, compress?)` は number を返す。`-1` は enqueue されたが backpressure、`0` は connection issue により dropped、`1+` は送信バイト数。`drain` で再開する。 | サーバ側は `send()` 戻り値を見る。`bufferedAmount` は Bun server WS の公式型に載っていないため使わない。 | [1](https://bun.com/docs/runtime/http/websockets) |
| Bun HTTP/3 / WT | Bun v1.3.14 の HTTP/3 は highly experimental。制限として WebSocket over HTTP/3 は未対応（`server.upgrade()` が false）、WebTransport は separate project。 | D6 維持。PH1 では WebSocket のみ。`webtransport.ts` を作らない。 | [1](https://bun.com/blog/bun-v1.3.14) |
| Biome import 制限 | Biome の rule ID は `lint/style/noRestrictedImports`。設定は `linter.rules.style.noRestrictedImports`。`level` / `options.paths` / `options.patterns` / `importNames` / `allowImportNames` が公式例にある。この rule は recommended ではないため明示有効化が必要。 | PH1-B はこの rule ID と schema を使う。architecture.md の `noRestrictedImports` は意図ではなく、実設定では `style.noRestrictedImports` 配下に書く。 | [1](https://biomejs.dev/linter/rules/no-restricted-imports/) |
| Biome private import | `noPrivateImports` は `lint/correctness/noPrivateImports`。recommended で有効。`@private` / `@package` の JSDoc visibility を使う project-domain rule。 | PH1-B で package 境界に使えるかは検討可。ただし PH1-B の主手段は `noRestrictedImports`。 | [3](https://biomejs.dev/linter/rules/no-private-imports/) |
| Pointer Lock | `Element.requestPointerLock(options?)` の `options.unadjustedMovement` は OS の mouse acceleration 調整を無効化し raw mouse input を取るための optional boolean。例は `await canvas.requestPointerLock({ unadjustedMovement: true })`。 | PH1-E はユーザー操作（click 等）から呼ぶ。Promise/非Promise 差は実装時に型とブラウザ挙動を確認し、失敗時は通常 pointer lock へフォールバックする設計にする。 | [2](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestPointerLock) / [spec](https://w3c.github.io/pointerlock/) |
| Canvas `desynchronized` | Chrome の公式記事は `canvas.getContext('webgl', { desynchronized: true, preserveDrawingBuffer: true })` を示し、`getContextAttributes().desynchronized` で feature detection する例を載せている。 | 低遅延 canvas の意図は維持。ただし Babylon `EngineOptions` 型に同名 key が無い場合は型に無い key を invent しない。 | [4](https://developer.chrome.com/blog/desynchronized) |
| Babylon `Engine` | Babylon typedoc の `Engine` constructor は `new Engine(canvasOrContext, antialias?, options?: EngineOptions, adaptToDeviceRatio?)`。`getCreationOptions()` で作成時 options を取得できる。 | PH1-D は `new Engine(canvas, antiAlias, options, adaptToDeviceRatio)` を使う。`createEngine` は本プロジェクトの薄い wrapper 名としてのみ可。 | [2](https://doc.babylonjs.com/typedoc/classes/BABYLON.Engine) |
| Babylon `EngineOptions` | Babylon typedoc の `EngineOptions` は `stencil`, `failIfMajorPerformanceCaveat`, `premultipliedAlpha`, `useHighPrecisionFloats`, `xrCompatible` 等を列挙する。一方、2026-09-06 に取得した同ページの property 一覧には `desynchronized` / `preserveDrawingBuffer` が出ていない。 | PH1-D では installed `.d.ts` を確認し、型に無ければその key を渡さない。低遅延 canvas hint は後続最適化へ回す。 | [EngineOptions](https://doc.babylonjs.com/typedoc/interfaces/BABYLON.EngineOptions) |
| Babylon 解像度 | `setHardwareScalingLevel(level: number): void` は typedoc にあり、level=1 が canvas 等倍、0.5 が 2 倍解像度。 | PH1-D/F で `engine.setHardwareScalingLevel(1 / resolutionScale)` 相当を使う場合は型確認して使う。 | [2](https://doc.babylonjs.com/typedoc/classes/BABYLON.Engine) |
| Babylon Mesh 最適化 | `Mesh` typedoc は `freezeWorldMatrix`, `thinInstanceSetBuffer`, `thinInstanceSetMatrixAt` を method として持ち、`doNotSyncBoundingInfo: boolean` property を持つ。 | 静的メッシュ / リモートプレイヤー多数化の最適化候補。PH1-D では必要最小限。 | [4](https://doc.babylonjs.com/typedoc/classes/BABYLON.Mesh) |
| Babylon Material | `Material.freeze(): void` は typedoc にあり、material update を lock する。 | 静的 material にだけ使う。動的変更が必要な material に無条件で使わない。 | [2](https://doc.babylonjs.com/typedoc/classes/babylon.material) |
| `@babylonjs/core` npm | npm registry latest（2026-09-06 確認）は `@babylonjs/core@9.25.0`、license `Apache-2.0`、`type: module`、`types: index.d.ts`。`dependencies` / `peerDependencies` は latest メタデータ上 null。 | 実装時の導入バージョンは人間に確認してよい。少なくとも peer 追加が必須とは決めない。 | [npm registry](https://registry.npmjs.org/@babylonjs/core/latest) |

#### 10.5.1 公式確認で見えた不一致（ここでは arch を書き換えない）

| 論点 | 片方の記述 | もう片方の記述 / 確認結果 | PH1 計画での扱い |
|---|---|---|---|
| `EngineOptions.desynchronized` / `preserveDrawingBuffer` | 低遅延 canvas hint として使いたい意図がある。 | Babylon typedoc `EngineOptions` の 2026-09-06 取得結果では property 一覧に `desynchronized` / `preserveDrawingBuffer` が出ていない。一方 Chrome は canvas context attributes として両 key を示す。 | PH1-D 実装時に installed `.d.ts` を確認。型に無ければ渡さず、後続最適化へ回す。 |
| `noRestrictedImports` の置き場所 | `docs/arch/architecture.md`: 「Biome `noRestrictedImports` で強制」 | Biome 公式 rule ID は `lint/style/noRestrictedImports`、設定は `linter.rules.style.noRestrictedImports`。 | PH1-B では `style.noRestrictedImports` と schema を使う。 |


## 11. リスク・Gotchas

- **ADR-005 vs 本計画:** ADR は Channel / Hello を「最初から」と言う。Hello はマッチメイカー（フェーズ 4）。**Channel だけ本フェーズ。** Hello を今入れないのは範囲の切り方であり、HMAC を実装して ADR を覆すものではない
- **`NetTransport.bufferedAmount`:** DOC-4 で protocol.md の型例から削除済み。Bun server 側は `send()` 戻り値で背圧を見る。
- **Input 長さ:** フェーズ 0 で 16B 済み。protocol.md も 16B 現行に更新済み。本計画は 16B を正とする
- **product.md の lagcomp「record 未呼び出し」:** フェーズ 0 で毎ティック記録済み。arch の古い一文
- workspaces 移動はテストパス・tsconfig・Vite alias が同時に壊れる。PH1-A は「動く移動」だけ。Babylon は D
- Channel はワイヤ破壊。PH1-C は client+server 同時
- 旧 `docs/planning/PHASE01_PLAN.md`（単一 FPS の旧計画）は `.archive` 側。本ファイルがフェーズ 1 の正
- Sandbox 再構築時は `git fetch` + `reset --hard FETCH_HEAD`。ローカルだけの Babylon 実験は消えるので都度 push

## 12. 実績と証拠（実装後に記入）

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| PLAT-1 | `663f815` / `87e0294` | ドキュメント整合 | 合意: fps のみ / Channel 1B / GPU DoD 外す。初版 API 表は arch 二次情報のみ |
| PLAT-1R | `20fa678` | 公式検索 + docs 整合 | §10.5 を公式一次情報に差し替え。D1–D10 維持。Babylon EngineOptions の不一致を明示 |
| PLAT-1Q | 本コミット | 人間確認 + docs 整合 | `dtMs` はミリ秒、fps Snapshot は `vy` 含む、workspace package name は `@cod/*`、Babylon options は型にあるものだけ使う、と確定 |
| PH1-A | 本コミット | `bun run typecheck` / `bunx biome lint .` / `bun run test:unit` / `bun run build` pass | fps 系 5 workspaces（`@cod/protocol`, `@cod/engine-core`, `@cod/profile-fps`, `@cod/gameserver`, `@cod/web`）へ移動。R3F/Three 描画は PH1-D まで残置 |
| PH1-B | 本コミット | `bun run typecheck` / `bunx biome lint .` / `bun run test:unit` / `bun run build` pass | `biome.json` overrides で `lint/style/noRestrictedImports` と `lint/style/noRestrictedGlobals` を有効化。`SimulationStep<TWorld>` 注入で `engine-core` から `profile-fps` 依存を削除。probe file で違反時 lint error を確認後削除 |
| PH1-C | 本コミット | `bun run typecheck` / `bunx biome lint .` / `bun run test:unit` / `bun run build` pass | Channel 1B framing を追加。Input payload は 16B のまま、WS frame は 17B。Snapshot も `Channel.Unreliable` + 現行 payload。Channel 欠落・空・Reliable・Bulk は ProtocolError 1002 |
| PH1-D | 本コミット | `bun run typecheck` / `bunx biome lint .` / `bun run test:unit` / `bun run build` pass | `@babylonjs/core@9.25.0` を導入し、R3F scene / renderer / loop を削除。Babylon `Engine` は installed `.d.ts` の `EngineOptions` に沿い、型に無い `desynchronized` / `preserveDrawingBuffer` は渡さない。preview HTTP 200 |
| PH1-E | | | |
| PH1-F | | | |

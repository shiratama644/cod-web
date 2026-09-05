# Phase 1: モノレポ（fps 系）と Babylon 移行

> 対応 task-list ID: `PLAT-1`（本計画） / 実装 `PH1-A` … `PH1-F`（docs/task-list.md）
> 計画書テンプレート: docs/planning/_TEMPLATE.md 準拠
> 仕様正本: [`docs/arch/milestones.md`](../arch/milestones.md) フェーズ 1、[`architecture.md`](../arch/architecture.md)、[`client.md`](../arch/client.md)、[`protocol.md`](../arch/protocol.md)、[`adr.md`](../arch/adr.md)
> 着手合意（2026-09-05）: モノレポは fps 系のみ / Channel 頭 1B のみ / GPU 予算は本フェーズ DoD から外す

## 1. 開始前確認

- ブランチはセッション固定。着手時に `git status` / `git log -5` を確認し、未コミット変更があれば停止する
- 依存: フェーズ 0（PH0-A〜F）完了。本計画（PLAT-1）が実装の前提
- 関連仕様: milestones フェーズ 1、architecture（workspaces・依存規則）、client（Babylon・入力累積）、protocol（Channel・WS のみ）、adr（ADR-002 / 003 / 005）
- 本計画の §5 と §7 を再読してから実装サブタスクに入る

## 2. 目的 (Why)

フェーズ 0 で現行 bun WS の穴は塞いだ。次は **理想形の置き場（モノレポ）** と **描画の Babylon 化** を同時に進め、R3F シーンを捨てる（ADR-003）。

milestones フェーズ 1 の文言は「workspaces、`noRestrictedImports`、R3F シーン削除、`createEngine`、unadjustedMovement、入力累積、React を HUD/メニューのみ、単一マップで FFA が Babylon 上で動く」。

本計画は次の合意で範囲を切る。

| 論点 | 合意 |
|---|---|
| モノレポ | **fps 系パッケージだけ切る。** voxel / gamemodes パッケージはフェーズ 2–3 |
| ワイヤ | **Channel 頭 1B だけ足す。** Input 16B 本体と Snapshot レイアウト（現行 type=2）は変えない |
| GPU 予算 | engineering.md には残す。**本フェーズの完了条件からは外す**（Sandbox で計測不能） |

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
- マップパス — 静的埋め込み可。CDN 前提のパスだけ決める（実 CDN は置かない）

変更しない（境界外）:

- `packages/profile-voxel` / `apps/web/client-voxel` / `gamemodes/*`（フェーズ 2–3）
- SimProfile インターフェース本実装・決定論 1000×100（フェーズ 2）
- `defineGameMode` / Ctx / fps-ffa を独立モードパッケージ化（フェーズ 3）。本フェーズの「FFA」は現行単一ルームの位置同期を Babylon 上で動かすこと
- Hello HMAC・座席・マッチメイカー・Redis（フェーズ 4）
- Snapshot ワイヤを type `0x11` ヘッダへ変更、`vy` 削除、entity 17B（ADR 未決 B。今やらない）
- Channel 以外のプロトコル拡張（Ping / FireAction / AOI / チャンク）
- `webtransport.ts`（フェーズ 9）
- モバイルタッチ（`TouchControls.tsx` を本フェーズで新規実装・配線しない）
- ボイス
- OPEN-A（`dtMs` 単位）
- GPU 数値 DoD（ドローコール &lt; 100、中位機 &lt; 8ms）
- `.archive/` と過去ログの書き換え

## 4. 禁止事項

- 不明点は推測で埋めず、§7 の停止条件に従って質問する
- `docs/arch/adr.md` に反する実装をしない（R3F で新規 3D を足さない。WT / geckos / 生 UDP を足さない）
- L1 に `if (type === 'voxel' | 'fps')` を書かない（voxel パッケージ自体を作らない）
- 存在しない Bun API（`bufferedAmount`）を `NetTransport` に載せない。protocol.md の型例にあるが、フェーズ 0 どおり `send()` 戻り値を使う
- Input 16B 本体のレイアウト変更、Snapshot レイアウト変更
- `dtMs` を ×10 にも ms にも「決定した」と書かない（OPEN-A）
- fuzz を通すためだけのテスト削除
- Babylon / noa の未確認 API を発明する。公式ドキュメントでシグネチャを確認してから書く

強制されていないこと（本フェーズでやらない）: voxel パッケージ、Hello 認証、GPU 実測、タッチ入力、ハブ初期バンドル 300KB。

## 5. 完了条件 (DoD)

フェーズ全体（PH1-F 完了時）:

- [ ] bun workspaces で `packages/protocol` / `engine-core` / `profile-fps` / `apps/gameserver` / `apps/web` がビルドできる
- [ ] voxel / gamemodes パッケージがリポジトリに無い（意図的。フェーズ 2–3）
- [ ] 依存規則が Biome で破ると lint が落ちる（少なくとも「web から `WebSocket` 直接」「engine-core から profile-fps を跨いだ実装詳細」の一方以上）
- [ ] R3F / `@react-three/fiber` / `GameCanvas` の Three シーンがコードから無い
- [ ] Babylon `Engine` を公式 `EngineOptions`（`desynchronized` / `preserveDrawingBuffer` は client.md どおり。効いたかは `getContextAttributes()` で読むコードがある）で作る
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
- OPEN-A を「決定」したくなる
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
| PH1-A | bun workspaces + fps 系へ移動 | ルート workspaces、`packages/protocol` `engine-core` `profile-fps`、`apps/gameserver` `web`。描画はまだ R3F | PLAT-1 |
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
│  ├ protocol/
│  ├ engine-core/
│  └ profile-fps/
├ apps/
│  ├ gameserver/
│  └ web/                      # React シェル + client-fps 相当
```

作らない: `profile-voxel`、`gamemode-sdk`、`matchmaker`、`gamemodes/*`、`client-voxel`。

移動は git mv 相当を優先（履歴を残す）。`shared/` と `server/` と `src/` は空になったら削除する。エイリアス `@shared` は `packages/protocol` へ張り替えるか、パッケージ名 import に変える。

マップパス（CDN 前提・実ファイルはリポジトリ埋め込み可）:

```
/maps/fps/ffa-default/render.glb
/maps/fps/ffa-default/collision.glb
/maps/fps/ffa-default/meta.json
```

本フェーズは平面または現行の埋め込み地形で足りる。glb が無ければプレーン地面。meta.json の sha256 照合は任意（フェーズ 2 でも可）。

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

Input の payload はフェーズ 0 の 16B のまま（type=0x10 … dtMs）。**アプリから見た Input は 16B。** ソケット上は 17B。

サーバ `ingestInput`:

1. 空 → 1002
2. 先頭 channel ≠ Unreliable → 1002（本フェーズは入力以外のバイナリを受けない）
3. 残りを `decodeInput`（長さ ≠ 16 なら既存どおり 1002）

クライアント送信: `send(Channel.Unreliable, sendBytes.subarray(0, 16))`。先頭 1B は送信バッファ先頭に書くか、1 バイト足したビュー。**payload のコピーはしない**（リング / 既存プール。`slice` 禁止）。

`NetTransport` から `bufferedAmount` は載せない。`send` の戻り値はサーバ側 bun `ws.send` のみ（フェーズ 0）。ブラウザ `WebSocket.send` に戻り値は無いのでクライアントは void のまま。

`connect(url, ticket)` の ticket は本フェーズ未使用。署名無しで `connect(url)` を残してよい（Hello はフェーズ 4）。

同一コミットで client+server+tests。途中コミットで片方だけ Channel を付けると接続不能。

### 10.4 Babylon（PH1-D / E / F）

client.md どおり（公式で再確認してから書く）:

- `Engine` 第 3 引数のコンテキスト属性: `desynchronized: true`, `preserveDrawingBuffer: true`, `alpha: false`, `stencil: false`, `powerPreference: 'high-performance'`
- Babylon `EngineOptions` に同名があることは計画時点の確認済み。実装時に現行 `@babylonjs/core` の型で再確認する
- 効いたかは `getContextAttributes()` で読む
- 解像度 `setHardwareScalingLevel`。動的解像度は本フェーズ任意
- AA オフ、影 static またはオフ、ポストプロセスオフ

破棄: `src/game/scene/*`、`GameCanvas.tsx` の R3F、`@react-three/fiber` / `@react-three/drei` / クライアントの `three` 描画。サーバ衝突の `three-mesh-bvh` は **profile-fps に残す**（ADR-006。Havok を足さない）。

入力:

- `requestPointerLock({ unadjustedMovement: true })`（[Pointer Lock](https://w3c.github.io/pointerlock/)）
- mousemove はカメラに直接足さない。累積し、**描画フレーム先頭で消費**してからレンダ
- タッチは配線しない

React: `App.tsx` / HUD / StartOverlay は DOM。キャンバスは `Engine` が所有する `<canvas>`。

ネット: `GameClient` / prediction / interpolation はレンダラ非依存のまま移植（product.md）。

## 11. リスク・Gotchas

- **ADR-005 vs 本計画:** ADR は Channel / Hello を「最初から」と言う。Hello はマッチメイカー（フェーズ 4）。**Channel だけ本フェーズ。** Hello を今入れないのは範囲の切り方であり、HMAC を実装して ADR を覆すものではない
- **protocol.md の `NetTransport.bufferedAmount`:** 型例にある。bun にそのプロパティは無い。フェーズ 0 の決定を維持し、載せない。矛盾は残置（本計画で protocol.md を書き換えない）
- **protocol.md「現行 packer は 13B」:** フェーズ 0 で 16B 済み。arch の古い一文。本計画は 16B を正とする
- **product.md の lagcomp「record 未呼び出し」:** フェーズ 0 で毎ティック記録済み。arch の古い一文
- workspaces 移動はテストパス・tsconfig・Vite alias が同時に壊れる。PH1-A は「動く移動」だけ。Babylon は D
- Channel はワイヤ破壊。PH1-C は client+server 同時
- 旧 `docs/planning/PHASE01_PLAN.md`（単一 FPS の旧計画）は `.archive` 側。本ファイルがフェーズ 1 の正
- Sandbox 再構築時は `git fetch` + `reset --hard FETCH_HEAD`。ローカルだけの Babylon 実験は消えるので都度 push

## 12. 実績と証拠（実装後に記入）

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| PLAT-1 | 本コミット | ドキュメント整合 | 合意: fps のみ / Channel 1B / GPU DoD 外す |
| PH1-A | | | |
| PH1-B | | | |
| PH1-C | | | |
| PH1-D | | | |
| PH1-E | | | |
| PH1-F | | | |

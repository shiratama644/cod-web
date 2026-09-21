# クライアント

描画は **Babylon.js**（ADR-003）。3D に React を使わない。React はハブ・HUD・設定・メニュー（DOM）のみ。

PH1-D で旧 R3F scene / renderer / loop は破棄済み。PH1-F で React 側は `<canvas>` host / HUD / touch UI / start overlay に限定し、ネットコード（`apps/web/src/game/net/*`）は Babylon の描画ループから呼ぶ経路を unit test で固定した。

> 2026-09-22 更新: FPS/Voxel/Sandbox 3カテゴリ UI、Header タブ、Left Sidebar (Krunker風) Sandbox ボタン、Sandbox モーダル、詳細ページ、投票 UI を本ファイルに追記。

## ハブ UI レイアウト（Phase 4）

### Header

```
[Logo] [FPS] [Voxel] [Search] [User]
```

- `[FPS]` / `[Voxel]` タブ切替。デフォルト FPS。`/?type=fps` 等で URL 同期。
- FPS タブ: `fps-official-*` (FFA/TDM/DOM等) をメイン表示。
- Voxel タブ: `voxel-official-survival` 等をメイン表示。

### Left Sidebar (Krunker.io風)

```
[Play]
[Sandbox]  <- 押下で Sandbox モーダル
[Settings]
[Shop]
```

- 縦ボタン群。Sandbox ボタンで UGC ハブモーダルを開く。

### メイン画面 (デフォルト FPS)

- 初期表示は FPS ゲーム画面 (`GameCanvas` + HUD)。
- Phase 3 時点は `fps-official-ffa` 単一。Phase 4 で FFA/TDM/DOM 投票入口を追加。

### Sandbox モーダル

- トリガー: Left Sidebar 「Sandbox」ボタン。
- カード: thumbnail / title / creator / totalPlays / description。
- フィルタ: カテゴリ別 (Bedwars/Zombie/Athletic 等 = `genres`)。
- ソート: totalPlays / activePlayers / detailViews。
- クリックで詳細ページ `/sandbox/{id}` へ。

### 詳細ページ & 参加フロー

- `/sandbox/{id}`: カード詳細 + `[Play Now]` + `[ルーム選択]`。
- Play Now: 空きルーム自動マッチ (`POST /v1/seek-game` 相当)。
- Room Selection: ルーム一覧モーダル (`GET /v1/game-list` 相当) → 手動選択参加。

### 投票 UI

- トリガー: 1マッチ終了時 (`onRoundEnd` 後)。
- 表示: 全プレイヤーに次の試合形式候補 (FFA/TDM/DOM等) を表示。
- 動作: 多数決で次モード決定。`VoteSession` / `VoteEvent` 型は `types.md` 参照。
- 実装: React HUD 側で `VoteOverlay` コンポーネント。tick 基準タイマー (`after`/`every`) で管理。

## バンドル

### 理想（目標 < 300 KB gzip）

初期: shell / hub / net。Babylon を載せない。ルーム参加時に動的 import: `client-voxel`（@babylonjs/core + noa-engine + profile-voxel）または `client-fps`（@babylonjs/core + profile-fps）。Vite が `@babylonjs/core` を共有チャンクに切り出すのは望ましい。

### 現行（PH1-F時点）

`apps/web` は `@babylonjs/core` を初期依存に含み、単一チャンクで配信している（`dist/assets/index-*.js` 約 1.4MB / gzip 364KB）。hub / shell / client-fps の分離は未実装。PH2-E以降で `hub/` / `shell/` / `net/` / `client-voxel/` / `client-fps/` の動的 import 分割を検討する。現状の 364KB gzip は理想の 300KB を超過しているが、移行中の暫定値として許容する。

## エンジン初期化

`Engine` は公式 constructor `new Engine(canvasOrContext, antialias?, options?: EngineOptions, adaptToDeviceRatio?)` を使う。第 3 引数 `EngineOptions` には `stencil`, `failIfMajorPerformanceCaveat`, `premultipliedAlpha` 等がある。

低遅延の `desynchronized: true` と、ちらつき対策の `preserveDrawingBuffer: true` は Chrome の Canvas/WebGL context attributes として公式確認済み。ただし 2026-09-06 時点の Babylon typedoc `EngineOptions` property 一覧には出ていない（[api-sources.md](./api-sources.md)）。実装時は導入した `@babylonjs/core` の `.d.ts` と public API を確認し、**型にある `EngineOptions` だけを使う**。型に無い場合、`desynchronized` / `preserveDrawingBuffer` は渡さず、低遅延 canvas hint は後続最適化タスクへ回す。型に無い key を invent しない。Babylon の private field（例: `_gl`）には依存しない。

解像度は `setHardwareScalingLevel`。動的解像度: 平均フレーム >20ms なら scale を下げ、<13ms ならゆっくり上げる。下限 0.5。

## 入力

`requestPointerLock({ unadjustedMovement: true })`。mousemove/pointermove ではカメラを動かさず累積し、**フレーム先頭で消費**してから描画する。

PH1-E で `InputController` は raw pointer lock を first try し、`NotSupportedError` 時に通常 Pointer Lock へフォールバックするようになった。視線 delta は `consumeLookDelta()` で Babylon render loop 先頭に消費する。Sandbox/jsdom では raw mouse の実ブラウザ成否までは検証しない。

モバイルは両タイプ対象。タッチ（仮想スティック等）は後続フェーズ。初期は Pointer Lock + キーボード。

## グラフィック初期値

Krunker の低品質寄りを参考にする。「まず動く、盛りたい人は盛る」。AA オフ、解像度 0.75（低スペック 0.5）、影 static、ポストプロセスオフ。ネットワーク設定（snapshotRate, interpolationMs auto, ping 表示）をユーザーに出す。

Babylon 最適化: typedoc 確認済みの `freezeWorldMatrix`, `doNotSyncBoundingInfo`, `material.freeze`, thin instances を使う。`scene.freezeActiveMeshes` 等の scene-level 最適化は導入時に現行 typedoc / `.d.ts` で再確認する。衝突は自前 BVH / ボクセルグリッド。目標ドローコール **100 未満**。

`freezeActiveMeshes` は RTT 更新を止める。必要なら `camera.customRenderTargets` に明示追加。

## 予測と補間

`SimProfile.step` をローカル即時適用。ack 済み入力を捨て、誤差が許容（voxel 0.35m / fps 0.25m）超ならサーバポーズへスナップして未 ack を replay。pending はリングバッファ（`shift()` 禁止）。

補間遅延の既定 = パケット間隔 × 2。

| タイプ | snapshotHz | 既定補間 |
|---|---:|---:|
| fps | 30 | **66 ms** |
| voxel | 15 | **134 ms** |

現行 `INTERP_DELAY_MS = 100` は fps に対して厚い。理想は 66ms + ジッタ連動（`auto`、上限 250ms）。

## ボイス

理想に含める。ゲーム同期とは別チャネルの WebRTC メディア。着手時期は未定。ゲームの `NetTransport` に音声を混ぜない。

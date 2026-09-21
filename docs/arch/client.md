# クライアント — 改訂版

描画は **Babylon.js**（ADR-003）。3D に React を使わない。React はハブ・HUD・設定・メニュー（DOM）のみ。

PH1-D で旧 R3F scene / renderer / loop は破棄済み。PH1-F で React 側は `<canvas>` host / HUD / touch UI / start overlay に限定し、ネットコード（`apps/web/src/game/net/*`）は Babylon の描画ループから呼ぶ経路を unit test で固定した。

> 2026-09-22 改訂版: OfficialはFPS 1ゲーム複数モード (FFA/TDM/DOM投票) + Voxel 1モード永続 (Survival)、Sandboxは標準FPS/Voxel以外の公式ゲーム + UGC、親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic。

## ゲーム種別・階層構造 — 改訂版

```
Official (公式ゲーム):
  FPS: 1ゲーム複数モード [FFA,TDM,DOM,etc.] — 投票で次ルール決定
  Voxel: 1モードのみ [Survival] — 永続サバイバル、死んだらリスポーン

Sandbox (公式拡張+UGC):
  FPS: examples [TDM,DOM,Zombie,etc.] — 公式拡張 + UGCのFPS
  Voxel: examples [Bedwars,Athletic,etc.] — 公式拡張 + UGCのVoxel
```

- Official FPSは1ゲーム複数モード、Official Voxelは1モード永続。
- SandboxはUGCだけでなく、標準FPS/Voxel以外の公式ゲームも含む。

## ハブ UI レイアウト — 改訂版 (Official切替 + Sandbox)

### Header / Navigation Tabs (Officialゲームの切り替え)

```
[Logo] [FPS] [Voxel] [Search] [User]
  FPSタブ: 公式FPS画面を表示
  Voxelタブ: 公式Voxel画面を表示
```

- [FPS]タブ: 公式FPS画面を表示。1ゲーム複数モード [FFA,TDM,DOM]、投票で次決定。
- [Voxel]タブ: 公式Voxel画面を表示。1モードのみ [Survival]、永続サバイバル。
- Officialゲームの切り替え。デフォルト Official FPS。

### Left Sidebar (Krunker.io風UI)

```
[Play]
[Sandbox]  <- 押下で Sandbox モーダル
[Settings]
[Shop]
```

- 縦ボタン群。Sandboxボタンで拡張ゲーム群モーダルを開く。
- SandboxはUGCだけでなく、標準FPS/Voxel以外の公式ゲームも含む。

### メイン画面仕様 (デフォルト: Official FPS) — 改訂版

- 初期表示は Official FPSゲーム画面 (`GameCanvas` + HUD)。
- Official FPSは1つのゲームに複数モード [FFA,TDM,DOM] を持つ。現行 `fps-official-ffa` はFFAサブモード最小実装。
- Official Voxelは1モードのみ [Survival]、永続サバイバル、死んだらリスポーン。
- 1マッチ終了時、次マッチのゲーム形式（FFA,TDM等）を投票で決定。Official FPSのみ。
- ヘッダータブで Official Voxel (Survival) への切り替えが可能。

### Sandbox モーダル — 改訂版 (親ジャンル+サブタグ)

- トリガー: Left Sidebar [Sandbox]ボタン。
- 一覧表示 (カード形式): サムネイル、タイトル、作者名、累計プレイ数、簡易説明文。SandboxはUGCだけでなく公式拡張も含むため、作者名は Official または ユーザー名。
- フィルター機能:
  - 親ジャンル (FPS / Voxel など)
  - サブタグ (Bedwars, Zombie, Athletic など)
- ソート機能:
  - 累計プレイ数順
  - 現在のプレイ人数順（アクティブ数）
  - 詳細ページ閲覧数順
- カードクリックで詳細ページ `/sandbox/{id}` へ。

### Sandbox 詳細ページ & ルーム参加フロー — 改訂版

- 遷移: カードクリックで各ゲームの詳細ページへ。`/sandbox/{id}` → 内部 `/{type}/{source}/{slug}` 解決。公式拡張 (例: /fps/official/zombie) もUGCも対象。
- アクション:
  - [Play Now] ボタン: 自動で空きルームを検索して即時参加。
  - [ルーム選択] ボタン: ルーム一覧モーダルを開き、手動でサーバーを選択して参加。

### 投票 UI — Official FPS 1ゲーム複数モード用

- トリガー: Official FPSで1マッチ終了時 (`onRoundEnd` 後)。
- 表示: 全プレイヤーに次の試合形式候補 (同一FPSゲーム内のサブモード FFA/TDM/DOM等) を表示。
- 動作: 多数決で次サブモード決定。Official Voxelは投票対象外 (Survival永続)。
- 実装: React HUD 側で `VoteOverlay` コンポーネント。`VoteSession` の `subMode` が ffa/tdm/dom。

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

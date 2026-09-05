# クライアント

描画は **Babylon.js**（ADR-003）。3D に React を使わない。React はハブ・HUD・設定・メニュー（DOM）のみ。

現行 `src/game/scene/*` と R3F Canvas は移行時に破棄する。ネットコード（`src/game/net/*`）は移植する。

## バンドル

初期（目標 &lt; 300 KB gzip）: shell / hub / net。Babylon を載せない。

ルーム参加時に動的 import: `client-voxel`（@babylonjs/core + noa-engine + profile-voxel）または `client-fps`（@babylonjs/core + profile-fps）。Vite が `@babylonjs/core` を共有チャンクに切り出すのは望ましい。

## エンジン初期化

`Engine` 第 3 引数に WebGL コンテキスト属性を渡す。低遅延のため `desynchronized: true`。ちらつき対策で `preserveDrawingBuffer: true`（[Chrome desynchronized](https://developer.chrome.com/blog/desynchronized)）。`alpha: false`, `stencil: false`, `powerPreference: 'high-performance'`。

Babylon の `EngineOptions` に `desynchronized` / `preserveDrawingBuffer` がある。実際に効いたかは `getContextAttributes()` で確認する。

解像度は `setHardwareScalingLevel`。動的解像度: 平均フレーム &gt;20ms なら scale を下げ、&lt;13ms ならゆっくり上げる。下限 0.5。

## 入力

`requestPointerLock({ unadjustedMovement: true })`。mousemove ではカメラを動かさず累積し、**フレーム先頭で消費**してから描画する。

モバイルは両タイプ対象。タッチ（仮想スティック等）は後続フェーズ。初期は Pointer Lock + キーボード。

## グラフィック初期値

Krunker の低品質寄りを参考にする。「まず動く、盛りたい人は盛る」。AA オフ、解像度 0.75（低スペック 0.5）、影 static、ポストプロセスオフ。ネットワーク設定（snapshotRate, interpolationMs auto, ping 表示）をユーザーに出す。

Babylon 最適化: `freezeWorldMatrix`, `doNotSyncBoundingInfo`, `material.freeze`, `scene.freezeActiveMeshes`, thin instances。衝突は自前 BVH / ボクセルグリッド。目標ドローコール **100 未満**。

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

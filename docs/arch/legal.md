# 法務・OSS・参考資料

## 法務

- Krunker / bloxd の **アセットは流用しない**
- bloxd 利用規約はリバースエンジニアリングを禁ずる。**ライブサービスへ接続しての解析は行わない**
- 本プロジェクトのライセンスは **MIT**（LICENSE ファイルは別タスクで配置）
- UGC 受け入れ時は投稿ライセンスと権利侵害窓口が必要

## 依存ライセンス

| パッケージ | ライセンス |
|---|---|
| noa-engine | MIT |
| voxel-physics-engine | MIT |
| noa-examples | ISC |
| @babylonjs/core | Apache-2.0 |
| ent-comp | 要確認 |

## 一次情報（実装で不明ならまずここ）

- Noa: https://github.com/fenomas/noa
- voxel-physics-engine: https://github.com/fenomas/voxel-physics-engine
- Babylon シーン最適化 / Thin Instances: https://doc.babylonjs.com/
- Bun WebSocket: https://bun.com/docs/runtime/http/websockets
- Bun v1.3.14 HTTP/3 制約: https://bun.com/blog/bun-v1.3.14
- Colyseus Room / matchmaker: https://docs.colyseus.io/
- Source Multiplayer Networking / Interpolation: https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking
- WebTransport MDN: https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API
- desynchronized canvas: https://developer.chrome.com/blog/desynchronized
- Pointer Lock unadjustedMovement: https://w3c.github.io/pointerlock/
- QuickJS sandbox: https://jsr.io/@sebastianwessel/quickjs
- Krunker settings.txt（デフォルト思想の参考。アセットではない）: https://krunker.io/docs/settings.txt

ソース仕様書 v2 全文は [`.archive/docs/マルチタイプ・ゲームプラットフォーム 設計書.md`](../../.archive/docs/マルチタイプ・ゲームプラットフォーム%20設計書.md)。

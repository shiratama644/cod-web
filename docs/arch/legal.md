# 法務・OSS・参考資料

## 法務

- Krunker / bloxd の **アセットは流用しない**
- bloxd 利用規約はリバースエンジニアリングを禁ずる。**ライブサービスへ接続しての解析は行わない**
- 本プロジェクトのライセンスは **MIT**（ルート [`LICENSE`](../../LICENSE)）
- UGC 受け入れ時は投稿ライセンスと権利侵害窓口が必要

## 依存ライセンス

| パッケージ | ライセンス |
|---|---|
| noa-engine | MIT |
| voxel-physics-engine | MIT |
| noa-examples | ISC |
| @babylonjs/core | Apache-2.0 |
| ent-comp | MIT |

## 一次情報（実装で不明ならまずここ）

詳細な API 確認表は [`api-sources.md`](./api-sources.md)。

- Noa: https://github.com/fenomas/noa / npm metadata: https://registry.npmjs.org/noa-engine/latest / history: https://raw.githubusercontent.com/fenomas/noa/master/docs/history.md
- voxel-physics-engine: https://github.com/fenomas/voxel-physics-engine / npm metadata: https://registry.npmjs.org/voxel-physics-engine/latest
- ent-comp: https://registry.npmjs.org/ent-comp/latest
- Babylon Engine / EngineOptions / Mesh / Material: https://doc.babylonjs.com/typedoc/
- @babylonjs/core npm metadata: https://registry.npmjs.org/@babylonjs/core/latest
- Bun Workspaces: https://bun.com/docs/pm/workspaces
- Bun WebSocket: https://bun.com/docs/runtime/http/websockets
- Bun v1.3.14 HTTP/3 制約: https://bun.com/blog/bun-v1.3.14
- Biome noRestrictedImports: https://biomejs.dev/linter/rules/no-restricted-imports/
- Colyseus Room: https://docs.colyseus.io/room / matchmaker: https://docs.colyseus.io/matchmaker
- Source Multiplayer Networking / Interpolation: https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking
- WebTransport MDN: https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API
- desynchronized canvas: https://developer.chrome.com/blog/desynchronized
- Pointer Lock unadjustedMovement: https://w3c.github.io/pointerlock/
- QuickJS sandbox: https://jsr.io/@sebastianwessel/quickjs
- Krunker settings.txt（デフォルト思想の参考。アセットではない）: https://krunker.io/docs/settings.txt

ソース仕様書 v2 全文は [`.archive/docs/マルチタイプ・ゲームプラットフォーム 設計書.md`](../../.archive/docs/マルチタイプ・ゲームプラットフォーム%20設計書.md)。

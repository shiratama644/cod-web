# 法務・OSS・参考資料

## 法務

- Krunker / bloxd / Minecraft の **アセット・コード・商標表現は流用しない**。地形生成は一般的なノイズ/バイオーム手法を独自実装する
- bloxd 公式 Terms of Service（https://bloxd.io/terms-of-service、2026-09-06 再確認）は reverse engineering / decompile / disassemble / unauthorized access を禁ずる。**ライブサービスへ接続しての解析は行わない**
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
| micro-game-shell | ISC |
| game-inputs | ISC |
| nipplejs | MIT |
| @babylonjs/loaders | Apache-2.0 |

## 一次情報（実装で不明ならまずここ）

詳細な API 確認表は [`api-sources.md`](./api-sources.md)。

- Noa: https://github.com/fenomas/noa / npm metadata: https://registry.npmjs.org/noa-engine/latest / history: https://raw.githubusercontent.com/fenomas/noa/master/docs/history.md
- voxel-physics-engine: https://github.com/fenomas/voxel-physics-engine / npm metadata: https://registry.npmjs.org/voxel-physics-engine/latest
- ent-comp: https://registry.npmjs.org/ent-comp/latest
- micro-game-shell: https://registry.npmjs.org/micro-game-shell/latest
- game-inputs: https://registry.npmjs.org/game-inputs/latest
- nipplejs: https://registry.npmjs.org/nipplejs/latest
- Babylon Engine / EngineOptions / Mesh / Material: https://doc.babylonjs.com/typedoc/
- Babylon glTF / GLB loader: https://doc.babylonjs.com/features/featuresDeepDive/importers/glTF
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
- Krunker NETWORK API（UGC networking の公開 API）: https://docs.krunker.io/api/network
- bloxd Terms of Service（reverse engineering 禁止の公式根拠）: https://bloxd.io/terms-of-service
- bloxd Privacy Policy（運用・moderation 参考）: https://bloxd.io/privacy-policy

ソース仕様書 v2 全文は [`.archive/docs/マルチタイプ・ゲームプラットフォーム 設計書.md`](../../.archive/docs/マルチタイプ・ゲームプラットフォーム%20設計書.md)。

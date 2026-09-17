# PH1-C Channel framing implementation log

## 指示内容

ユーザーから「お願いします。」と指示。直前の完了報告に続き、PH1-C（Channel 頭 1B）を実装した。

## 実行内容

- `git status --short && git branch --show-current && git log -5 --oneline` で開始状態を確認。
- `docs/task-list.md`, `docs/planning/HANDOFF.md`, `docs/planning/PHASE01_PLAN.md`, `docs/arch/protocol.md`, `biome.json` を全体確認。
- `packages/protocol/src/protocol/constants.ts` に `Channel` / `ChannelId` / `CHANNEL_BYTES` / `INPUT_FRAME_BYTES` を追加。
- `packages/protocol/src/protocol/framing.ts` を追加し、Channel 1B の encode/decode 境界を実装。
- `packages/engine-core/src/net/ingest.ts` で Channel を剥がしてから既存 `decodeInput` に渡すよう変更。`Reliable` / `Bulk` / Channel 欠落は `ProtocolError`。
- `packages/engine-core/src/net/snapshot.ts` で ring buffer の先頭 1B に `Channel.Unreliable` を書き、payload は offset 1 の `DataView` に encode する形へ変更。
- `apps/web/src/game/net/transport.ts` / `websocket.ts` を `send(channel, payload)` / `onBinary(channel, payload)` API に変更。
- `apps/web/src/game/net/GameClient.ts` は 17B backing buffer の offset 1 に Input 16B payload を encode し、payload view を `transport.send(Channel.Unreliable, ...)` に渡す形へ変更。
- protocol framing / ingest / snapshot tests を Channel frame 前提へ更新し、既存 fuzz を frame fuzz に更新。

## 気づき

- PH1-C は payload レイアウトを変えないため、`encodeInput` / `decodeInput` / `encodeSnapshot` / `decodeSnapshot` は 16B Input / 現行 Snapshot payload のまま維持できた。
- ブラウザ WebSocket は scatter/gather send がないため、no-copy を保つには呼び出し側が 1B 前に余白を持つ payload view を渡し、transport が直前 1B に Channel を書く形がシンプルだった。
- Snapshot は ring buffer を `CHANNEL_BYTES + SNAPSHOT_MAX_BYTES` にし、offset 1 の DataView へ payload encode することでコピーなしで frame を送れる。

## 次アクション

- 次は PH1-D（Babylon Engine + R3F シーン削除）。`@babylonjs/core` 導入前に installed `.d.ts` を確認し、型にない EngineOptions を渡さない。

---
name: memory-leak
description: LagCompStore、inputQueues、paused Set、Room leave時のメモリリークを防ぐスキル。EM01で確立したremovePlayer/clearパターン。
---

# Memory Leak — Room leave時のリークを防ぐスキル

> 仕様正本: `docs/arch/server.md`（Roomライフサイクル）、`docs/arch/engineering.md`  
> 計画: `docs/planning/EM01_PLAN.md` B1-B3, B14

## 潜在リーク箇所（EM01発見）

| # | 場所 | リーク内容 | 影響 |
|---|---|---|---|
| B1 | `LagCompStore` | `leave` 時に `store.clear(playerId)` しないと `Map<playerId, History>` が残留 | プレイヤー出入りで無限増加 |
| B2 | `Room.inputQueues` | `leave` 時に queue削除しないと `Map<playerId, InputQueue>` 残留 | 同上 |
| B3 | `SnapshotBroadcaster.paused` | backpressureで `paused` Setに追加後、leave時に削除しないと残留 | pausedが増え続けsnapshot送信が止まる |
| B14 | `RateLimiter` | `leave` 時に `remove(playerId)` しないとトークンバケット残留 | 同上 |

## 修正パターン

### Room.leaveで全削除

```ts
class Room {
  leave(peerId: string) {
    this.players.delete(peerId);
    this.peers.delete(peerId);
    this.simulation.removePlayer(peerId); // inputQueues削除
    this.lagCompStore.clear(peerId); // history削除
    this.snapshotBroadcaster.removePlayer(peerId); // paused削除
    this.rateLimiter.remove(peerId);
  }
}
```

### Simulation.removePlayer

```ts
removePlayer(playerId: string) {
  this.inputQueues.delete(playerId);
  // pending inputsもクリア
}
```

### SnapshotBroadcaster.removePlayer

```ts
removePlayer(peerId: string) {
  this.paused.delete(peerId);
  this.lastAckSeq.delete(peerId);
}
```

### LagCompStore.clear

```ts
clear(playerId: string) {
  this.histories.delete(playerId);
}
```

## 回帰テスト

```ts
test('leave clears all stores', () => {
  room.join(peer);
  expect(room.getPlayersIterable()).toHaveLength(1);
  room.leave(peer.id);
  expect(room.getPlayersIterable()).toHaveLength(0);
  expect((room as any).simulation.inputQueues.has(peer.id)).toBe(false);
  expect((room as any).lagCompStore.histories.has(peer.id)).toBe(false);
  expect((room as any).snapshotBroadcaster.paused.has(peer.id)).toBe(false);
});
```

## 監査コマンド

```bash
grep -R "removePlayer\|clear" packages/engine-core/src --include="*.ts" | grep -E "leave|close"
grep -R "paused" packages/engine-core/src --include="*.ts"
```

## 関連

- `docs/arch/server.md` §Room
- `docs/planning/EM01_PLAN.md` B1-B3, B14
- `.agent/logs/2026-09-20_plat-em-em01-bugfix-plan.md`

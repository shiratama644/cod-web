---
name: zero-alloc
description: ホットパスでのゼロアロケーションを守る実装スキル。EM01で確立したgetPlayersIterable、encode once、head indexリング、Map再利用パターン。
---

# Zero-Alloc — ホットパスでGCを出さないスキル

> 仕様正本: `docs/arch/engineering.md`（ゼロアロケ）、`docs/arch/server.md`（RoomはsetIntervalを持たない）  
> 計画: `docs/planning/EM01_PLAN.md` B4,B5,B6,B9-B13

## 原則

- `doTick` 内で `new`、`[]`/`{}` リテラル、`.slice/.map/.filter`、クロージャ生成、ベクトルの都度オブジェクト返却をしない
- 送信は `subarray()`（コピーしない）、現行の毎送信 `buffer.slice()` は置換対象

## 違反パターンと修正（EM01実績）

| # | 場所 | 違反 | 修正 | 効果 |
|---|---|---|---|---|
| B4 | `Room.getPlayers()` | 毎tick `[...players.values()]` 配列確保 | `getPlayersIterable()` 追加、Iterableを返す | `Simulation.step` と `SnapshotBroadcaster` が `for...of` で回す、GC削減 |
| B5 | `SnapshotBroadcaster.maybeSend` | `for(peer)` 内で毎回 `writeSnapshot` encode | ループ外1回 encode + per-peer `lastAckSeq` patch | n回 → 1回 |
| B6 | `Simulation.inputQueues` | `shift()` O(n), `splice(0,excess)` O(n) | `InputQueue {buf,head}` リング、head index | 60Hz x16人でO(n)解消 |
| B9 | `interpolation.ts` | `samples.shift()` O(n) | `sampleHead` index | 補間履歴数十件だがゼロアロケ観点で改善 |
| B10 | `lagcomp-store.ts` | `shift()` で古いサンプル削除 | `HistoryBuffer` リング | 最大30件だが違反解消 |
| B11 | `GameClient.remotes` | 毎フレーム `new Map` | `remotes` Map再利用、`clear()` + `set()`、interpolator out Map再利用 | 60-120HzでMap newは予算超過 |
| B12 | `packer.ts` `writeCompatSnapshot` | `players.map` 毎スナップショット配列確保 | `for` ループで直接書く、map廃止 | Snapshot 30HzでのGC削減 |
| B13 | `prediction.ts` `pending` | `filter` 毎回新配列確保 | in-place削除、head index | 60HzでGC削減 |

## 実装パターン

### getPlayersIterable

```ts
// Room.ts
getPlayersIterable(): Iterable<Player> {
  return this.players.values(); // 配列を作らない
}
getPeersIterable(): Iterable<Peer> {
  return this.peers.values();
}

// 使用側
for (const player of room.getPlayersIterable()) {
  // hot path
}
```

### Snapshot encode once

```ts
// snapshot.ts
const payloadBytes = this.writeSnapshot(world, viewer, writer); // ループ外1回
for (const peer of room.getPeersIterable()) {
  // per-peer patch: lastAckSeqのみ書き換え
  writer.view.setUint32(offset, peer.lastAckSeq, true);
  peer.sendBinary(writer.subarray()); // コピーなし
}
```

### InputQueue head indexリング

```ts
class InputQueue {
  buf: DecodedInput[] = new Array(32);
  head = 0;
  tail = 0;
  len = 0;
  push(input: DecodedInput) {
    if (this.len >= 32) { this.head = (this.head+1)%32; this.len--; } // overflowは破棄
    this.buf[this.tail] = input;
    this.tail = (this.tail+1)%32;
    this.len++;
  }
  shift(): DecodedInput | undefined {
    if (this.len===0) return undefined;
    const v = this.buf[this.head];
    this.head = (this.head+1)%32;
    this.len--;
    return v;
  }
}
```

### GameClient remotes再利用

```ts
// interpolation.ts が out Mapを受け取る形
sample(out: Map<number, Pose>, now: number, renderDelay: number): void {
  out.clear();
  // ... fill
}

// GameClient
private remotes = new Map<number, Pose>();
frame() {
  this.interpolator.sample(this.remotes, now, renderDelay); // new Mapしない
}
```

## 監査コマンド

```bash
grep -R "getPlayers()" packages/engine-core/src --include="*.ts" | grep -v "getPlayersIterable\|getPeersIterable"
grep -R "\.shift()" packages/engine-core/src apps/web/src/game/net --include="*.ts"
grep -R "\.slice(" packages/engine-core/src --include="*.ts" | grep -v "subarray\|test\|spec"
grep -R "new Map\|new Set\|\.map\(" apps/web/src/game/net --include="*.ts" | head
```

- EM01後は hot pathで `getPlayers()` 0件、`shift()` 0件、`slice` は `LagCompStore.getHistory` 互換1件のみ（hot path外）

## 関連

- `docs/arch/engineering.md` §ゼロアロケ
- `docs/arch/server.md` §Room
- `.agent/logs/2026-09-20_plat-em-em01-bugfix-plan.md`
- `.agent/logs/2026-09-20_em1-complete-bugfix.md`

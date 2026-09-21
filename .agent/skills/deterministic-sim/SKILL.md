---
name: deterministic-sim
description: SimProfile.stepの決定論を守り、same-inputテストとheavy determinismを実装するための実践ノウハウ。PH2-Eで確立した軽量smokeとheavy分離パターン。
---

# Deterministic Sim — 決定論を守る実装スキル

> 仕様正本: `docs/arch/engineering.md`（決定論・禁止API）、`docs/arch/sim-profiles.md`、`docs/arch/protocol.md`  
> 計画: `docs/planning/PHASE02_PLAN.md` §10.5、EM01/EM02ログ

## 禁止事項（SimProfile.step内）

- `Math.random` / `Date.now` / `performance.now` / `setTimeout` / `setInterval` / I/O / `fetch` / `console.log` を書かない
- `Room` から `@cod/profile-*` import しない、L1に `if (type==='fps'|'voxel')` を書かない

## 実装パターン

### 1. LCGで決定論的乱数が必要な場合

```ts
function createLCG(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
```

- `RoomCtx.random` / `randomInt` は welcomeで配布されたseedから作る。直接 `Math.random` を呼ばない。

### 2. 軽量smoke vs heavy分離（PH2-Eで確立）

| 層 | 配置 | 内容 | 時間 |
|---|---|---|---|
| smoke | `_tests_/.../determinism.test.ts` unit | 100ticks x10 scenarios、purity、factory isolation | 20-50ms |
| heavy | `scripts/determinism-heavy.ts` | 1000ticks x100 scenarios、tolerance 1e-10、LCG | 0.8-0.9s |

- smokeは常時 `test:unit` で実行、heavyは `bun run scripts/determinism-heavy.ts` でCI/手動実行
- `createPlaneWorld`（静的平面のみ）を使えば heavyでも軽い。`three-mesh-bvh` を含む server worldだと重くなるため、PH2-Eでは plane worldで十分

### 3. Same-inputテスト（server vs client）

- `Room` は `addPlayer` ではなく `join(Peer)` API。mock Peerを作成して `join` し、`getPlayer` でPlayerStateを取得
- `Simulation.receiveInput` は seq巻き戻りガードあり、FIFOキューで入力消費。playerIdはmock Roomから取得
- 検証: 120ticks exact `toBeCloseTo(2)` + 100ticks per-tick error <0.35m（fps許容）

```ts
// @vitest-environment node
const room = new Room({ profile: createFpsSimProfile({ createWorld: createPlaneWorld }) });
const peer = { id: 'test', send: vi.fn() } as unknown as Peer;
room.join(peer);
const player = room.getPlayer(peer.id);
```

### 4. 監査コマンド

```bash
bun run check:determinism          # scripts/check-determinism.ts 禁止パターン検出
bun run scripts/determinism-heavy.ts  # 1000x100 0.8s pass確認
grep -R "Math.random\|Date.now\|performance.now" packages/engine-core/src packages/profile-fps/src --include="*.ts"
```

## よくある失敗

- `Room.players` Mapはprivate、直接触らず `getPlayer` / `getPlayersIterable` / `join` / `leave` 経由
- `Simulation` の `inputQueues` はprivate、`receiveInput` 経由でしか入れない
- `createPlaneWorld` vs `buildServerWorld`: heavyはplaneで、server worldは別途テスト

## 関連

- `docs/arch/engineering.md` §決定論
- `docs/planning/EM01_PLAN.md` B1-B15
- `.agent/logs/2026-09-20_ph2-e-same-input-determinism.md`

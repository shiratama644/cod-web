---
name: physics-collision
description: three-mesh-bvhとvoxel-physics-engineを使った衝突判定、kinematic controller、SimProfileへの分離パターン。
---

# Physics Collision — BVHとKinematic Controllerスキル

> 仕様正本: `docs/arch/sim-profiles.md`（fps衝突）、`docs/arch/engineering.md`（決定論）  
> ログ: `.agent/logs/2026-09-03_bvh-kinematic-controller-and-xstate.md`, `2026-09-06_doc-4-official-api-doc-audit.md`

## three-mesh-bvh

- `@cod/profile-fps` のserver/client共通衝突判定は `three` / `three-mesh-bvh` を使い続ける（描画ではなく衝突用、R3F削除対象外）
- `noa-engine@0.33.0` は `@babylonjs/core ^6.1.0` peer、`fps` 側のBabylon 9系とはmajor確認タイミングを分ける
- `ent-comp` はnpm metadata上MIT、旧 `legal.md` の要確認は更新済み

```ts
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import * as THREE from 'three';

THREE.Mesh.prototype.raycast = acceleratedRaycast;

const geometry = new THREE.BoxGeometry(1,1,1);
geometry.boundsTree = new MeshBVH(geometry);
```

## Kinematic Controllerパターン

- `stepPlayer` は `typeSpec.simHz` 由来の `stepSeconds` で動く
- 水平移動 → 重力 → 衝突解決 → 接地判定の順
- 決定論を守るため、毎tick同じ順序、同じquantized input

```ts
function stepPlayer(world: World, player: PlayerState, input: DecodedInput, dt: number) {
  // 1. input -> velocity
  player.vx = input.moveX * SPEED;
  player.vz = input.moveZ * SPEED;
  // 2. yaw適用
  // 3. 重力
  player.vy -= GRAVITY * dt;
  // 4. 衝突解決 (BVH raycast)
  const newPos = resolveCollision(world, player, dt);
  // 5. 接地
  player.onGround = checkGround(world, newPos);
  return newPos;
}
```

## SimProfileへの分離（PH2-B）

- `createFpsSimProfile({ createWorld })` のseamを用意するとPH2-C以降のinjection testsで重いBVH worldを差し替えやすい
- Snapshot writerは `encodeSnapshot` と同じfield order / quantizerを使って直接書くと中間Snapshot配列を増やさず現行wire layout固定
- PH2-Bはprofile factory追加までに留め、gameserver / GameClientへの接続を混ぜない方が差分を小さく保てる

## voxel-physics-engine

- `voxel-physics-engine@0.13.0` はMIT、 `tick(dt_in_miliseconds)` と確認できるがPhase2ではdependency追加しない
- `TYPE_SPECS.voxel` はcontract-onlyとして追加、voxel package / dependencyを追加しなくてもL1/L2境界設計を先に固定できる

## 関連

- `packages/profile-fps/src/world.ts`
- `packages/profile-fps/src/simProfile.ts`
- `docs/arch/sim-profiles.md`
- `.agent/logs/2026-09-03_bvh-kinematic-controller-and-xstate.md`

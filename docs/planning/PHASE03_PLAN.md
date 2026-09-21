# Phase 3: ゲームモード API 第1版 + fps-ffa 最小

> 対応 task-list ID: `PLAT-3`, `PH3-A`〜`PH3-D` (docs/task-list.md)  
> 計画書テンプレート: docs/planning/_TEMPLATE.md 準拠  
> 範囲決定: 2026-09-22、人間確認済み PLAT-EM/EM02完了後、Phase 3は **gamemode API第1版 + fps-ffa最小** を採用。voxel本実装・AOI・delta snapshot・matchmaker・UGC・WTは含めない。

## 1. 開始前確認

- 現在のブランチ / HEAD / `git status` を確認する（未コミット変更があれば停止）
- `docs/task-list.md` で EM02 がローカル検証済み/完了であることを確認する
- 関連仕様を読む
  - `AGENTS.md` §6（L1にtype分岐を書かない、決定論、ゼロアロケーション、Sandbox制約、Biome境界）
  - `.agent/skills/index.md` から `project-overview` / `tech-stack` / `import-boundaries` / `deterministic-sim` / `zero-alloc` / `networking`
  - `docs/arch/architecture.md`（L0-L3依存方向、gamemodes/* → gamemode-sdkのみ）
  - `docs/arch/types.md`（TypeSpec / SimProfile / GameModeDefinition / RoomCtx）
  - `docs/arch/server.md`（Room / TickScheduler / 入力キュー / レート制限）
  - `docs/arch/protocol.md`（Input 16B、Channel、レート制限）
  - `docs/arch/milestones.md`（Phase 3 DoD: レート制限テスト全項目、モード例外でルームが落ちない）
  - `docs/arch/adr.md`（権威サーバー、WSのみ、ReactはHUDのみ）
  - `docs/planning/HANDOFF.md`（EM02完了・Phase 3準備、D1-D14）
  - `docs/ops/quality-gates.md`（4+3検証 + coverage 85%）
- 本計画書の §5（完了条件）と §7（停止条件）を再読する
- Phase 3 実装へ入る前に、`PLAT-3` の計画 commit が push 済みであることを確認する

## 2. 目的 (Why)

Phase 3 の目的は、**ゲームモードを L3 として分離し、L1 `engine-core` + L1 `gamemode-api` の上で `fps-ffa` 最小モードを動かすこと**。

現状（PH2-E + EM02）は:

- `engine-core` は L1 で type非依存、 `SimProfile` contract + `TYPE_SPECS` + `FpsSimProfile` 注入で fps が動く
- `Room` / `Simulation` / `SnapshotBroadcaster` は profile注入で動くが、ゲームルール（スポーン、スコア、ラウンド、キル判定）はまだ `profile-fps` や `Room` にハードコードされている
- `gamemode-api` package が無い、 `gamemodes/*` ディレクトリが無い

Phase 3 完了時点では:

- `packages/gamemode-api` が L1 として存在し、 `defineGameMode` / `GameModeDefinition` / `RoomCtx` / `BaseCtx` / `FpsCtx` / `VoxelCtx` / `PlayerRef` / `RoomState` を提供する
- `GameModeRuntime` が L1 `engine-core` に存在し、gamemode hooks を例外安全に実行し、レート制限、tickタイマー（after/every/cancel）、 `broadcast`/`send` を提供する
- `gamemodes/fps/official/ffa` が L3 として存在し、最小 FFA（スポーン、キル、スコア、ラウンド waiting→playing→ended）を実装する
- `apps/gameserver` が `GameModeRuntime` を使って fps-ffa をロードし、既存の snapshot / input 経路を維持したままモード例外でルームが落ちないことをテストで保証する
- `profile-voxel` / voxel terrain / AOI / delta snapshot / matchmaker / UGC / WT は含めない

## 3. 変更範囲 (Scope)

変更対象:

- `packages/gamemode-api/` 新規
  - `@cod/gamemode-api` package.json、 `workspace:*` 依存は `protocol` のみ
  - `src/defineGameMode.ts` : `id` / `type` / `source` / `slug` 検証（`id` `/^[a-z][a-z0-9-]{2,31}$/`、 `type` `fps|voxel`、 `source` `official|ugc`、 `slug` URL用）
  - `src/types.ts` : `GameModeDefinition` / `ContentSource` / `RoomState` / `PlayerRef` / `BaseCtx` / `FpsCtx` / `VoxelCtx` / `RoomCtx` / hook signatures
  - `src/ctx.ts` : `BaseCtx` 実装の最小面（random/randomInt seed welcome配布、player操作、inventory、score、HUD、send/broadcastレート制限、after/every/cancel tick基準、getState/setState）
  - `src/index.ts` barrel export
  - `package.json` exports `./` と `./define`
- `packages/engine-core/src/gamemode/` 新規
  - `GameModeRuntime.ts` : gamemode hooks を例外安全に実行（try/catchで1ルームのみcatch、他ルーム巻き込まない）、 `onRoomCreate/Destroy` / `onRoundStart/End` / `onPlayerJoin/Leave/Spawn/Death/Damage` / `onTick` / `onNetworkMessage` / fps用 `onWeaponFire/onHit` / voxel用 `onBlockPlace/onBlockBreak` の dispatcher
  - `TickScheduler.ts` 拡張 or `GameModeTimer.ts` : after/every/cancel を tick基準で実装（setTimeout禁止）、 `Map<timerId, {dueTick, interval, cb}>` + head indexリング（EM01知見）
  - `RateLimiter.ts` 拡張: gamemode message rate limit 40/s burst 20 を追加（protocol.md既存 rate limit表）
  - `Room.ts` 拡張: `GameModeRuntime` を保持、 `doTick` 内で `onTick` / `drainEvents` 後に gamemode tick timer消化、例外は1ルームのみcatch
- `gamemodes/fps/official/ffa/` 新規
  - `index.ts` : `defineGameMode({ id: 'fps-official-ffa', type: 'fps', source: 'official', slug: 'ffa', minPlayers: 2, maxPlayers: 16, world: { map: 'static-arena', spawnPoints: [...] } })` + hooks実装
  - `ffa.ts` or hooks分割: `onRoomCreate` で world spec 適用、 `onPlayerSpawn` で spawn point 選択、 `onPlayerDeath` で score 加算、 `onTick` で round状態遷移、 `onNetworkMessage` は最小（chatのみ）
  - 現行 `profile-fps` の static arena を再利用、 `three-mesh-bvh` 衝突は profile側で維持
- `apps/gameserver/src/runtime.ts` 拡張
  - `createDefaultServerRuntime()` が `createFpsSimProfile()` + `fps-official-ffa` gamemode を組み立てて `Room` へ注入
  - `RoomManager` が `GameModeRuntime` を生成、例外安全
- `packages/protocol/src/` 拡張
  - gamemode message type が必要なら `protocol.ts` に `MSG_C2S_GAMEMODE = 0x10` 仮定義（Phase 3最小、制御JSON、レート制限40/s）
- `_tests_/` 新規/拡張
  - `gamemode-api` define validation tests
  - `engine-core/gamemode` Runtime exception safety / after/every/cancel tick基準 / rate limit / broadcast false tests
  - `gamemodes/fps-official-ffa` spawn/score/round lifecycle tests
  - `gameserver` integration: mode exceptionでroomが落ちないテスト
- `docs/` / `biome.json` / `docs/task-list.md` / `docs/planning/HANDOFF.md` / `.agent/skills/` / `.agent/logs/`
  - `biome.json` に `gamemodes/* → gamemode-apiのみ` 制限追加（architecture.md理想）
  - `docs/arch/types.md` と本計画の整合確認（既存 types.mdは仕様正本、本実装はそれを踏まえる）
  - task-list に PLAT-3 / PH3-A〜D 追加
  - HANDOFF 更新

変更しない（境界外）:

- `packages/profile-voxel` の作成、voxel terrain / chunk / block action / block delta 本実装
- `voxel-physics-engine` / `noa-engine` dependency 追加（Phase 4以降）
- AOI、delta snapshot、Snapshot `0x11` 新ヘッダ化、1200B分割本実装
- FireAction / HitConfirm / 巻き戻しヒットスキャン本実装（fps-ffa最小ではkill判定は簡易、巻き戻しは将来）
- matchmaker / seat reservation / Hello HMAC / Redis / HTTP API
- UGC / QuickJS / glTF pipeline / editor 本実装
- WebTransport
- Playwright browser実行をSandboxでpassと主張
- `profile-fps` の大幅改修（現行衝突・worldは維持、gamemodeはその上でルールだけ追加）

## 4. 禁止事項

- 不明点は推測で埋めず、§7 の停止条件に従って質問する
- `docs/arch/adr.md` に反する実装をしない（権威サーバー、WSのみ、ReactはHUDのみ）
- L1 `engine-core` に `if (type === 'fps' | 'voxel')` / `switch(gameType)` / `@cod/profile-fps` / `@cod/profile-voxel` / `@cod/gamemode-api` 以外のL2/L3 import を入れない（gamemode-apiはL1なのでOK、profile-*は禁止維持）
- L1 `gamemode-api` に `profile-fps` / `profile-voxel` / `three` / `three-mesh-bvh` を入れない（L1はtype非依存、pure types + ctx contractのみ）
- `gamemodes/*` から `gamemode-api` 以外を import しない（Biomeで強制、architecture.md理想）
- Game Type と Content Source を混同しない（`official`/`ugc` はtypeではない、editor.md）
- `profile-voxel` / voxel terrain / AOI / delta snapshot を「ついで」に作らない
- existing fps behavior を壊してからまとめて直す進め方をしない。各subtaskは小さく、検証してcommitする
- `SimProfile.step` / `GameModeRuntime` 配下に `Math.random` / `Date.now` / `performance.now` / `setTimeout` / I/O / `fetch` を入れない（決定論、tick基準タイマー）
- hot path で `new` / `.slice()` / `[]` / `{}` / `.map` / クロージャ生成を増やさない（zero-alloc/SKILL.md）
- `bun test` を使わない。Vitestは `bun run test:unit` / `bun run test:coverage`
- `ws.send()` の戻り値分岐を無視しない（-1 backpressure / 0 drop / 1+ bytes、networking/SKILL.md）
- Snapshot `0x11` 化や wire format改定をPhase 3で混ぜない（Phase 2同様現行layout維持）

## 5. 完了条件 (DoD)

### PLAT-3（本計画）の DoD

- [ ] `docs/planning/PHASE03_PLAN.md` が `_TEMPLATE.md` 準拠で作成される
- [ ] `docs/task-list.md` に `PLAT-3` と `PH3-A`〜`PH3-D` が追加され、Phase 3が「gamemode API第1版 + fps-ffa最小」であることが明記される
- [ ] `fps先行＋voxelは契約だけ` 方針が継続し、voxel本実装を含まないことが計画書・handoff・task-listに明記される
- [ ] 既存 arch（types.md / architecture.md / milestones.md / server.md / protocol.md）と矛盾しない
- [ ] docs-onlyの整合確認（リンクチェック / `git diff --check`）がpassする
- [ ] commit / push 済み

### Phase 3 全体の DoD

- [ ] `packages/gamemode-api` が存在し、`@cod/gamemode-api` として `@cod/protocol` のみに依存し、L1 type非依存である
- [ ] `defineGameMode` が `id` / `type` / `source` / `slug` / `minPlayers`/`maxPlayers` を検証し、不正でthrowする（`/^[a-z][a-z0-9-]{2,31}$/`、type fps|voxel、source official|ugc）
- [ ] `GameModeDefinition` が `onRoomCreate/Destroy` / `onRoundStart/End` / `onPlayerJoin/Leave/Spawn/Death/Damage` / `onTick` / `onNetworkMessage` + fps用 `onWeaponFire/onHit` + voxel用 `onBlockPlace/onBlockBreak` をoptional hookとして持つ
- [ ] `RoomCtx` / `BaseCtx` / `FpsCtx` / `VoxelCtx` が `random`/`randomInt`（seed welcome配布）、player操作、inventory、score、HUD、`send`/`broadcast`（レート制限、超過時false）、`after`/`every`/`cancel`（tick基準、setTimeout禁止）を仕様通りに提供する
- [ ] `GameModeRuntime` が L1 `engine-core` に存在し、gamemode hooksを例外安全に実行する（1ルーム例外で他ルーム巻き込まない、mode例外でルームが落ちないテストがある）
- [ ] Tick timer `after`/`every`/`cancel` が tick基準で動作し、`setTimeout` を使わないテストがある（`Map<timerId, {dueTick, interval}>` + head indexリング）
- [ ] Rate limit: gamemode message 40/s burst 20、超過時false、Input 90/s超過で切断は維持（protocol.md表）
- [ ] `gamemodes/fps/official/ffa` が存在し、`fps-official-ffa` idで `defineGameMode` をexportし、最小FFA（waiting→playing→ended、spawn point選択、kill→score、death→respawn）が動く
- [ ] `apps/gameserver` が `createFpsSimProfile()` + `fps-official-ffa` を組み立てて `Room` へ注入し、既存 snapshot 16B + Channel 17B経路を維持する
- [ ] `biome.json` に `gamemodes/* → gamemode-apiのみ` 制限が追加され、違反でlintが落ちる
- [ ] 既存 quality gateが維持される: `typecheck` / `lint` 0 warnings / `test:unit` 30 files 189 tests以上 / `test:coverage` 85/85/85/85以上 / `build` / `test:e2e -- --list` 11以上 / `check:determinism` / `check:determinism:heavy` 0.8s pass
- [ ] `engine-core` から `@cod/profile-fps` / `@cod/profile-voxel` へのimportがBiomeで引き続き禁止される（0 violations）
- [ ] `profile-voxel` / voxel dependency は追加されていない
- [ ] `docs/arch/types.md` と本実装の `GameModeDefinition` / `RoomCtx` が整合する（仕様正本との差分は計画書に明記）
- [ ] `docs/task-list.md` / `docs/planning/HANDOFF.md` / `docs/ops/quality-gates.md` が更新される

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit (vitest) | `bun run test:unit` | 既存189 tests維持 + gamemode-api define validation / ctx / runtime exception safety / after/every/cancel tick / rate limit / ffa spawn/score/round / gameserver integration |
| Coverage | `bun run test:coverage` | thresholds 85/85/85/85を下回らない。gamemode-api / runtime / ffa の重要branchをassertion。include-all方針維持（難しいfileをexcludeして数字を作らない） |
| Typecheck | `bun run typecheck` | client/server TS strict + workspace exports（@cod/gamemode-api含む）が通る |
| Lint | `bunx biome lint .` | engine-core→profile-*禁止、gamemodes/*→gamemode-apiのみ、WebSocket global禁止、noConsole for babylon/net、Biome warnings 0 |
| Build | `bun run build` | packages（gamemode-api含む）とappsがproduction build / typecheckできる。Vite chunk-size warningは既知扱い |
| E2E discovery | `bun run test:e2e -- --list` | 11 tests以上 discovery。browser実行はSandboxでは行わない |
| Determinism | `bun run check:determinism` + `bun run scripts/determinism-heavy.ts` | SimProfile.step + GameModeRuntimeに禁止API混入なし、heavy 1000x100 0.8s pass |
| Same-input | `_tests_/.../same-input.test.ts` | server Simulation vs ClientPrediction same quantized input維持 |
| 構造監査 | `grep -R "profile-fps\|profile-voxel" packages/engine-core --include="*.ts"` 0件 / `grep -R "from '@cod/profile" packages/gamemode-api --include="*.ts"` 0件 / `grep -R "from.*gamemode" gamemodes --include="*.ts" \| grep -v "gamemode-api"` 0件 |
| 実環境 | CIまたは実機で `bun run test:e2e` | Browser E2Eは実環境検証待ちとして扱う。mode例外でroomが落ちないことをCIで確認 |

## 7. 停止条件

次の場合は作業を停止し、変更せず報告する:

- 仕様書（計画書・arch・AGENTS.md・skills）同士に矛盾がある（特に `types.md` の GameModeDefinition / RoomCtx と本計画のAPI設計が衝突）
- `fps先行＋voxelは契約だけ` の範囲を超え、`profile-voxel` / voxel terrain / chunk / block delta本実装が必要になる
- L1 `engine-core` / `gamemode-api` に type分岐 `if (type === 'fps' | 'voxel')` を書かないと進められない設計になった
- `gamemode-api` が `profile-fps` / `three` / `three-mesh-bvh` に依存しないと進められない設計になった（L1純度違反）
- Snapshot `0x11` 新ヘッダ化、AOI、delta snapshot、1200B分割、巻き戻しヒットスキャン本実装が必要になる
- matchmaker / seat reservation / Hello HMAC / Redis / HTTP API が必要になる（Phase 4以降）
- UGC / QuickJS / glTF pipeline / editor本実装が必要になる（Phase 8）
- WebTransportが必要になる（Phase 9、3条件未達）
- 既存 coverage threshold 85%を下げないと進められない（数字稼ぎではなく重要経路assertion追加で対応）
- `defineGameMode` の id検証 `/^[a-z][a-z0-9-]{2,31}$/` や `official`/`ugc` hierarchy が `editor.md` と衝突し、公開API判断が必要になる
- Sandbox制約により検証不能な項目を完了扱いにしそうになった
- 開始時点で作業ツリーに未確認の変更がある

## 8. 完了時に行うこと

1. 差分を自己レビューする（`git diff`で意図しない変更がないか）
2. 実装タスクでは 4+3検証を実行する
   - `bun run typecheck`
   - `bunx biome lint .`
   - `bun run test:unit`
   - `bun run test:coverage`
   - `bun run build`
   - `bun run test:e2e -- --list`
   - `bun run check:determinism`
   - `bun run scripts/determinism-heavy.ts`
3. docs-onlyの `PLAT-3` ではリンク整合と `git diff --check` を実行する
4. `docs/task-list.md` の状態・進捗・証拠を更新する（PLAT-3 / PH3-A〜D）
5. `docs/planning/HANDOFF.md` を更新する（Phase 3完了、次はPhase 4計画）
6. `.agent/logs/YYYY-MM-DD_<summary>.md` を追加する（4セクション）
7. 必要な知見を `.agent/skills/` に同期する（gamemode-api / runtime / ffa）
8. タスクIDを含むConventional Commitでcommitする
9. `git push origin <session-branch>` でセッション固定ブランチへpushする
10. 完了報告では、Playwright browser実行はSandbox未実行であることを明記し、mode例外でroomが落ちない証拠（test）を提示する

## 9. サブタスク分割

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| `PLAT-3` | Phase 3計画作成（gamemode API第1版 + fps-ffa最小） | `docs/planning/PHASE03_PLAN.md`、task-listにPLAT-3/PH3-A〜D追加、fps先行＋voxel契約のみ継続明記 | `EM2-E` |
| `PH3-A` | `gamemode-api` package作成（L1 contract） | `packages/gamemode-api/` package.json + src/defineGameMode.ts + types.ts + ctx.ts + barrel、define validation tests、type non-dependent audit | `PLAT-3` |
| `PH3-B` | `GameModeRuntime` + Tick timer + RateLimiter | `packages/engine-core/src/gamemode/GameModeRuntime.ts` + `GameModeTimer.ts` + RateLimiter拡張、Room統合、exception safety tests、after/every/cancel tick tests、rate limit tests | `PH3-A` |
| `PH3-C` | `fps-ffa` 最小モード | `gamemodes/fps/official/ffa/index.ts` + ffa.ts、defineGameMode export、spawn/score/round lifecycle、static arena再利用、ffa unit tests | `PH3-B` |
| `PH3-D` | 統合 + docs + import境界 + quality gate | `apps/gameserver/src/runtime.ts` で profile + gamemode注入、biome.json gamemodes/*→gamemode-apiのみ、task-list/HANDOFF/quality-gates更新、coverage 85%維持、E2E discovery 11+維持、最終検証 | `PH3-C` |

## 10. 設計詳細・仕様

### 10.1 `gamemode-api` L1 contract

`gamemode-api` は L1 なので、type非依存、pure types + ctx contractのみ。`protocol` のみに依存。

```ts
// packages/gamemode-api/src/types.ts
export type GameType = 'fps' | 'voxel';
export type ContentSource = 'official' | 'ugc';
export type RoomState = 'waiting' | 'countdown' | 'playing' | 'ended';

export interface PlayerRef {
  readonly id: string; // peer id
  readonly playerId: number; // numeric id for snapshot
  readonly name: string;
  readonly team?: number;
}

export interface BaseCtx {
  readonly roomId: string;
  readonly tick: number;
  readonly state: RoomState;
  readonly players: readonly PlayerRef[];
  // random: seedはwelcomeで配布、決定論
  random(): number;
  randomInt(min: number, max: number): number;
  // player操作
  getPlayer(id: string): PlayerRef | undefined;
  getPlayers(): readonly PlayerRef[];
  // score/HUD
  setScore(playerId: string, score: number): void;
  getScore(playerId: string): number;
  setTeamScore(team: number, score: number): void;
  broadcastHud(data: unknown): void;
  // send/broadcast: レート制限、超過時false
  send(playerId: string, data: Uint8Array | string): boolean;
  broadcast(data: Uint8Array | string, exceptId?: string): void;
  broadcastExcept(data: Uint8Array | string, exceptId: string): void;
  // tick timer: tick基準、setTimeout禁止
  after(ticks: number, cb: () => void): number;
  every(ticks: number, cb: () => void): number;
  cancel(timerId: number): void;
  // state
  setState(state: RoomState): void;
  getState(): RoomState;
}

export interface FpsCtx extends BaseCtx {
  giveWeapon(playerId: string, weaponId: string): void;
  setAmmo(playerId: string, ammo: number): void;
  getSpawnPoints(): readonly { x: number; y: number; z: number; yaw: number }[];
  getZone(name: string): { x: number; y: number; z: number; radius: number } | undefined;
  raycastWorld(from: Vec3, dir: Vec3, maxDist: number): RaycastHit | undefined;
  raycastPlayers(from: Vec3, dir: Vec3, maxDist: number, exceptId?: string): RaycastHit | undefined;
}

export interface VoxelCtx extends BaseCtx {
  getBlock(x: number, y: number, z: number): number;
  setBlock(x: number, y: number, z: number, blockId: number): void;
  fillBox(min: Vec3, max: Vec3, blockId: number): void;
  getRegion(min: Vec3, max: Vec3): Uint8Array; // max 32768
  pasteSchematic(pos: Vec3, data: Uint8Array): void;
  raycastBlock(from: Vec3, dir: Vec3, maxDist: number): RaycastHit | undefined;
  setBlockProperty(x: number, y: number, z: number, key: string, value: unknown): void;
}

export type RoomCtx = FpsCtx | VoxelCtx;

export interface GameModeDefinition<T extends GameType = GameType> {
  readonly id: string; // /^[a-z][a-z0-9-]{2,31}$/ 例: fps-official-ffa
  readonly type: T;
  readonly source: ContentSource;
  readonly slug: string; // URL用 例: ffa
  readonly minPlayers: number; // 1..64
  readonly maxPlayers: number; // 1..64
  readonly world: T extends 'fps' ? FpsWorldSpec : VoxelWorldSpec;
  // hooks: all optional, exception safe
  onRoomCreate?(ctx: RoomCtx): void | Promise<void>;
  onRoomDestroy?(ctx: RoomCtx): void | Promise<void>;
  onRoundStart?(ctx: RoomCtx): void | Promise<void>;
  onRoundEnd?(ctx: RoomCtx): void | Promise<void>;
  onPlayerJoin?(ctx: RoomCtx, player: PlayerRef): void | Promise<void>;
  onPlayerLeave?(ctx: RoomCtx, player: PlayerRef): void | Promise<void>;
  onPlayerSpawn?(ctx: RoomCtx, player: PlayerRef): void | Promise<void>;
  onPlayerDeath?(ctx: RoomCtx, player: PlayerRef, killer?: PlayerRef): void | Promise<void>;
  onPlayerDamage?(ctx: RoomCtx, player: PlayerRef, damage: number, attacker?: PlayerRef): void | Promise<void>;
  onTick?(ctx: RoomCtx, dtMs: number): void | Promise<void>;
  onNetworkMessage?(ctx: RoomCtx, player: PlayerRef, msg: Uint8Array | string): void | Promise<void>;
  // fps only
  onWeaponFire?(ctx: FpsCtx, player: PlayerRef, weaponId: string): void | Promise<void>;
  onHit?(ctx: FpsCtx, attacker: PlayerRef, victim: PlayerRef, damage: number): void | Promise<void>;
  // voxel only
  onBlockPlace?(ctx: VoxelCtx, player: PlayerRef, pos: Vec3, blockId: number): void | Promise<void>;
  onBlockBreak?(ctx: VoxelCtx, player: PlayerRef, pos: Vec3, blockId: number): void | Promise<void>;
}

export function defineGameMode<T extends GameType>(def: GameModeDefinition<T>): GameModeDefinition<T>;
```

`defineGameMode` は `id` / `type` / `source` / `slug` / `minPlayers`/`maxPlayers` を検証してそのまま返す。階層ルールは `editor.md`（`/fps|voxel/{official|ugc}/<slug>`）。

### 10.2 `GameModeRuntime`

```ts
// packages/engine-core/src/gamemode/GameModeRuntime.ts
export class GameModeRuntime {
  constructor(
    private def: GameModeDefinition,
    private ctx: RoomCtx,
    private timer: GameModeTimer,
    private rateLimiter: RateLimiter,
  ) {}

  // 例外安全: 各hookをtry/catch、1ルームのみcatch、他ルーム巻き込まない
  async safeCall<K extends keyof GameModeDefinition>(hook: K, ...args: any[]): Promise<void> {
    try {
      const fn = this.def[hook] as any;
      if (fn) await fn(this.ctx, ...args);
    } catch (e) {
      // log but don't crash room
      console.warn(`[gamemode] ${String(hook)} error`, e);
    }
  }

  tick(dtMs: number, tick: number): void {
    this.timer.tick(tick);
    this.safeCall('onTick', dtMs);
  }

  // rate limit: gamemode message 40/s burst 20
  sendGameModeMessage(playerId: string, data: Uint8Array | string): boolean {
    if (!this.rateLimiter.consume(playerId, 'modeMessage')) return false;
    return this.ctx.send(playerId, data);
  }
}
```

Tick timer:

```ts
export class GameModeTimer {
  private timers = new Map<number, { dueTick: number; interval?: number; cb: () => void }>();
  private nextId = 1;
  private head = 0; // EM01 head indexリング知見

  after(ticks: number, cb: () => void, nowTick: number): number {
    const id = this.nextId++;
    this.timers.set(id, { dueTick: nowTick + ticks, cb });
    return id;
  }

  every(ticks: number, cb: () => void, nowTick: number): number {
    const id = this.nextId++;
    this.timers.set(id, { dueTick: nowTick + ticks, interval: ticks, cb });
    return id;
  }

  cancel(id: number): void {
    this.timers.delete(id);
  }

  tick(nowTick: number): void {
    for (const [id, t] of this.timers) {
      if (nowTick >= t.dueTick) {
        try { t.cb(); } catch {}
        if (t.interval) {
          t.dueTick = nowTick + t.interval;
        } else {
          this.timers.delete(id);
        }
      }
    }
  }
}
```

### 10.3 `fps-ffa` 最小モード

```ts
// gamemodes/fps/official/ffa/index.ts
import { defineGameMode } from '@cod/gamemode-api';

export default defineGameMode({
  id: 'fps-official-ffa',
  type: 'fps',
  source: 'official',
  slug: 'ffa',
  minPlayers: 2,
  maxPlayers: 16,
  world: {
    map: 'static-arena',
    spawnPoints: [
      { x: 0, y: 2, z: 0, yaw: 0 },
      { x: 10, y: 2, z: 10, yaw: 90 },
      // ...
    ],
  },

  onRoomCreate(ctx) {
    ctx.setState('waiting');
  },

  onPlayerJoin(ctx, player) {
    ctx.broadcastHud({ type: 'playerJoin', id: player.id });
    if (ctx.players.length >= 2 && ctx.state === 'waiting') {
      ctx.setState('countdown');
      ctx.after(60 * 3, () => { // 3秒後
        ctx.setState('playing');
        ctx.broadcastHud({ type: 'roundStart' });
      });
    }
  },

  onPlayerLeave(ctx, player) {
    if (ctx.players.length < 2 && ctx.state === 'playing') {
      ctx.setState('ended');
    }
  },

  onPlayerSpawn(ctx, player) {
    const spawns = ctx.getSpawnPoints();
    const idx = Math.floor(ctx.random() * spawns.length);
    // spawn logic via ctx
  },

  onPlayerDeath(ctx, player, killer) {
    if (killer) {
      ctx.setScore(killer.id, ctx.getScore(killer.id) + 1);
    }
    ctx.after(60 * 3, () => {
      // respawn after 3s
      ctx.getPlayer(player.id) && ctx.safeCall('onPlayerSpawn', player);
    });
  },

  onTick(ctx, dtMs) {
    // round lifecycle, score check
  },

  onNetworkMessage(ctx, player, msg) {
    // chat only for minimal
  },
});
```

- 現行 `profile-fps` の static arena を再利用
- `three-mesh-bvh` 衝突は profile側で維持、gamemodeはルールのみ
- kill判定は簡易、巻き戻しヒットスキャンは将来（PH3-Cでは含めない）

### 10.4 統合

`apps/gameserver/src/runtime.ts`:

```ts
import { createFpsSimProfile } from '@cod/profile-fps';
import { GameModeRuntime, GameModeTimer } from '@cod/engine-core/gamemode';
import ffaMode from '../../../gamemodes/fps/official/ffa';

export function createDefaultServerRuntime() {
  const profile = createFpsSimProfile();
  const timer = new GameModeTimer();
  const runtime = new GameModeRuntime(ffaMode, ctx, timer, rateLimiter);
  // Room / Simulation / SnapshotBroadcaster へ profile + runtime 注入
}
```

- `RoomManager` が `GameModeRuntime` を生成、例外は1ルームのみcatch
- Snapshot 16B + Channel 17B経路維持
- `biome.json` に `gamemodes/* → gamemode-apiのみ` 制限追加

### 10.5 `TYPE_SPECS` との関係

- `TYPE_SPECS.fps` sim 60 / input 60 / snapshot 30 を維持
- gamemode の `after`/`every` は tick基準、 `TYPE_SPECS` の simHzから dtMs換算
- voxel specは契約のみ維持

## 11. リスク・Gotchas

| リスク | 対応 |
|---|---|
| `types.md` の GameModeDefinition / RoomCtx と本計画のAPI設計が衝突 | `types.md` は仕様正本なので、本計画はそれを踏まえつつ最小面から始める。差分があれば計画書§10に明記し、arch更新が必要なら停止して質問 |
| L1 `gamemode-api` が `profile-fps` に依存しそう | L1純度を守る、gamemode-apiはprotocolのみ依存、three/bvhはgamemodes/fpsで直接importせずctx経由（raycastWorld等） |
| `gamemodes/*` から `gamemode-api` 以外をimportしそう | Biomeで強制、違反でlint落ちる。`gamemodes/fps/official/ffa` はctxのraycastWorld等を使う |
| Tick timerで `setTimeout` を使いたくなる | 禁止、tick基準Map+head indexリング（EM01知見）、after/every/cancelはtickで消化 |
| Mode例外でroomが落ちる | GameModeRuntime.safeCallでtry/catch、1ルームのみcatch、他ルーム巻き込まない、回帰テスト追加 |
| Coverage 85%が下がる | include-all方針維持、gamemode-api/runtime/ffaの重要branchをassertion、数字稼ぎのshallow test禁止 |
| Snapshot wire formatを変えたくなる | Phase 3では現行16B layout維持、0x11新ヘッダ化は別フェーズ、変更必要なら停止 |
| `defineGameMode` id検証がeditor.md hierarchyと衝突 | id `/^[a-z][a-z0-9-]{2,31}$/`、slugはURL用、`/fps/official/ffa` 形式、editor.md参照、衝突時は停止して質問 |
| `profile-voxel` をついでに作りたくなる | 禁止、Phase 4以降、voxelは契約のみ維持 |
| `GameModeRuntime` が hot pathでGCを出す | zero-alloc/SKILL.md準拠、Map再利用、head indexリング、encode once等 |

## 12. 実績と証拠（実装後に記入）

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| `PLAT-3` | 本コミット | docs-only link check / `git diff --check` | Phase 3計画。gamemode API第1版 + fps-ffa最小、fps先行＋voxel契約のみ継続 |
| `PH3-A` | | | gamemode-api package作成 |
| `PH3-B` | | | GameModeRuntime + Tick timer + RateLimiter |
| `PH3-C` | | | fps-ffa最小モード |
| `PH3-D` | | | 統合 + docs + import境界 + quality gate |


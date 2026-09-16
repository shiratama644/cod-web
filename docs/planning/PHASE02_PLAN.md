# Phase 2: Sim Profile 分離

> 対応 task-list ID: `PLAT-2`, `PH2-A`〜`PH2-E` (docs/task-list.md)  
> 計画書テンプレート: docs/planning/_TEMPLATE.md 準拠  
> 範囲決定: 2026-09-15、人間確認により **fps 先行＋voxel は契約だけ** を採用。`profile-voxel` package / voxel terrain / voxel physics 本実装は Phase 2 に含めない。

## 1. 開始前確認

- 現在のブランチ / HEAD / `git status` を確認する（未コミット変更があれば停止）
- `docs/task-list.md` で Phase 1.5 が完了またはローカル検証済みであることを確認する
- 関連仕様を読む
  - `AGENTS.md` §6（L1 に type 分岐を書かない、決定論、ゼロアロケーション、Sandbox 制約）
  - `.agent/skills/index.md` から `project-overview` / `tech-stack` / `sandbox-constraints`
  - `docs/arch/architecture.md`
  - `docs/arch/sim-profiles.md`
  - `docs/arch/engineering.md`
  - `docs/arch/protocol.md`
  - `docs/arch/client.md`
  - `docs/arch/server.md`
  - `docs/ops/quality-gates.md`
- 本計画書の §5（完了条件）と §7（停止条件）を再読する
- Phase 2 実装へ入る前に、`PLAT-2` の計画 commit が push 済みであることを確認する

## 2. 目的 (Why)

Phase 2 の目的は、現行 fps 実装を将来の `voxel` 追加に耐える形へ分離し、**L1 `engine-core` を Game Type 非依存に保ったまま、L2 `profile-fps` を Sim Profile 実装として注入できる構造**にすること。

現状は Phase 1 の移行後として、すでに `Simulation<TWorld>` が `SimulationStep<TWorld>` を受け取る形になっている。一方で、次の fps 固有結合が残っている。

| 場所 | 現状の結合 | Phase 2 での方向 |
|---|---|---|
| `packages/engine-core/src/net/snapshot.ts` | `PlayerState` / fps snapshot layout を直接組み立てる | `SimProfile` / snapshot writer へ委譲する |
| `packages/engine-core/src/room/Room.ts` | `createPlayerState` に固定 | profile の spawn / initial state へ寄せる |
| `apps/gameserver/src/index.ts` | `@cod/profile-fps` の `buildServerWorld` / `stepPlayer` を直接 import | profile factory を注入する |
| `apps/web/src/game/net/GameClient.ts` | `createDefaultWorld` に固定 | client profile を constructor から注入する |
| `apps/web/src/game/net/prediction.ts` | `stepPlayer` と `CollisionWorld` に固定 | profile step/world contract へ寄せる |
| `packages/protocol/src/protocol/constants.ts` | fps rate constants が共通定数名 | `TYPE_SPECS` と fps spec を導入し、将来 voxel spec を型で表す |

Phase 2 完了時点では、`profile-voxel` は作らない。ただし `SimProfile` contract と `TYPE_SPECS` は、将来 `voxel` を L2 として追加しても L0/L1 を変更しない設計にする。

## 3. 変更範囲 (Scope)

変更対象:

- `packages/engine-core/src/**`
  - `SimProfile` contract
  - `Simulation` / `Room` / snapshot 送信の profile 注入化
  - L1 が `@cod/profile-*` を import しないことを維持する
- `packages/profile-fps/src/**`
  - `FpsSimProfile` 実装
  - `createDefaultWorld` / `buildServerWorld` / `stepPlayer` / snapshot writer を profile に束ねる
- `packages/protocol/src/**`
  - `TYPE_SPECS`（fps 60/60/30、将来 voxel 30/30/15）
  - 既存 `SIM_TICK_HZ` 等の互換 export を必要最小限で維持し、移行ステップごとに壊さない
- `apps/gameserver/src/**`
  - default fps profile を組み立てて `Room` / `Simulation` / `SnapshotBroadcaster` へ注入する
- `apps/web/src/game/net/**`
  - `GameClient` / `ClientPrediction` が fps 固有 step/world を直接固定しない形へ寄せる
  - 当面の default は fps profile でよい
- `_tests_/packages/**` / `_tests_/apps/**`
  - SimProfile contract tests
  - FpsSimProfile determinism tests
  - client/server same input tests
  - 注入経路の回帰 tests
- `docs/task-list.md`, `docs/planning/HANDOFF.md`, `.agent/logs/**`, 必要な `.agent/skills/**`
  - 進捗・証拠・次タスクを更新する

変更しない（境界外）:

- `packages/profile-voxel` の作成
- `voxel-physics-engine` / `noa-engine` の dependency 追加
- voxel terrain / chunk / block action / block delta の本実装
- `gamemode-sdk` / `gamemodes/*`
- matchmaker / seat reservation / Hello HMAC
- Snapshot `0x11` 新ヘッダ化、AOI、delta snapshot、1200B 分割実装
- FireAction / HitConfirm / 巻き戻しヒットスキャンの本実装
- `.github/workflows/` の作成
- Playwright browser 実行を Sandbox で pass と主張すること

## 4. 禁止事項

- 不明点は推測で埋めず、§7 の停止条件に従って質問する
- `docs/arch/adr.md` に反する実装をしない
- L1 `engine-core` に `if (type === 'voxel' | 'fps')`、`switch (gameType)`、`@cod/profile-fps` / `@cod/profile-voxel` import を入れない
- Game Type と Content Source を混同しない。`official` / `ugc` は type ではない
- `profile-voxel` package を「ついで」に作らない
- existing fps behavior を壊してからまとめて直す進め方をしない。各 subtask は小さく、検証して commit する
- `SimProfile.step` 配下に `Math.random` / `Date.now` / `performance.now` / `setTimeout` / I/O を入れない
- hot path で `.slice()` や不要な `{}` / `[]` 生成を増やさない。既存の未達は別タスク化し、Phase 2 の回帰は避ける
- `bun test` を使わない。Vitest は `bun run test:unit` / `bun run test:coverage`
- `.github/workflows/` を作らない。CI 提案は `docs/ops/` のまま維持する

## 5. 完了条件 (DoD)

### PLAT-2（本計画）の DoD

- [ ] `docs/planning/PHASE02_PLAN.md` が `_TEMPLATE.md` 準拠で作成される
- [ ] `docs/task-list.md` に `PLAT-2` と `PH2-A`〜`PH2-E` が追加される
- [ ] `fps 先行＋voxel は契約だけ` 方針が計画書・handoff・task-list に明記される
- [ ] 既存 arch / Phase 1.5 quality gate と矛盾しない
- [ ] docs-only の整合確認（リンクチェック / `git diff --check`）が pass する
- [ ] commit / push 済み

### Phase 2 全体の DoD

- [ ] `engine-core` に `SimProfile` contract があり、L1 が type 非依存のまま動く
- [ ] `profile-fps` に `FpsSimProfile` があり、現行 fps 移動・world・snapshot writer を profile として提供する
- [ ] `TYPE_SPECS` があり、fps: sim 60 / input 60 / snapshot 30、将来 voxel: sim 30 / input 30 / snapshot 15 を表現できる
- [ ] `GameClient` / `ClientPrediction` / `apps/gameserver` が fps 固有実装を direct hardcode せず、profile 注入で動く
- [ ] client/server same input test がある
- [ ] fps 決定論 test がある（目標: 1,000 tick × 100 scenario。Sandbox 時間が厳しい場合は軽量 smoke と重い test の分離方針を明記して停止判断する）
- [ ] 既存 unit / coverage / build / E2E discovery が維持される
- [ ] `engine-core` から `@cod/profile-fps` への import が Biome restricted import で引き続き禁止される
- [ ] `profile-voxel` / voxel dependency は追加されていない

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit (vitest) | `bun run test:unit` | 既存 107 tests を維持し、SimProfile contract / FpsSimProfile / injection / determinism / same input tests を追加する |
| Coverage | `bun run test:coverage` | PH1.5-B thresholds（statements 79 / branches 73 / functions 79 / lines 80）を下回らない。threshold を下げる場合は理由を docs に記録して停止判断する |
| Typecheck | `bun run typecheck` | client/server TS strict と workspace exports が通る |
| Lint | `bunx biome lint .` | `engine-core` → `profile-*` 禁止、WebSocket global 禁止、Biome warnings なし |
| Build | `bun run build` | packages と apps が production build / typecheck できる。既存 Vite chunk-size warning は既知扱い |
| E2E discovery | `bun run test:e2e -- --list` | Playwright specs が discovery できる。browser 実行は Sandbox では行わない |
| 実環境 | CI または実機で `bun run test:e2e` | Browser E2E は実環境検証待ちとして扱う |
| 構造監査 | `git diff` / import 検索 | `engine-core` に type 分岐や profile import が入っていないこと、`profile-voxel` が追加されていないこと |

## 7. 停止条件

次の場合は作業を停止し、変更せず報告する:

- 仕様書（計画書・arch・AGENTS.md・skills）同士に矛盾がある
- `fps 先行＋voxel は契約だけ` の範囲を超え、`profile-voxel` / voxel terrain / voxel physics 本実装が必要になる
- L1 に type 分岐を書かないと進められない設計になった
- Snapshot `0x11` 新ヘッダ化、AOI、delta snapshot、gamemode SDK、matchmaker 等が必要になる
- `TYPE_SPECS` の置き場所について `protocol` と `engine-core` の責務が衝突し、公開 API 判断が必要になる
- 既存 coverage threshold を下げないと進められない
- Sandbox 制約により検証不能な項目を完了扱いにしそうになった
- 開始時点で作業ツリーに未確認の変更がある

## 8. 完了時に行うこと

1. 差分を自己レビューする
2. 実装タスクでは 4 検証 + coverage + E2E discovery を実行する
   - `bun run typecheck`
   - `bunx biome lint .`
   - `bun run test:unit`
   - `bun run test:coverage`
   - `bun run build`
   - `bun run test:e2e -- --list`
3. docs-only の `PLAT-2` ではリンク整合と `git diff --check` を実行する
4. `docs/task-list.md` の状態・進捗・証拠を更新する
5. `.agent/logs/YYYY-MM-DD_<summary>.md` を追加する
6. 必要な知見を `.agent/skills/` に同期する
7. タスク ID を含む Conventional Commit で commit する
8. `git push origin <session-branch>` でセッション固定ブランチへ push する
9. 完了報告では、Playwright browser 実行は Sandbox 未実行であることを明記する

## 9. サブタスク分割

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| `PH2-A` | `SimProfile` contract + `TYPE_SPECS` | `engine-core` の profile contract、`protocol` の type specs、互換 constants、contract tests | `PLAT-2` |
| `PH2-B` | `FpsSimProfile` 実装 | `profile-fps` の profile factory、fps world/step/snapshot writer 集約、profile tests | `PH2-A` |
| `PH2-C` | gameserver への profile 注入 | `apps/gameserver` が profile を組み立て、`Room` / `Simulation` / snapshot へ注入。`engine-core` は L1 のまま | `PH2-B` |
| `PH2-D` | web `GameClient` / prediction への profile 注入 | `GameClient` / `ClientPrediction` が fps profile contract で動く。default fps は維持 | `PH2-B` |
| `PH2-E` | client/server same input + 決定論 + docs 整理 | 1,000 tick × 100 scenario 相当の determinism/same-input tests、import boundary audit、task-list/handoff 更新 | `PH2-C`, `PH2-D` |

## 10. 設計詳細・仕様

### 10.1 `SimProfile` contract の候補

`engine-core` に置く契約は L1 が L2 実装を知らずに呼べる最小面に限定する。Phase 2 では `fps` に必要な最小実装から始め、`voxel` は型として将来表現できるところまでに留める。

候補 API:

```ts
export type GameType = 'fps' | 'voxel'

export interface TypeSpec {
  readonly type: GameType
  readonly simHz: number
  readonly inputHz: number
  readonly snapshotHz: number
  readonly maxPlayers: number
}

export interface SimProfile<TWorld, TPlayerState, TInput, TSnapshotContext = unknown> {
  readonly typeSpec: TypeSpec
  createWorld(): TWorld
  createPlayerState(playerId: number): TPlayerState
  stepPlayer(player: TPlayerState, input: TInput, dtSec: number, world: TWorld): void
  createIdleInput(player: TPlayerState, dtMs: number): TInput
  writeSnapshot(args: TSnapshotContext): number
}
```

実装時はこの候補をそのまま盲目的に採用せず、既存 `Room` / `SnapshotBroadcaster` / `ClientPrediction` の型崩れを見て最小化する。とくに snapshot は現行 wire layout を維持するため、`writeSnapshot` を profile に寄せるか、`SnapshotBroadcaster` から `createSnapshotForPeer` を呼ぶかを `PH2-A` で決める。

### 10.2 `TYPE_SPECS`

`TYPE_SPECS` は Game Type ごとの tick/input/snapshot rate を表す。Phase 2 で実際に使うのは fps のみ。voxel は将来値として定義してよいが、voxel package / dependency は作らない。

| Type | simHz | inputHz | snapshotHz | Phase 2 の扱い |
|---|---:|---:|---:|---|
| `fps` | 60 | 60 | 30 | 実使用。現行 constants と挙動を維持 |
| `voxel` | 30 | 30 | 15 | contract / spec のみ。本実装なし |

既存 `SIM_TICK_HZ` / `SIM_DT` / `INPUT_SEND_HZ` / `SNAPSHOT_SEND_HZ` は、移行中に全呼び出しを一度に壊さないため、fps spec 由来の互換 export として維持してよい。

### 10.3 `FpsSimProfile`

`FpsSimProfile` は現行 `profile-fps` の資産を束ねる。

- `createDefaultWorld()` / `buildServerWorld()` を profile factory の内部または method に集約する
- `stepPlayer()` を profile の `stepPlayer` として公開する
- `createPlayerState()` の spawn 初期値を fps profile から供給できるようにする
- snapshot は現行 layout（`MSG_S2C_SNAPSHOT = 2`, player 16B, `vy` 含む）を維持する
- `three` / `three-mesh-bvh` dependency は `profile-fps` に残す
- `engine-core` は `CollisionWorld` 型を知らない

### 10.4 gameserver 注入方針

`apps/gameserver` は L0+L1+L2 を組み立てる executable なので、当面 `@cod/profile-fps` を import してよい。ただし import する対象は低レベルの `stepPlayer` / `buildServerWorld` ではなく、`createFpsSimProfile()` のような profile factory に寄せる。

目標:

```ts
const profile = createFpsSimProfile()
const room = new Room({ profile })
const sim = new Simulation({ room, profile })
const snapshots = new SnapshotBroadcaster({ profile })
```

実装時は既存 constructor を一度に壊さず、compat overload / default fps profile は避け、タスクごとに明示注入へ移行する。

### 10.5 web `GameClient` 注入方針

`GameClient` / `ClientPrediction` は fps 固有の `stepPlayer` / `CollisionWorld` を直接 import しない形に寄せる。

- `ClientPrediction` は `world` と `stepPlayer` を profile から受け取る
- `GameClient` constructor は `clientProfile` を受け取る
- default export / default constructor は当面 fps profile で動作してよいが、将来 `client-fps` 動的 import へ移す前提を docs に残す
- Snapshot decoder は Phase 2 では現行 fps decoder を維持する。`0x11` 新ヘッダや voxel snapshot decoder は後続

### 10.6 テストの粒度

| テスト | 目的 | 配置候補 |
|---|---|---|
| contract test | `engine-core` が mock profile で動く | `_tests_/packages/engine-core/profile/*.test.ts` |
| import boundary test / lint probe | `engine-core` が `profile-fps` を import しない | Biome lint + docs 証拠 |
| FpsSimProfile smoke | profile factory から world / player / step が動く | `_tests_/packages/profile-fps/profile/*.test.ts` |
| determinism | 同一 initial state + 同一 quantized input stream が同一結果 | `_tests_/packages/profile-fps/sim/*.test.ts` |
| client/server same input | client prediction と server simulation が同じ profile で同じ位置になる | `_tests_/packages/profile-fps/sim/*.test.ts` または cross-package test |
| GameClient injection | mock profile / fps profile で送信と調停が動く | `_tests_/apps/web/src/game/net/*.test.ts` |
| Snapshot injection | `SnapshotBroadcaster` が profile writer 経由で payload を作る | `_tests_/packages/engine-core/net/*.test.ts` |

## 11. リスク・Gotchas

| リスク | 対応 |
|---|---|
| milestones では `VoxelSimProfile` が Phase 2 に含まれるが、既存合意では voxel package はまだ作らない | 2026-09-15 の人間確認で `fps 先行＋voxel は契約だけ` を採用。計画書が具体範囲として優先 |
| `engine-core` の `Room` が `PlayerState` に固定されている | `TPlayerState` generic 化、または profile が `PlayerState` compatible な state を返す段階移行にする |
| Snapshot writer を profile に寄せると型が大きくなる | まず現行 fps snapshot layout の writer interface だけに限定。Snapshot `0x11` 化は別フェーズ |
| `TYPE_SPECS` と既存 constants の二重管理 | `TYPE_SPECS.fps` から既存 constants を導出するか、移行中のみ互換 export として残し、テストで一致を固定 |
| 決定論 1,000×100 が Sandbox で重い | まず軽量 smoke を常時 unit に置き、重い determinism を通常 unit に含められるか実測。重すぎる場合はユーザー確認して dedicated script 化を検討 |
| coverage threshold が下がる | PH1.5 quality gate を維持。数字稼ぎではなく重要経路の assertion を追加する |
| GameClient default constructor が profile 注入と衝突 | constructor 引数に default fps profile を持たせる場合でも、将来 `client-fps` 動的 import へ移す TODO を計画/タスクへ残す |
| L1 に type 分岐が入りそう | 停止条件。profile registry は executable / app 側に置き、L1 は interface 呼び出しだけにする |

## 12. 実績と証拠（実装後に記入）

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| `PLAT-2` | 本コミット | docs-only link check / `git diff --check` | Phase 2 計画。`fps 先行＋voxel は契約だけ` を採用 |
| `PH2-A` | 本コミット | typecheck / lint / unit / coverage / build / E2E discovery | `SimProfile` contract + `TYPE_SPECS`。19 files / 112 tests、coverage thresholds pass |
| `PH2-B` | 本コミット | typecheck / lint / unit / coverage / build / E2E discovery | `FpsSimProfile` factory。20 files / 116 tests、coverage thresholds pass |
| `PH2-C` | 未実装 | 未実行 | gameserver injection |
| `PH2-D` | 未実装 | 未実行 | GameClient / prediction injection |
| `PH2-E` | 未実装 | 未実行 | determinism / same input / docs handoff |

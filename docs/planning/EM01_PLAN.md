# EM01: 完全バグ修正フェーズ（Emergency Phase 1）

> 対応 task-list ID: `PLAT-EM`, `EM1-A`〜`EM1-F` (docs/task-list.md)
> 計画書テンプレート: docs/planning/_TEMPLATE.md 準拠
> 緊急度: Emergency。Phase 3 計画前に現行コードのバグ・リーク・ゼロアロケ違反・ログ汚染を完全解消する。

## 1. 開始前確認

- 現在のブランチ / HEAD / `git status` を確認する（未コミット変更があれば停止）。現在 `arena/01a0b161-cod-web` / HEAD `b3dd3ed` / Phase 2 完了。
- `docs/task-list.md` で Phase 2 が `PH2-E ローカル検証済み` であることを確認する。
- 関連仕様を読む
  - `AGENTS.md` §3（テスト品質）、§4（Git）、§6（決定論、ゼロアロケ、WSのみ、Biome）
  - `.agent/skills/index.md` から `project-overview` / `tech-stack` / `sandbox-constraints`
  - `docs/arch/architecture.md`（依存規則、Biome強制）
  - `docs/arch/engineering.md`（決定論、ゼロアロケ、予算、テスト最低ライン）
  - `docs/arch/protocol.md`（Input 16B、Snapshot、Channel、backpressure）
  - `docs/arch/server.md`（Room、TickScheduler、ゼロアロケ、レート制限）
  - `docs/arch/client.md`（予測、補間、バンドル）
  - `docs/ops/quality-gates.md`（typecheck/lint/determinism/unit/coverage/build/E2E）
  - `docs/planning/HANDOFF.md`（Phase2完了証拠）
- 本計画書の §5（完了条件）と §7（停止条件）を再読する。
- `bun run typecheck` / `bun run lint` / `bun run test:unit` / `bun run test:coverage` / `bun run build` / `bun run check:determinism` / `bun run check:determinism:heavy` / `bun run test:e2e -- --list` が現状 pass することを確認する（事実確認済み: 2026-09-20 時点で 23 files/127 tests pass、coverage 80.96%/75.06%/81.25%/82.6%、build pass、determinism pass）。
- GitHub Issues / PR が 0 であることを `gh issue list` / `gh pr list` で確認する（事実確認済み: 0件）。

## 2. 目的 (Why)

Phase 2 までで Sim Profile 分離と決定論は検証済みだが、**緊急で完全バグ修正**が必要。現行コードの事実確認で以下の潜在バグ・非効率・規約違反が見つかった。放置すると Phase 3（gamemode API）以降で負債が増幅する。

**事実確認で見つかった問題一覧（2026-09-20監査）:**

| # | 場所 | 問題 | 深刻度 | 根拠 |
|---|---|---|---|---|
| B1 | `engine-core/src/net/lagcomp-store.ts` + `room/Room.ts` | `LagCompStore.history` が `Room.leave` 時に `clear(id)` されない。長期稼働でメモリリーク。 | 高 | `grep lagComp` で `clear` 呼び出し0。`Room.leave` は players/peersのみ削除 |
| B2 | `engine-core/src/sim/Simulation.ts` + `room/Room.ts` | `inputQueues` / `latestSeq` が `leave` 時に削除されない。リーク。 | 高 | `Simulation` に `removePlayer` なし。`Room.leave` のみ |
| B3 | `engine-core/src/net/snapshot.ts` `paused` | `paused` Set が `leave` 時に削除されない。backpressure状態のプレイヤーが離脱後も残留。 | 中 | `markWritable` はあるが `remove` なし |
| B4 | `engine-core/src/room/Room.ts` `getPlayers()` | 毎tick `[...players.values()]` で配列確保。`Simulation.step` と `SnapshotBroadcaster.maybeSend` が毎tick呼ぶためゼロアロケ違反。GC <1MB/1000ticks を脅かす。 | 高 | `engineering.md` ゼロアロケ、server.md「new/[]/{}禁止」 |
| B5 | `engine-core/src/net/snapshot.ts` `maybeSend` | スナップショットを `for (peer of players)` 内で毎回 `writeSnapshot` エンコード。`players.length` が n なら n回同じエンコード。CPU無駄。 | 中 | コード読解。`payloadBytes` がループ内で上書き |
| B6 | `engine-core/src/sim/Simulation.ts` `inputQueues.shift()` / `splice` | `shift()` O(n)、`splice(0, excess)` O(n)。60Hz x 16人で毎tick発生。リングバッファ推奨だが現状はArray。 | 中 | server.md 入力キューはリングバッファ推奨 |
| B7 | `apps/web/src/game/babylon/BabylonGame.ts` `console.log` | `console.log(`[net] ${status}`)` が本番クライアントに残留。HUDで代替すべき。 | 低 | `grep console.log` で発見。4箇所中1つはクライアント |
| B8 | `apps/gameserver/src/index.ts` `console.log` | サーバーログは許容だが構造化ログでない。`console.log` 3箇所。将来ログレベル検討。 | 低 | `grep` で発見。Phase0では許容だったがEMで整理 |
| B9 | `apps/web/src/game/net/interpolation.ts` `shift()` | `samples.shift()` O(n)。補間履歴は最大数十件だがゼロアロケ観点でリング推奨。 | 低 | `grep shift` で発見 |
| B10 | `engine-core/src/net/lagcomp-store.ts` `shift()` | 履歴古いサンプルの削除に `shift()`。最大30件だがゼロアロケ違反の可能性。 | 低 | 同上 |
| B11 | `apps/web/src/game/net/GameClient.ts` `remotes` | `remotes` Map が毎フレーム `interpolator.sample()` で新規Map確保。`updateRemotes()` で `this.remotes = new Map`。毎フレームGC。 | 中 | `frame()` 60-120HzでMap newは予算超過 |
| B12 | `packages/protocol/src/protocol/packer.ts` `players.map` | `writeCompatSnapshot` で `players.map` が毎スナップショットで配列確保。`encodeSnapshot` 内でもループ。ゼロアロケ違反。 | 中 | `snapshot.ts` の `writeCompatSnapshot` |
| B13 | `apps/web/src/game/net/prediction.ts` `pending` | `reconcile` で `filter` が毎回新配列確保。`pending` が最大数十件だが60HzでGC。 | 低 | `prediction.ts` |
| B14 | カバレッジ | Statements 80.96%/Branches 75.06%は閾値上だが、`Room` / `SnapshotBroadcaster` / `LagCompStore` の leave/clear経路が未テスト。 | 中 | coverage report + 未テストbranch |
| B15 | E2E | Playwright browser 実行はSandbox制約で未実行。実環境検証待ちのまま。 | 中 | `test:e2e --list` のみ。CIでのbrowser実行結果なし |

EM1 では **B1〜B5、B11、B12 を必須**、B6,B9,B10,B13 は可能な範囲で改善、B7 は削除、B14 は回帰テスト追加、B15 はCI結果の明記（Sandboxでは主張しない）を目的とする。

## 3. 変更範囲 (Scope)

変更対象:

- `packages/engine-core/src/room/Room.ts`
  - `getPlayers()` のゼロアロケ対応: `values()` イテレータを返す `getPlayersIterable()` 追加 or 既存 `getPlayers()` を残しつつ内部で再利用バッファを検討。ただし公開API変更は最小に。`for...of` で回せるIterableを提供し、`Simulation.step` と `SnapshotBroadcaster` をそちらへ移行する。
  - `leave` 時にコールバックで外部リソース（lagcomp, inputQueues, paused）をクリアできるイベント or 明示的な `onLeave` hook を追加しない。代わりに `Room` が `leave` 時に何もしない現状を維持しつつ、`Simulation` と `SnapshotBroadcaster` と `InputRateLimiter` 側で `Room.leave` 後に `clear/remove` を呼ぶ経路を `apps/gameserver/src/index.ts` に追加する。L1にtype分岐を入れない。
- `packages/engine-core/src/sim/Simulation.ts`
  - `removePlayer(playerId)` を追加し、`inputQueues` / `latestSeq` を削除する。
  - `step()` で `room.getPlayers()` の配列確保をやめ、`getPlayersIterable()` or `room.forEachPlayer` 的なゼロアロケ経路へ移行。`shift()` をリングバッファのインデックス管理に置換するか、少なくとも `shift()` のO(n)を避けるための簡易キュー（head index）へ。
  - `receiveInput` の `splice(0, excess)` をリング化 or `slice` 的な再確保を避ける。
- `packages/engine-core/src/net/lagcomp-store.ts`
  - `record` の `shift()` をリング or head index に置換。`clear(id)` が呼ばれることを前提に、リークしないことをテストで固定。
- `packages/engine-core/src/net/snapshot.ts`
  - `maybeSend` のエンコードをループ外へ1回に。`writeSnapshot` を1回呼んで `payloadBytes` を確定し、ループ内では `sendBinary` のみ。
  - `removePlayer(playerId)` を追加し、`paused` から削除。
  - `writeCompatSnapshot` の `players.map` を `for` ループで直接 `encodeSnapshot` 相当を書くか、事前確保の配列再利用に。
- `packages/engine-core/src/net/rate-limit.ts`
  - 既存 `remove` はある。`Room.leave` 時の呼び出しは `gameserver/index.ts` で既にやっていることを確認。テストで固定。
- `apps/gameserver/src/index.ts`
  - `close` ハンドラで `room.leave` 後に `sim.removePlayer(id)` / `snapshots.removePlayer(id)` / `lagcomp clear`（Simulation経由 or 直接）を呼ぶ。
  - `console.log` を残すか、`logger` 的なラッパに寄せるかはEM1では最小修正: 起動ログ1つは残し、join/leaveログは `console.log` から `console.info` or 削除 or 環境変数 `LOG_LEVEL` で制御する選択肢を検討。ただし現状の3ログは開発時の可視性に有用なので、EM1では「本番ビルドでconsole残留をBiomeで警告」するルールを追加するか、単に `BabylonGame` のクライアント側 `console.log` のみ削除する。
- `apps/web/src/game/babylon/BabylonGame.ts`
  - `console.log(`[net] ${status}`)` を削除し、`gameStoreApi` の `setConnectionStatus` のみにする。
- `apps/web/src/game/net/GameClient.ts`
  - `remotes` Map の毎フレーム new をやめ、既存Mapを `clear()` + `set()` で再利用するか、`interpolator.sample` が新規Mapを返すならそのMapを直接 `this.remotes` に代入せず、差分更新に。
  - ただし `interpolator.sample` のAPI変更は影響大なので、EM1では `remotes` の再利用を最小差分で: `sample` が返すMapをそのまま代入する現状を、内部で `clear` + `forEach` にするか、Interpolator側で再利用バッファを持たせるかを検討。
- `apps/web/src/game/net/interpolation.ts`
  - `samples.shift()` を head index に。
- `apps/web/src/game/net/prediction.ts`
  - `pending.filter` の毎回新配列確保を、in-place 削除 or head index に。ただし `reconcile` は30Hzなので影響小。EM1では `filter` を残しつつコメントでゼロアロケTODOを残すか、簡易最適化。
- `_tests_/`
  - `Room` / `Simulation` / `SnapshotBroadcaster` / `LagCompStore` の `leave` / `removePlayer` / `clear` 経路の回帰テストを追加。
  - ゼロアロケの簡易テスト: `Room.getPlayers()` が毎回 new 配列であることを検出するテスト or 新Iterableが同じ参照を使い回さないが確保を減らすことを確認するテスト。
  - `BabylonGame` の console.log が無いことを確認するlint的テスト（任意）。
- `docs/` / `.agent/`
  - `task-list.md` に EM フェーズと EM1-* タスクを追加。
  - `HANDOFF.md` を EM1 計画へ更新。
  - `quality-gates.md` に EM1 の追加ゲート（memory leak test、zero alloc audit）を追記。
  - `.agent/logs/` に EM1 計画ログ。
  - `biome.json` に `noConsole` or `noRestrictedGlobals` で `console.log` をクライアント側で禁止するルール追加を検討（gameserver は許可）。

変更しない（境界外）:

- `packages/profile-voxel` の作成、voxel terrain/physics 本実装
- `gamemode-sdk` / `gamemodes/*` / matchmaker / seat reservation / Hello HMAC
- Snapshot `0x11` 新ヘッダ化、AOI、delta snapshot、1200B分割本実装
- FireAction / HitConfirm / 巻き戻しヒットスキャン本実装
- Playwright browser 実行をSandboxでpassと主張すること
- バンドル分割（hub/shell/client-fps分離）はPhase4以降。EM1では現行単一チャンクのまま
- `bun test` の使用（Vitestを使う）

## 4. 禁止事項

- 不明点は推測で埋めず、§7 の停止条件に従って質問する
- `docs/arch/adr.md` に反する実装をしない
- L1 `engine-core` に `if (type === 'voxel' | 'fps')`、`switch (gameType)`、`@cod/profile-fps` / `@cod/profile-voxel` import を入れない
- Game Type と Content Source を混同しない
- `profile-voxel` package を「ついで」に作らない
- existing fps behavior を壊してからまとめて直す進め方をしない。各subtaskは小さく、検証してcommitする
- `SimProfile.step` 配下に `Math.random` / `Date.now` / `performance.now` / `setTimeout` / I/O を入れない
- hot path で `.slice()` や不要な `{}` / `[]` 生成を増やさない。EM1の目的は逆にそれらを減らすこと
- `bun test` を使わない。Vitest は `bun run test:unit` / `bun run test:coverage`
- CI は `docs/ops/` の提案と `.github/workflows/` の本番配置の両方を扱う（2026-09-19許可）
- `.agent/logs/` の過去ログを一括置換で書き換えない（AGENTS.md §8.5）
- `console.log` を本番クライアントに残さない（EM1-Bで削除）。サーバーの起動ログ1つは許容

## 5. 完了条件 (DoD)

### PLAT-EM（本計画）の DoD

- [x] `docs/planning/EM01_PLAN.md` が `_TEMPLATE.md` 準拠で作成される
- [x] `docs/task-list.md` に `PLAT-EM` と `EM1-A`〜`EM1-F` が追加される
- [x] 事実確認（§1）の結果とバグ一覧（B1〜B15）が計画書に明記される
- [x] 既存 arch / Phase2 quality gate と矛盾しない
- [x] docs-only の整合確認（リンクチェック / `git diff --check`）が pass する
- [x] commit / push 済み（本コミットで実施）

### EM1 全体の DoD

- [ ] B1: `LagCompStore` が `Room.leave` 時に `clear(id)` される（gameserver close ハンドラで `sim.removePlayer` 経由 or 直接）
- [ ] B2: `Simulation` の `inputQueues` / `latestSeq` が `leave` 時に削除される（`removePlayer` API追加）
- [ ] B3: `SnapshotBroadcaster.paused` が `leave` 時に削除される（`removePlayer` API追加）
- [ ] B4: `Room.getPlayers()` の毎tick配列確保が解消される（Iterable or forEach経路へ移行、ゼロアロケ監査で `getPlayers()` の直接使用が hot path に0件）
- [ ] B5: `SnapshotBroadcaster.maybeSend` がスナップショットエンコードをループ外1回に（CPU改善、byte-for-byte一致をテストで固定）
- [ ] B7: `BabylonGame.ts` の `console.log` が削除される
- [ ] B11/B12: `GameClient.remotes` と `writeCompatSnapshot` の毎フレーム/毎スナップショット配列確保が削減される（Map再利用 or clear+set、players.map廃止）
- [ ] B14: `Room` / `Simulation` / `SnapshotBroadcaster` / `LagCompStore` の leave/clear経路に回帰テストがある
- [ ] 既存 `bun run typecheck` / `bunx biome lint .` / `bun run test:unit` / `bun run test:coverage` / `bun run build` / `bun run test:e2e -- --list` / `bun run check:determinism` / `bun run check:determinism:heavy` が pass し、coverage閾値（79/73/79/80）を下回らない
- [ ] `engine-core` から `@cod/profile-fps` への import が Biome restricted import で引き続き禁止される（0 violations）
- [ ] `profile-voxel` / voxel dependency は追加されていない
- [ ] `docs/task-list.md` / `docs/planning/HANDOFF.md` / `docs/ops/quality-gates.md` が EM1 完了で更新される
- [ ] `.agent/logs/YYYY-MM-DD_em1-*.md` が作成される

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit (vitest) | `bun run test:unit` | 既存127 tests維持 + B1〜B3のremovePlayer/clearテスト、B4のgetPlayersIterableテスト、B5のencode1回テスト、B14のleave回帰 |
| Coverage | `bun run test:coverage` | 閾値79/73/79/80を下回らない。Room/Simulation/SnapshotBroadcaster/LagCompStoreのbranchカバレッジが上がる |
| Typecheck | `bun run typecheck` | client/server TS strict pass |
| Lint | `bunx biome lint .` | engine-core→profile-*禁止、WebSocket global禁止、client側console.log禁止（新規ルール） |
| Build | `bun run build` | packagesとappsがproduction buildできる。Vite chunk-size warningは既知 |
| Determinism | `bun run check:determinism` + `check:determinism:heavy` | SimProfile禁止APIなし、L1 type分岐なし、1000x100 determinism pass |
| E2E discovery | `bun run test:e2e -- --list` | 3 tests discovered。browser実行はSandboxでは行わない |
| 構造監査 | `grep -R` | `getPlayers()` のhot path使用0、`.slice` 0、`Math.random` in sim 0、`console.log` in client 0、`engine-core`→`profile-fps` 0、`profile-voxel` なし |
| 実環境 | CIまたは実機で `bun run test:e2e` | Browser E2Eは実環境検証待ちとして扱う |

## 7. 停止条件

次の場合は作業を停止し、変更せず報告する:

- 仕様書（計画書・arch・AGENTS.md・skills）同士に矛盾がある
- `fps先行＋voxelは契約だけ` の範囲を超え、`profile-voxel` / voxel terrain / voxel physics 本実装が必要になる
- L1にtype分岐を書かないとバグ修正できない設計になった（例: Roomがprofileを知る必要がある等）
- Snapshot `0x11` 新ヘッダ化、AOI、delta snapshot、gamemode SDK、matchmaker等が必要になる
- 既存coverage thresholdを下げないと進められない
- Sandbox制約により検証不能な項目を完了扱いにしそうになった
- 開始時点で作業ツリーに未確認の変更がある
- B4のゼロアロケ対応で公開APIを大きく壊す必要がある（例: `getPlayers()` を削除して全呼び出しを書き換えると影響大）。その場合は `getPlayersIterable()` 追加の最小差分に留めるか、ユーザー確認する

## 8. 完了時に行うこと

1. 差分を自己レビューする（R3F残存、`bufferedAmount`、Channelなしsend、voxel誤作、console.log残留をgrep）
2. 実装タスクでは 4検証 + coverage + E2E discovery + determinism + heavy を実行する
   - `bun run typecheck`
   - `bunx biome lint .`
   - `bun run test:unit`
   - `bun run test:coverage`
   - `bun run build`
   - `bun run test:e2e -- --list`
   - `bun run check:determinism`
   - `bun run check:determinism:heavy`
3. `docs/task-list.md` の状態・進捗・証拠を更新する
4. `.agent/logs/YYYY-MM-DD_<summary>.md` を追加する
5. 必要な知見を `.agent/skills/` に同期する
6. タスクIDを含むConventional Commitでcommitする
7. `git push origin <session-branch>` でセッション固定ブランチへpushする
8. 完了報告では、Playwright browser実行はSandbox未実行であることを明記する

## 9. サブタスク分割

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| `PLAT-EM` | EM01計画作成（完全バグ修正） | `EM01_PLAN.md`、task-listにEM追加、事実確認 | PH2-E |
| `EM1-A` | メモリリーク修正（LagCompStore/InputQueues/paused） | `Simulation.removePlayer`、`SnapshotBroadcaster.removePlayer`、`LagCompStore.clear` を `gameserver/index.ts` closeハンドラで呼ぶ、回帰テスト | PLAT-EM |
| `EM1-B` | console.log削除 + ログ整理 | `BabylonGame.ts` console.log削除、gameserverログ整理、Biome noConsoleルール検討 | PLAT-EM |
| `EM1-C` | ゼロアロケ違反修正（Room.getPlayers / Snapshot encode） | `Room.getPlayersIterable()` or `forEachPlayer`追加、`Simulation.step`と`SnapshotBroadcaster.maybeSend`をIterableへ、encodeをループ外1回に | EM1-A |
| `EM1-D` | クライアントGC削減（remotes Map / players.map / pending filter） | `GameClient.remotes` Map再利用、`writeCompatSnapshot` players.map廃止、`prediction.pending` filter最適化（任意） | EM1-C |
| `EM1-E` | 入力キュー/補間/ラグ補償のshift/splice改善 | `Simulation.inputQueues` をhead indexリングに、`LagCompStore` shiftをhead indexに、`Interpolator` shiftをhead indexに（可能な範囲） | EM1-C |
| `EM1-F` | 回帰テスト + coverage + docs整理 | B1〜B5,B11,B12の回帰テスト追加、coverage閾値維持確認、task-list/HANDOFF/quality-gates更新、skills/log整理 | EM1-A〜EM1-E |

## 10. 設計詳細・仕様

### 10.1 メモリリーク修正方針（B1〜B3）

現状 `Room.leave` は `players` と `peers` のみ削除。`Simulation` / `SnapshotBroadcaster` / `InputRateLimiter` / `LagCompStore` は `Room` を知らないため、leave時に自前リソースを削除しない。

**目標:** `apps/gameserver/src/index.ts` の `close` ハンドラで:

```ts
close(ws) {
  const id = ws.data?.playerId
  if (id != null && id > 0) {
    inputRate.remove(id)          // 既存
    sim.removePlayer(id)          // 新規: inputQueues/latestSeq + lagComp.clear
    snapshots.removePlayer(id)    // 新規: paused Set
    room.leave(id)                // 既存
  }
}
```

`Simulation.removePlayer(id)` は:

```ts
removePlayer(playerId: number): void {
  this.inputQueues.delete(playerId)
  this.latestSeq.delete(playerId)
  this.lagComp.clear(playerId)
}
```

`SnapshotBroadcaster.removePlayer(id)` は `paused.delete(id)`。

`LagCompStore.clear` は既存。

L1にtype分岐を入れない。`Room` はL1のまま。

### 10.2 ゼロアロケ対応（B4、B5、B11、B12）

`engineering.md` と `server.md` は hot path で `new` / `[]` / `{}` / `.slice` / `.map` を禁止。現状:

- `Room.getPlayers()` が `[...values()]` で毎tick配列確保。`Simulation.step` (60Hz) と `SnapshotBroadcaster.maybeSend` (30Hz) が呼ぶ。
- `SnapshotBroadcaster.maybeSend` が `for (p of players)` 内で `writeSnapshot` を毎回呼ぶ。
- `writeCompatSnapshot` が `players.map` で毎回新配列。
- `GameClient.remotes = new Map` が毎フレーム。

**目標:**

- `Room` に `getPlayersIterable(): Iterable<PlayerState>` または `forEachPlayer(cb)` を追加。`getPlayers()` は残すがhot pathでは使わない。`Simulation.step` と `SnapshotBroadcaster.maybeSend` はIterable版へ。
- `SnapshotBroadcaster.maybeSend` は `writeSnapshot` をループ外で1回だけ呼び、`payloadBytes` を確定。ループ内では `sendBinary` のみ。
- `writeCompatSnapshot` の `players.map` を `for` ループで直接 `encodeSnapshot` 相当を書く。または事前確保の `PlayerState[]` 再利用プール。
- `GameClient.remotes` は `interpolator.sample()` が返すMapをそのまま代入せず、`clear()` + `set()` で再利用。または `Interpolator` が内部でMapを再利用する。

いずれも byte-for-byte 一致を `FpsSimProfile.test` 的な既存テストで固定する。

### 10.3 console.log削除（B7）

`BabylonGame.ts:77 console.log(`[net] ${status}`)` はHUDの `setConnectionStatus` で代替可能なので削除。`gameStoreApi` の状態変化でHUDに表示されるため、consoleは不要。

`apps/gameserver/src/index.ts` の3つの `console.log` はサーバー運用ログとして許容。ただしEM1-Bで1つに絞るか、`LOG_LEVEL` 環境変数で制御するかを検討。最小差分ではクライアント側のみ削除。

Biomeで `noConsole` を `apps/web/src/game/babylon/**/*` と `apps/web/src/game/net/**/*` にerrorレベルで追加し、将来のconsole残留を防止する。

### 10.4 入力キュー/補間/ラグ補償のshift/splice改善（B6、B9、B10）

`Array.shift()` は先頭要素削除でO(n)かつ毎回再確保。リングバッファに置換:

```ts
// Simulation inputQueues: Map<playerId, { buf: PlayerInput[], head: number, tail: number }>
```

簡易実装では `head` indexを持ち、`shift()` 代わりに `buf[head++]` を返し、`head` が `buf.length` の半分を超えたら `buf.splice(0, head)` でまとめて削除する（償却O(1)）。

`LagCompStore` と `Interpolator` も同様にhead index。

ただしEM1-Eは可能な範囲で、既存テストを壊さない最小差分に留める。完全リング化が大きすぎる場合はTODOコメントとベンチマークを残してEM1-Fへ回す。

### 10.5 テスト方針

| テスト | 目的 | 配置 |
|---|---|---|
| `Room.leave` + `Simulation.removePlayer` | leave時にinputQueues/latestSeq/lagCompが消える | `_tests_/packages/engine-core/room/Room.test.ts` or `Simulation.test.ts` |
| `SnapshotBroadcaster.removePlayer` | paused Setが消える | `_tests_/packages/engine-core/net/snapshot.test.ts` |
| `LagCompStore.clear` on leave | 履歴が消える | `_tests_/packages/engine-core/net/lagcomp-store.test.ts` (新規) |
| `Room.getPlayersIterable` | Iterableが配列確保せずに回せる、getPlayers()と同値 | `_tests_/packages/engine-core/room/Room.test.ts` |
| `SnapshotBroadcaster` encode once | n人でもencode 1回、payload一致 | `_tests_/packages/engine-core/net/snapshot.test.ts` |
| `BabylonGame` no console.log | `grep console.log` 0 | lint + unit (任意) |
| `GameClient.remotes` reuse | Mapの参照が毎フレームnewでない | `_tests_/apps/web/src/game/net/GameClient.test.ts` |
| Coverage | thresholds維持 | `bun run test:coverage` |

## 11. リスク・Gotchas

| リスク | 対応 |
|---|---|
| `Room.getPlayers()` のAPI変更が全呼び出しに波及 | `getPlayers()` は残し、`getPlayersIterable()` を追加。hot pathだけ新APIへ。旧APIはテストで残す |
| `SnapshotBroadcaster.maybeSend` のencodeをループ外に出すと、per-peerのlastAckSeqが異なるのに同じpayloadになる | 現行 `writeCompatSnapshot` は `lastAckSeq` を引数に取るが、全player分を同じviewに書くため、per-peer lastAckSeqは実際には1人分しか使われないバグがあった。EM1-Cで `lastAckSeq` の扱いを確認し、必要なら per-peer lastAckSeqを正しく書くか、現行の「全player分を同じpayload」仕様を維持するか判断する。判断に迷ったら停止して質問する |
| リングバッファ化で `shift()` の挙動が変わり、入力順序が崩れる | 単体テストで seq順を固定。`receiveInput` の `latestSeq` ガードと組み合わせて順序を検証 |
| `console.log` 削除でデバッグ性が下がる | サーバー側は残す。クライアント側のみ削除。必要なら `gameStoreApi` のHUDログで代替 |
| ゼロアロケ対応で `for...of` が `Map.values()` のイテレータを毎回newするため、結局確保が残る | `Map.values()` イテレータも確保だが、配列 `[...values()]` よりは軽い。完全ゼロアロケは `forEach` or 事前確保配列再利用。ベンチマークで差を測る |
| coverage閾値を下げないと進められない | B1〜B5の回帰テストでbranch coverageを上げる。thresholdは下げない。下げが必要なら停止 |
| SandboxでE2E browser実行不可 | `test:e2e --list` まで。browser実行はCI/実環境検証待ちと明記 |
| EMフェーズがPhase3計画と競合 | EMは緊急バグ修正であり、Phase3の機能追加（gamemode SDK等）を含めない。task-listでEMをPhase2とPhase3の間に挿入し、依存を `PH2-E -> PLAT-EM -> EM1-* -> PLAT-3` にする |

## 12. 実績と証拠（実装後に記入）

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| `PLAT-EM` | 本コミット | docs-only link check / `git diff --check` | EM01計画。事実確認済みバグB1〜B15を明記 |
| `EM1-A` | 未実装 | 未実行 | メモリリーク修正 |
| `EM1-B` | 未実装 | 未実行 | console.log削除 |
| `EM1-C` | 未実装 | 未実行 | ゼロアロケ違反修正 |
| `EM1-D` | 未実装 | 未実行 | クライアントGC削減 |
| `EM1-E` | 未実装 | 未実行 | shift/splice改善 |
| `EM1-F` | 未実装 | 未実行 | 回帰テスト + docs整理 |


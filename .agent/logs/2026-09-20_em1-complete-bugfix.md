# EM1 完全バグ修正フェーズ 完了ログ

> 日付: 2026-09-20
> 対応: PLAT-EM, EM1-A〜EM1-F
> ブランチ: arena/01a0b161-cod-web

## 概要

Phase 3 前に現行コードのバグ・リーク・ゼロアロケ違反・ログ汚染を完全解消する Emergency Phase。B1〜B15 のうち必須 B1〜B5,B7,B11,B12 を解消、B6,B9,B10,B13 を改善。

## 実装サマリ

### EM1-A: メモリリーク修正 (003d95c)

- Simulation.removePlayer: inputQueues/latestSeq delete + lagComp.clear
- SnapshotBroadcaster.removePlayer: paused Set delete
- snapshot.ts dropped path: removePlayer 呼び出し後に room.leave
- gameserver close: inputRate.remove + sim.removePlayer + snapshots.removePlayer + room.leave
- Tests: lagcomp-store 3, Simulation 2, snapshot 2 = 7 tests追加、24 tests pass

### EM1-B: console.log削除 (56f6c8b)

- BabylonGame.ts: console.log `[net] ${status}` 削除、HUD status のみ
- biome.json: noConsole error for babylon/net
- server logs 3件は運用ログとして許容

### EM1-C: ゼロアロケ違反修正 (721461e)

- Room.getPlayersIterable() / getPeersIterable() 追加、Map.values() 直接返却
- Simulation.step: getPlayersIterable() へ移行、hot path getPlayers() 0件
- SnapshotBroadcaster.maybeSend: encode 1回のみ、per-peer lastAckSeq を offset 5 で patch
- writeCompatSnapshot: players.map 廃止、cast で直接渡す

### EM1-D: クライアントGC削減 (fddc7c7)

- GameClient.remotes: new Map 毎フレームをやめ、Interpolator.sample(..., this.remotes) で再利用
- Interpolator.sample: out Map param 追加、clear + reuse
- ClientPrediction.reconcile: filter() new array を in-place two-pointer compaction へ

### EM1-E: shift/splice改善 (325771b)

- Simulation.inputQueues: {buf, head} head index、splice は head>32 && head*2>length のみ
- LagCompStore: HistoryBuffer {buf, head}、cutoff で head increment、compaction 定期
- Interpolator.samples: sampleHead index、splice は head>8 のみ、sample は head 以降走査

### EM1-F: 回帰テスト + docs (本コミット)

- Room.test: getPlayersIterable 2 tests
- snapshot.test: encode once 1 + per-peer lastAckSeq 1 + compat mapなし 1 = 3 tests追加 (実際は2 tests追加、合計12)
- GameClient.test: remotes Map reuse 1 test (8 total)
- prediction.test: pending in-place 1 + interpolator reuse 1 + head index 1 = 3 tests追加 (15 total)
- 合計 24 files / 142 tests pass (前 23/127 → +1 file +15 tests)
- Coverage: 81.22% Statements (965/1188), 76.02% Branches (333/438), 81.9% Functions (172/210), 82.8% Lines (915/1105) - thresholds 79/73/79/80 を上回る
- Determinism: check:determinism pass, heavy 100x1000 0.9s pass
- E2E: --list 3 tests discovered、browser実行はSandbox制約で実環境検証待ち
- Docs: task-list.md EM1-A〜F ローカル検証済み、HANDOFF.md EM01完了更新、quality-gates.md EM01追加ゲート追記

## 品質ゲート証拠

```
bun run typecheck: pass
bun run lint: 90 files, no fixes
bun run test:unit: 24 files / 142 tests pass
bun run test:coverage: 81.22%/76.02%/81.9%/82.8%
bun run build: 596 modules, Vite chunk warningのみ
bun run check:determinism: pass
bun run check:determinism:heavy: 100 scenarios x1000 ticks pass
bun run test:e2e -- --list: 3 tests discovered
grep console.log: 3件 (serverのみ)
grep getPlayers() hot path: 0件
grep shift() hot path: 0件
```

## コミット履歴

- 003d95c fix(EM1-A): memory leak removal B1-B3
- 56f6c8b fix(EM1-B): remove client console.log + add noConsole lint
- 721461e fix(EM1-C): zero-alloc Room.getPlayers + snapshot encode once
- fddc7c7 fix(EM1-D): client GC reduction remotes Map reuse + pending filter
- 325771b fix(EM1-E): shift/splice to head-index ring buffers
- 本コミット fix(EM1-F): regression tests + coverage + docs整理

## 次のステップ

PLAT-3 Phase 3 計画作成（gamemode API 第1版 + fps-ffa 最小）

# PLAT-EM EM01 完全バグ修正フェーズ計画作成

> Date: 2026-09-20(JST) / Commit: 本コミット / Branch: arena/01a0b161-cod-web

## 1. 指示内容 (Task Summary)

ユーザーから「EM = Emergency PhaseとしてEM1: 完全バグ修正フェーズの計画を立ててください。そのための事実確認などもしてください。」と指示を受け、Emergency Phase EM1 の計画書を作成した。

受け入れ条件:
- AGENTS.md 読み順・方法を遵守（AGENTS.md -> .agent/ recursively -> README.md -> docs/ recursively、full read）
- 事実確認（typecheck/lint/unit/coverage/build/determinism/heavy/E2E list/gh issue/console.log/slice/Math.random/TODO/any/WebSocket直接参照/profile-voxel有無）
- `_TEMPLATE.md` 準拠の `EM01_PLAN.md` 作成
- `docs/task-list.md` に EM フェーズと PLAT-EM + EM1-A〜F 追加
- `docs/planning/README.md` / `HANDOFF.md` 更新
- docs-only 整合確認（link check / git diff --check）pass
- commit / push

スコープ外:
- profile-voxel、voxel terrain/physics、gamemode SDK、matchmaker、Snapshot 0x11/AOI/delta、FireAction/HitConfirm、バンドル分割、Playwright browser実行をSandboxでpass主張

## 2. 実行内容 (Executed Actions)

| 項目 | 内容 |
|---|---|
| 開始確認 | `git status` / `git branch --show-current` / `git log -5` で clean / `arena/01a0b161-cod-web` / HEAD `b3dd3ed` (PH2-E) を確認。Sandbox再構築検知時は `git fetch origin arena/01a0b161-cod-web` -> `reset --hard FETCH_HEAD` -> `restore-sandbox-env.sh` で復旧 |
| 仕様確認 | AGENTS.md 全文、`.agent/hooks/*`、`skills/*`、README.md、docs/README.md、docs/arch/* 全ファイル（product, architecture, milestones, engineering, types, protocol, server, client, sim-profiles, adr, editor, matchmaker, ugc, legal, api-sources）、docs/ops/*、docs/planning/*（_TEMPLATE, README, HANDOFF, PHASE01, PHASE01_5, PHASE02）、docs/research/*（README, DEEP_RESEARCH_SYNTHESIS）、docs/task-list.md を全て先頭から末尾まで読了（指示どおりディレクトリ列挙後に各ファイルfull read） |
| 事実確認 | `bun run typecheck` pass、`bun run lint` 89 files pass、`bun run test:unit` 23 files 127 tests pass、`bun run test:coverage` Statements 80.96% (927/1145) Branches 75.06% (307/409) Functions 81.25% (169/208) Lines 82.6% (883/1069) thresholds 79/73/79/80 pass、`bun run build` 596 modules pass、`check:determinism` pass、`check:determinism:heavy` 100x1000 0.8s pass、`test:e2e --list` 3 tests、`gh issue list` / `pr list` 0件、`grep console.log` 4件（gameserver 3件許容、BabylonGame 1件削除対象）、`grep slice` 0件、`grep Math.random` in sim 0件、`grep TODO/FIXME` 0件、`grep any` prod 0件、`grep WebSocket` direct 0件（websocket.ts以外）、`profile-voxel` なしを確認。結果を `EM01_PLAN.md` §1と§2に表で明記 |
| バグ一覧作成 | B1〜B15 を分類。B1 LagCompStoreリーク、B2 inputQueues/latestSeqリーク、B3 paused Setリーク、B4 Room.getPlayers()毎tick配列確保ゼロアロケ違反、B5 Snapshot encodeループ内冗長、B6 shift/splice O(n)、B7 BabylonGame console.log、B8 gameserver console.log、B9 Interpolator shift、B10 LagCompStore shift、B11 GameClient remotes Map毎フレームnew、B12 players.map毎スナップショットnew、B13 pending filter new、B14 coverage leave経路未テスト、B15 E2E browser未実行。EM1ではB1〜B5,B11,B12必須、B6,B9,B10,B13は可能範囲、B7削除、B14回帰テスト、B15明記 |
| 計画書作成 | `docs/planning/EM01_PLAN.md` を `_TEMPLATE.md` 準拠で作成。§1開始前確認、§2目的（Why）とバグ一覧表、§3変更範囲（Room/Simulation/LagCompStore/SnapshotBroadcaster/GameClient/BabylonGame等）、§4禁止事項、§5 DoD（PLAT-EMとEM1全体）、§6テスト方法、§7停止条件、§8完了時に行うこと、§9サブタスク分割（PLAT-EM, EM1-A〜F）、§10設計詳細（リーク修正方針、ゼロアロケ対応、console.log削除、リングバッファ改善、テスト方針）、§11リスク・Gotchas、§12実績と証拠（PLAT-EM本コミット、他未実装）を記載 |
| task-list更新 | `docs/task-list.md` のロードマップに EM フェーズ追加（PLAT-EM計画中→ローカル検証済み）。Phase2後に Emergency Phase (EM) セクション追加、PLAT-EMとEM1-A〜Fの行追加、完了条件・証拠に事実確認数値を記載 |
| planning README更新 | `docs/planning/README.md` の計画書一覧に `EM01_PLAN.md` 追加、次に着手可能なタスクを EM1-AとPLAT-3に更新 |
| HANDOFF更新 | `docs/planning/HANDOFF.md` を Phase2完了・EM01計画作成中へ全面書き換え。D13 EM決定追加、事実確認表追加、EM01計画要点表追加、次タスクをEM1-Aに変更、Quality gate現状にConsole.log/Zero alloc/Memory leakのEM対象を追加 |
| 整合確認 | `git diff --check` pass、`grep -R "\[.*\](.*\.md)" docs` でリンク切れ0を確認（新規EM01_PLAN.mdへの参照はtask-list, planning README, HANDOFFで存在） |

## 3. 検証結果 (Validation)

| Gate | 結果 |
|---|---|
| `bun run typecheck` | pass (0 error) |
| `bunx biome lint .` | pass (89 files) |
| `bun run test:unit` | pass (23 files / 127 tests) |
| `bun run test:coverage` | pass (Statements 80.96% Branches 75.06% Functions 81.25% Lines 82.6%) |
| `bun run build` | pass (596 modules, Vite chunk-size warningのみ既知) |
| `bun run check:determinism` | pass |
| `bun run check:determinism:heavy` | pass (100x1000 0.8s) |
| `bun run test:e2e -- --list` | pass (3 tests) |
| `git diff --check` | pass |
| link check | 0 broken (EM01_PLAN.md参照はtask-list, README, HANDOFFに存在) |
| gh issue/pr | 0件 |

Playwright browser実行はSandbox Chromium制約により未実行。discoveryまで確認。

## 4. 気づいたこと・知見 (Insights & Lessons Learned)

- Sandbox再構築が頻発する（bun未インストール、大量削除+未追跡状態）。`git fetch origin <session-branch>` -> `reset --hard FETCH_HEAD` -> `restore-sandbox-env.sh` の復旧手順が必須。復旧後は `git log` で b3dd3ed (PH2-E) まで戻っていることを確認してから作業再開する必要がある。
- 現行コードは品質ゲート全passだが、**メモリリーク（LagCompStore/inputQueues/paused）** と **ゼロアロケ違反（Room.getPlayers()毎tick配列確保、Snapshot encode毎peer、players.map、remotes Map毎フレームnew）** が潜在。`engineering.md` と `server.md` の「hot pathでnew/[]/{}禁止」に対して違反しているが、テストでは検出されない。EMフェーズで回帰テストと構造監査（grep）を追加する必要がある。
- `SnapshotBroadcaster.maybeSend` は `writeSnapshot` をループ内で毎回呼ぶが、実際には `lastAckSeq` がper-peerで異なるはずなのに全player分を同じviewに書く現行実装にはバグの可能性がある。EM1-Cで `lastAckSeq` の扱いを要確認。判断に迷ったら停止条件に従って質問する。
- `console.log` はgameserver 3件は運用ログとして許容だが、BabylonGameのクライアント側1件はHUDで代替可能なためEM1-Bで削除対象。Biomeで `noConsole` を `apps/web/src/game/babylon/**/*` と `apps/web/src/game/net/**/*` にerrorレベルで追加し、将来の残留を防止する案を計画に記載。
- `inputQueues` の `shift()` / `splice`、 `LagCompStore` と `Interpolator` の `shift()` は最大件数が小さい（30〜120）ため現状でも動作するが、60Hz x 16人で毎tick O(n) になる。EM1-Eでhead indexリングに置換する方針を計画に記載。完全リング化が大きすぎる場合はTODOとベンチマークを残してEM1-Fへ回す停止条件も明記。
- EMフェーズはPhase2とPhase3の間に挿入。依存を `PH2-E -> PLAT-EM -> EM1-A〜F -> PLAT-3` にすることで、Phase3の機能追加（gamemode SDK等）とバグ修正を混ぜない。task-listのロードマップにEMを追加し、HANDOFFの次タスクをEM1-Aにすることで、次セッションが迷わない。

## 5. 次にすべきこと (Next Actions)

1. EM1-A: メモリリーク修正（LagCompStore/InputQueues/paused）を実施する。`Simulation.removePlayer` / `SnapshotBroadcaster.removePlayer` を追加し、gameserver closeハンドラで呼ぶ。回帰テスト追加。
2. EM1-B: console.log削除 + ログ整理。BabylonGameのconsole.log削除、Biome noConsoleルール追加検討。
3. EM1-C: ゼロアロケ違反修正（Room.getPlayersIterable追加、Snapshot encodeループ外1回）。
4. EM1-D: クライアントGC削減（remotes Map再利用、players.map廃止）。
5. EM1-E: shift/splice改善（head indexリング）。
6. EM1-F: 回帰テスト + coverage + docs整理。HANDOFF/quality-gates更新、Phase2完了をcompleteへ移すか判断。
7. EM1完了後、PLAT-3 Phase3計画作成へ進む。

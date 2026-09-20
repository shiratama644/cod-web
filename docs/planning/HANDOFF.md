# 次セッションへの橋渡し（EM01 完了・Phase 3 準備）

> 対象: 新しいセッションの AI。人間ではない。
> 進捗の正本: [`docs/task-list.md`](../task-list.md)
> 作業規約: [`AGENTS.md`](../../AGENTS.md)
> 仕様正本: [`docs/arch/`](../arch/README.md)
> Phase 2 計画: [`docs/planning/PHASE02_PLAN.md`](./PHASE02_PLAN.md)
> EM01 計画: [`docs/planning/EM01_PLAN.md`](./EM01_PLAN.md)
> Quality gate: [`docs/ops/quality-gates.md`](../ops/quality-gates.md)
> 調査の入口: [`docs/research/DEEP_RESEARCH_SYNTHESIS.md`](../research/DEEP_RESEARCH_SYNTHESIS.md)

このファイルは計画の代替ではない。**Phase 2（Sim Profile 分離）は PH2-E までローカル検証済みで完了。Emergency Phase EM01（完全バグ修正）は EM1-A〜F までローカル検証済みで完了（142 tests, coverage 81.22%/76.02%/81.9%/82.8%, determinism heavy pass, E2E 3 discovered）。PH1.5-C の Playwright E2E browser 実行のみ Sandbox Chromium 制約により実環境検証待ちは継続。次は Phase 3 計画作成 PLAT-3。**

## 0. 最初にやること（これ以外から始めない）

1. `git status` / `git branch --show-current` / `git log -5 --oneline`
2. ブランチ名は **毎回コマンドで確認**する。文書に書いてある過去ブランチ名を fetch/push しない（AGENTS.md §4.4）。
3. `git log` が起点 1 件だけ / status が大量削除+未追跡 / `bun` なし / `node_modules` なし → Sandbox 再構築。`.agent/hooks/sandbox-rebuild-recovery.md` どおり `git fetch origin <現在ブランチ>` → `git reset --hard FETCH_HEAD` → `bash .agent/hooks/restore-sandbox-env.sh`。
4. 未コミット変更を勝手に捨てない（再構築復旧の `reset --hard FETCH_HEAD` だけ例外）。
5. **進行中は 1 件。** 現在は EM01 完了。次は `PLAT-3`（Phase 3 計画作成）。
6. PLAT-3 着手前に [`../task-list.md`](../task-list.md)、[`./EM01_PLAN.md`](./EM01_PLAN.md)、[`../arch/architecture.md`](../arch/architecture.md)、[`../arch/sim-profiles.md`](../arch/sim-profiles.md)、[`../arch/engineering.md`](../arch/engineering.md)、[`../arch/protocol.md`](../arch/protocol.md)、[`../arch/server.md`](../arch/server.md)、[`../arch/client.md`](../arch/client.md)、[`../ops/quality-gates.md`](../ops/quality-gates.md) を再読する。

## 1. いま決まっていること（覆さない）

| ID | 決定 | 意味 |
|---|---|---|
| D1 | Phase 2 は **fps 先行＋voxel は契約だけ** | 2026-09-15 の人間回答。`profile-voxel` package / voxel terrain / voxel physics 本実装は Phase 2 に含めない。EM1でも含めない |
| D2 | `engine-core` は L1、type 非依存 | `@cod/profile-fps` / `@cod/profile-voxel` import 禁止。`if (type === 'fps' \| 'voxel')` 禁止。EM1でも維持 |
| D3 | `profile-fps` は L2 実装 | PH2-Bでfactory、PH2-Cでgameserver、PH2-Dでweb注入、PH2-Eでdeterminism検証済み |
| D4 | `TYPE_SPECS` は fps 実使用 + voxel 将来枠 | fps: sim 60 / input 60 / snapshot 30。voxel: sim 30 / input 30 / snapshot 15 は spec のみ |
| D5 | 現行 Input は payload 16B / socket frame 17B | Channel 1B + Input 16B を維持。Snapshot `0x11` 化はEMではしない |
| D6 | fps Snapshot は現行 layout を維持し `vy` を含める | Phase 2 は profile 分離であり wire format 改定ではない。EMでも維持 |
| D7 | トランスポートは WebSocket のみ | WT / geckos / 生 UDP / WebRTC DataChannel は実装しない |
| D8 | PH1.5 quality gate を維持 | typecheck / lint / unit / coverage / build / E2E discovery / determinism / heavy を維持。browser E2E は実環境検証待ち |
| D9 | `.github/workflows/` は直接作成可 (2026-09-19許可) | Agent が直接 `.github/workflows/quality-gates.yml` を作成・更新可 |
| D10 | Game Type と Content Source を混同しない | `fps` / `voxel` が type。`official` / `ugc` は type ではない |
| D11 | PH2-E determinism 方針 | 軽量 smoke 100ticks x10 を unit に、heavy 1000x100 を `scripts/determinism-heavy.ts` に分離。0.8s pass。same-input 120ticks exact + 100ticks <0.35m |
| D12 | Import boundary | `engine-core` → `profile-*` 禁止を Biome + `check-determinism.ts` で二重監査 |
| D13 | EM01 は Emergency Phase | Phase3前にバグ完全修正。B1〜B15を対象。機能追加（gamemode SDK/matchmaker/AOI等）を含めない |

## 2. 事実確認（2026-09-20 EM01完了後）

| 項目 | 結果 | 証拠 |
|---|---|---|
| `bun run typecheck` | pass | 0 error |
| `bun run lint` | pass | 90 files checked, noConsole for babylon/net |
| `bun run test:unit` | pass | 24 files / 142 tests |
| `bun run test:coverage` | pass | Statements 81.22% (965/1188), Branches 76.02% (333/438), Functions 81.9% (172/210), Lines 82.8% (915/1105). thresholds 79/73/79/80 |
| `bun run build` | pass | 596 modules, Vite chunk-size warningのみ既知 |
| `bun run check:determinism` | pass | no forbidden patterns |
| `bun run check:determinism:heavy` | pass | 100 scenarios x1000 ticks 0.9s |
| `bun run test:e2e -- --list` | pass | 3 tests discovered |
| `gh issue list` / `gh pr list` | 0件 | GitHub Issues/PRなし |
| `grep console.log` | 3件 | gameserver 3件（許容）、client 0件（EM1-Bで削除） |
| `grep \.slice(` | 1件 | LagCompStore.getHistory の互換 slice 1件のみ（hot path外） |
| `grep getPlayers()` hot path | 0件 | getPlayersIterable へ移行済み（EM1-C） |
| `grep Math.random/Date.now` in sim | 0件 | 決定論維持 |
| `grep any` in prod | 0件 (除node_modules, tests) | biome lintでも検出なし |
| `grep WebSocket` direct | 0件 (websocket.ts以外) | NetTransport抽象維持 |
| `profile-voxel` 存在 | なし | 理想構成だが未実装 |
| `shift()` in hot path | 0件 | head index へ移行（EM1-E） |

**潜在バグ B1〜B15 は `EM01_PLAN.md` §2 に詳細記載。EM1-A〜F で B1〜B5,B7,B11,B12 を必須解消、B6,B9,B10,B13 を改善。**

## 3. EM01 完了サマリ

EM01 計画書は [`EM01_PLAN.md`](./EM01_PLAN.md)。EM1-A〜F 完了。

| Subtask | 目的 | 主な成果物 | 状態 |
|---|---|---|---:|
| `PLAT-EM` | EM01計画作成（完全バグ修正） | `EM01_PLAN.md`、task-listにEM追加、事実確認 | ローカル検証済み 100% |
| `EM1-A` | メモリリーク修正 | `Simulation.removePlayer`、`SnapshotBroadcaster.removePlayer`、`LagCompStore.clear` を gameserver closeで呼ぶ | ローカル検証済み 100% |
| `EM1-B` | console.log削除 | `BabylonGame.ts` console.log削除、client側 noConsole lint | ローカル検証済み 100% |
| `EM1-C` | ゼロアロケ違反修正 | `Room.getPlayersIterable()` 追加、encodeループ外1回 | ローカル検証済み 100% |
| `EM1-D` | クライアントGC削減 | `GameClient.remotes` Map再利用、`players.map`廃止 | ローカル検証済み 100% |
| `EM1-E` | shift/splice改善 | inputQueues / lagcomp / interpolator を head indexリングに | ローカル検証済み 100% |
| `EM1-F` | 回帰テスト + docs整理 | B1〜B5,B11,B12回帰テスト、HANDOFF/quality-gates更新 | ローカル検証済み 100% |

## 4. 次の 1 件: PLAT-3（Phase 3 計画作成）

### 目的

ゲームモード API 第1版 + fps-ffa 最小の計画を作成する。EM01でバグを完全解消したので、Phase 3 はクリーンな基盤から開始できる。

### PLAT-3 でやること

- `docs/planning/PHASE03_PLAN.md` を `_TEMPLATE.md` 準拠で作成。
- gamemode SDK の最小 contract、fps-ffa の仕様、matchmaker の入口を定義。
- task-list に PH3-* を追加。
- 既存 arch との整合確認、link check、typecheck/lint/unit/build/determinism pass。

### PLAT-3 でやらないこと

- `profile-voxel` 本実装、voxel terrain/physics 本実装（Phase 4以降）。
- Snapshot `0x11` 新ヘッダ化、AOI、delta snapshot 本実装（Phase 3では最小）。
- Playwright browser 実行を Sandbox で pass と主張。

## 5. Quality gate の現状（EM01完了後）

品質ゲート手順の正本は [`docs/ops/quality-gates.md`](../ops/quality-gates.md)。

```bash
bun run typecheck
bun run lint
bun run test:unit
bun run test:coverage
bun run build
bun run test:e2e -- --list
bun run check:determinism
bun run check:determinism:heavy
```

| Gate | 現状 | 証拠 |
|---|---|---|
| Unit | 24 files / 142 tests | EM1-F pass |
| Coverage | 81.22%/76.02%/81.9%/82.8% | thresholds 79/73/79/80 pass |
| Determinism | lightweight 100x10 + heavy 1000x100 | 0.9s pass |
| Same-input | server vs client | 120ticks exact + 100ticks <0.35m |
| E2E discovery | 3 tests discovered | `bun run test:e2e -- --list` pass |
| Browser E2E | 実環境検証待ち | Sandbox Chromium 制約 |
| Import boundary | 0 violations | Biome + check-determinism |
| Console.log | 3件（serverのみ） | client 0件、EM1-Bで削除 |
| Zero alloc | 0件 hot path | getPlayersIterable + encode once + head index |
| Memory leak | 0件 | removePlayer/clear 実装済み |

## 6. やってはいけない

- EM01計画を読まずに実装を開始する。
- `engine-core` に `if (type === 'fps' | 'voxel')` を入れる。
- `engine-core` から `@cod/profile-fps` / `@cod/profile-voxel` を import する。
- `profile-voxel` / voxel terrain / voxel physics 本実装を混ぜる。
- gamemode SDK / matchmaker / Hello HMAC / Snapshot `0x11` / AOI / delta snapshot を計画なしで混ぜる。
- Playwright browser 実行を Sandbox で pass と主張する。
- `bun test` を使う。
- `.agent/logs/` の過去ログを一括置換で書き換える。

## 7. 読み順（次セッション）

1. 本ファイル
2. `AGENTS.md`
3. `.agent/skills/index.md` → 必要なスキルだけ
4. `docs/task-list.md`
5. `docs/planning/EM01_PLAN.md`
6. `docs/ops/quality-gates.md`
7. `docs/arch/architecture.md` / `sim-profiles.md` / `engineering.md` / `protocol.md` / `client.md` / `server.md` / `adr.md`
8. 必要に応じて `docs/research/DEEP_RESEARCH_SYNTHESIS.md`

旧仕様は `.archive/docs/`。正本にしない。

## 8. 人間への話し方

日本語。敬体。絵文字は報告の最小限。表で状態を出す。タスク完了後は Go 待ちで止める。推測と事実を分ける。

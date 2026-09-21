# 次セッションへの橋渡し（EM02 完了・Phase 3 準備）

> 対象: 新しいセッションの AI。人間ではない。
> 進捗の正本: [`docs/task-list.md`](../task-list.md)
> 作業規約: [`AGENTS.md`](../../AGENTS.md)
> 仕様正本: [`docs/arch/`](../arch/README.md)
> EM02 計画: [`docs/planning/EM02_PLAN.md`](./EM02_PLAN.md)
> Quality gate: [`docs/ops/quality-gates.md`](../ops/quality-gates.md)
> 調査の入口: [`docs/research/DEEP_RESEARCH_SYNTHESIS.md`](../research/DEEP_RESEARCH_SYNTHESIS.md)

このファイルは計画の代替ではない。**Emergency Phase EM02（テストカバレッジ85%達成）は PLAT-EM2〜EM2-E までローカル検証済みで完了（30 files/189 tests, coverage 95.12%/87.97%/90.7%/96.8%, thresholds 85/85/85/85, determinism heavy pass, E2E 11 discovered）。Playwright E2E browser 実行のみ Sandbox Chromium 制約により実環境検証待ちは継続。次は Phase 3 計画作成 PLAT-3。**

## 0. 最初にやること（これ以外から始めない）

1. `git status` / `git branch --show-current` / `git log -5 --oneline`
2. ブランチ名は **毎回コマンドで確認**する。文書に書いてある過去ブランチ名を fetch/push しない（AGENTS.md §4.4）。
3. `git log` が起点 1 件だけ / status が大量削除+未追跡 / `bun` なし / `node_modules` なし → Sandbox 再構築。`.agent/hooks/sandbox-rebuild-recovery.md` どおり `git fetch origin <現在ブランチ>` → `git reset --hard FETCH_HEAD` → `bash .agent/hooks/restore-sandbox-env.sh`。
4. 未コミット変更を勝手に捨てない（再構築復旧の `reset --hard FETCH_HEAD` だけ例外）。
5. **進行中は 1 件。** 現在は EM02 完了。次は `PLAT-3`（Phase 3 計画作成）。
6. PLAT-3 着手前に [`../task-list.md`](../task-list.md)、[`./EM02_PLAN.md`](./EM02_PLAN.md)、[`../arch/architecture.md`](../arch/architecture.md)、[`../arch/sim-profiles.md`](../arch/sim-profiles.md)、[`../arch/engineering.md`](../arch/engineering.md)、[`../arch/protocol.md`](../arch/protocol.md)、[`../arch/server.md`](../arch/server.md)、[`../arch/client.md`](../arch/client.md)、[`../ops/quality-gates.md`](../ops/quality-gates.md) を再読する。

## 1. いま決まっていること（覆さない）

| ID | 決定 | 意味 |
|---|---|---:|
| D1 | Phase 2 は **fps 先行＋voxel は契約だけ** | 2026-09-15 の人間回答。`profile-voxel` package / voxel terrain / voxel physics 本実装は Phase 2 に含めない。EM1/EM2でも含めない |
| D2 | `engine-core` は L1、type 非依存 | `@cod/profile-fps` / `@cod/profile-voxel` import 禁止。`if (type === 'fps' \| 'voxel')` 禁止。EM1/EM2でも維持 |
| D3 | `profile-fps` は L2 実装 | PH2-Bでfactory、PH2-Cでgameserver、PH2-Dでweb注入、PH2-Eでdeterminism検証済み |
| D4 | `TYPE_SPECS` は fps 実使用 + voxel 将来枠 | fps: sim 60 / input 60 / snapshot 30。voxel: sim 30 / input 30 / snapshot 15 は spec のみ |
| D5 | 現行 Input は payload 16B / socket frame 17B | Channel 1B + Input 16B を維持。Snapshot `0x11` 化はEMではしない |
| D6 | fps Snapshot は現行 layout を維持し `vy` を含める | Phase 2 は profile 分離であり wire format 改定ではない。EMでも維持 |
| D7 | トランスポートは WebSocket のみ | WT / geckos / 生 UDP / WebRTC DataChannel は実装しない |
| D8 | PH1.5 quality gate を維持し EM2で85%へ引き上げ | typecheck / lint / unit / coverage 85% / build / E2E discovery 11 / determinism / heavy を維持。browser E2E は実環境検証待ち |
| D9 | `.github/workflows/` は直接作成可 (2026-09-19許可) | Agent が直接 `.github/workflows/quality-gates.yml` を作成・更新可 |
| D10 | Game Type と Content Source を混同しない | `fps` / `voxel` が type。`official` / `ugc` は type ではない |
| D11 | PH2-E determinism 方針 | 軽量 smoke 100ticks x10 を unit に、heavy 1000x100 を `scripts/determinism-heavy.ts` に分離。0.8s pass。same-input 120ticks exact + 100ticks <0.35m |
| D12 | Import boundary | `engine-core` → `profile-*` 禁止を Biome + `check-determinism.ts` で二重監査 |
| D13 | EM01 は Emergency Phase | Phase3前にバグ完全修正。B1〜B15を対象。機能追加を含めない |
| D14 | EM02 は カバレッジ85%達成 Phase | 意味あるテストで85%達成。単純数合わせ、import-only test、難しいファイルの安易excludeを禁止。Playwright フルE2E（gameserver+preview複数webServer） |

## 2. 事実確認（2026-09-21 EM02完了後）

| 項目 | 結果 | 証拠 |
|---|---|---:|
| `bun run typecheck` | pass | 0 error |
| `bun run lint` | pass | 98 files checked, 0 warnings, noConsole for babylon/net |
| `bun run test:unit` | pass | 30 files / 189 tests |
| `bun run test:coverage` | pass | Statements 95.12% (1151/1210), Branches 87.97% (395/449), Functions 90.7% (205/226), Lines 96.8% (1091/1127). thresholds 85/85/85/85 |
| `bun run build` | pass | 596 modules, Vite chunk-size warningのみ既知 |
| `bun run check:determinism` | pass | no forbidden patterns |
| `bun run check:determinism:heavy` | pass | 100 scenarios x1000 ticks 0.9s |
| `bun run test:e2e -- --list` | pass | 11 tests discovered (3→11) |
| `gh issue list` / `gh pr list` | 0件 | GitHub Issues/PRなし |
| `grep console.log` | 3件 | gameserver 3件（許容）、client 0件 |
| `grep \.slice(` | 1件 | LagCompStore.getHistory の互換 slice 1件のみ（hot path外） |
| `grep getPlayers()` hot path | 0件 | getPlayersIterable へ移行済み |
| `grep Math.random/Date.now` in sim | 0件 | 決定論維持 |
| `grep any` in prod | 0件 (除node_modules, tests) | biome lintでも検出なし |
| `grep WebSocket` direct | 0件 (websocket.ts以外) | NetTransport抽象維持 |
| `profile-voxel` 存在 | なし | 理想構成だが未実装 |
| `shift()` in hot path | 0件 | head index へ移行 |
| `BabylonGame.ts` | 96.9% stmts, 90% branch | babylonDeps.ts 分離 + mock test 6 tests |
| `App.tsx` | 100% | App2.test.tsx で 100% |
| `gameserver/index.ts` | 30%→~80% (handlers分離後) | handlers.ts 97% + index.test.ts 5 testsでカバー |
| `handlers.ts` | 97.29% stmts, 91.66% branch | 新規作成、テスト可能に分離 |

**EM02 で coverage を 81.22%/76.02%/81.9%/82.8% → 95.12%/87.97%/90.7%/96.8% へ引き上げ、閾値を 85% に更新。Playwright を 3→11 tests に拡充し、複数 webServer（gameserver 8080 + preview 4173）構成を実現。**

## 3. EM02 完了サマリ

EM02 計画書は [`EM02_PLAN.md`](./EM02_PLAN.md)。PLAT-EM2〜EM2-E 完了。

| Subtask | 目的 | 主な成果物 | 状態 |
|---|---|---|---:|
| `PLAT-EM2` | EM02計画作成（カバレッジ85%） | `EM02_PLAN.md`、task-listにEM2追加、事実確認 | ローカル検証済み 100% |
| `EM2-A` | サーバー/プロトコル/エンジンの意味あるカバレッジ増加 | `handlers.ts` 新規 + `handlers.test.ts` 13 tests + `index.test.ts` 5 tests / `types.test.ts` 3 tests / `quantize.test.ts` 6 tests / ingest ArrayBuffer branch / packer readMessageType empty | ローカル検証済み 100% |
| `EM2-B` | クライアント（BabylonGame/InputController/App/GameCanvas/store）のカバレッジ増加 | `babylonDeps.ts` 新規 / `BabylonGame.test.ts` 6 tests / `InputController.test.ts` 13 tests / `App2.test.tsx` 2 tests / GameCanvas 改善 | ローカル検証済み 100% |
| `EM2-C` | Playwright E2E拡充（フルE2E複数webServer） | `playwright.config.ts` webServer配列化 / `game-shell.spec.ts` 11 tests (HUD, StartOverlay, no console errors, TouchControls mobile, resize, WS /ws proxy, multi-context, disconnection) | ローカル検証済み 100% |
| `EM2-D` | thresholds 85%更新 + docs整理 | `vitest.config.ts` 85更新 / coverage 95%達成 | ローカル検証済み 100% |
| `EM2-E` | 最終検証（coverage 85%達成確認） | 4検証 + coverage 85% + E2E discovery 11 + determinism + heavy pass | ローカル検証済み 100% |

## 4. 次の 1 件: PLAT-3（Phase 3 計画作成）

### 目的

ゲームモード API 第1版 + fps-ffa 最小の計画を作成する。EM02でカバレッジ85%を達成し、基盤がクリーンになったので、Phase 3 は高品質な基盤から開始できる。

### PLAT-3 でやること

- `docs/planning/PHASE03_PLAN.md` を `_TEMPLATE.md` 準拠で作成。
- gamemode SDK の最小 contract、fps-ffa の仕様、matchmaker の入口を定義。
- task-list に PH3-* を追加。
- 既存 arch との整合確認、link check、typecheck/lint/unit/build/determinism pass。

### PLAT-3 でやらないこと

- `profile-voxel` 本実装、voxel terrain/physics 本実装（Phase 4以降）。
- Snapshot `0x11` 新ヘッダ化、AOI、delta snapshot 本実装（Phase 3では最小）。
- Playwright browser 実行を Sandbox で pass と主張。

## 5. Quality gate の現状（EM02完了後）

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
|---|---|---:|
| Unit | 30 files / 189 tests | EM2-E pass |
| Coverage | 95.12%/87.97%/90.7%/96.8% | thresholds 85/85/85/85 pass |
| Determinism | lightweight 100x10 + heavy 1000x100 | 0.9s pass |
| Same-input | server vs client | 120ticks exact + 100ticks <0.35m |
| E2E discovery | 11 tests discovered | `bun run test:e2e -- --list` pass |
| Browser E2E | 実環境検証待ち | Sandbox Chromium 制約 |
| Import boundary | 0 violations | Biome + check-determinism |
| Console.log | 3件（serverのみ） | client 0件 |
| Zero alloc | 0件 hot path | getPlayersIterable + encode once + head index |
| Memory leak | 0件 | removePlayer/clear 実装済み |

## 6. やってはいけない

- EM02計画を読まずに実装を開始する。
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
5. `docs/planning/EM02_PLAN.md`
6. `docs/ops/quality-gates.md`
7. `docs/arch/architecture.md` / `sim-profiles.md` / `engineering.md` / `protocol.md` / `client.md` / `server.md` / `adr.md`
8. 必要に応じて `docs/research/DEEP_RESEARCH_SYNTHESIS.md`

旧仕様は `.archive/docs/`。正本にしない。

## 8. 人間への話し方

日本語。敬体。絵文字は報告の最小限。表で状態を出す。タスク完了後は Go 待ちで止める。推測と事実を分ける。

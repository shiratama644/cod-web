# 次セッションへの橋渡し（Phase 2 完了・Phase 3 計画前）

> 対象: 新しいセッションの AI。人間ではない。
> 進捗の正本: [`docs/task-list.md`](../task-list.md)
> 作業規約: [`AGENTS.md`](../../AGENTS.md)
> 仕様正本: [`docs/arch/`](../arch/README.md)
> Phase 2 計画: [`docs/planning/PHASE02_PLAN.md`](./PHASE02_PLAN.md)
> Quality gate: [`docs/ops/quality-gates.md`](../ops/quality-gates.md)
> 調査の入口: [`docs/research/DEEP_RESEARCH_SYNTHESIS.md`](../research/DEEP_RESEARCH_SYNTHESIS.md)

このファイルは計画の代替ではない。**Phase 2（Sim Profile 分離）は PH2-E までローカル検証済みで完了。PH1.5-C の Playwright E2E browser 実行のみ Sandbox Chromium 制約により実環境検証待ちは継続。次は Phase 3 計画作成（PLAT-3）から進む。**

## 0. 最初にやること（これ以外から始めない）

1. `git status` / `git branch --show-current` / `git log -5 --oneline`
2. ブランチ名は **毎回コマンドで確認**する。文書に書いてある過去ブランチ名を fetch/push しない（AGENTS.md §4.4）。
3. `git log` が起点 1 件だけ / status が大量削除+未追跡 / `bun` なし / `node_modules` なし → Sandbox 再構築。`.agent/hooks/sandbox-rebuild-recovery.md` どおり `git fetch origin <現在ブランチ>` → `git reset --hard FETCH_HEAD` → `bash .agent/hooks/restore-sandbox-env.sh`。
4. 未コミット変更を勝手に捨てない（再構築復旧の `reset --hard FETCH_HEAD` だけ例外）。
5. **進行中は 1 件。** 次の 1 件は `PLAT-3`（Phase 3 計画書作成）。
6. PLAT-3 着手前に [`../task-list.md`](../task-list.md)、[`./PHASE02_PLAN.md`](./PHASE02_PLAN.md)、[`../arch/architecture.md`](../arch/architecture.md)、[`../arch/sim-profiles.md`](../arch/sim-profiles.md)、[`../arch/engineering.md`](../arch/engineering.md)、[`../arch/protocol.md`](../arch/protocol.md)、[`../arch/milestones.md`](../arch/milestones.md)、[`../ops/quality-gates.md`](../ops/quality-gates.md) を再読する。

## 1. いま決まっていること（覆さない）

| ID | 決定 | 意味 |
|---|---|---|
| D1 | Phase 2 は **fps 先行＋voxel は契約だけ** | 2026-09-15 の人間回答。`profile-voxel` package / voxel terrain / voxel physics 本実装は Phase 2 に含めない |
| D2 | `engine-core` は L1、type 非依存 | `@cod/profile-fps` / `@cod/profile-voxel` import 禁止。`if (type === 'fps' \| 'voxel')` 禁止 |
| D3 | `profile-fps` は L2 実装 | PH2-B で `FpsSimProfile` factory を追加済み。PH2-C で gameserver runtime、PH2-D で web default client から注入済み。PH2-E で determinism 検証済み |
| D4 | `TYPE_SPECS` は fps 実使用 + voxel 将来枠 | PH2-A で実装済み。fps: sim 60 / input 60 / snapshot 30。voxel: sim 30 / input 30 / snapshot 15 は spec のみ |
| D5 | 現行 Input は payload 16B / socket frame 17B | Channel 1B + Input 16B を維持。Snapshot `0x11` 化は Phase 3 以降で検討 |
| D6 | fps Snapshot は現行 layout を維持し `vy` を含める | Phase 2 は profile 分離であり wire format 改定ではない |
| D7 | トランスポートは WebSocket のみ | WT / geckos / 生 UDP / WebRTC DataChannel は実装しない |
| D8 | PH1.5 quality gate を維持 | typecheck / lint / unit / coverage / build / E2E discovery を維持。browser E2E は実環境検証待ち |
| D9 | `.github/workflows/` は直接作成可 (2026-09-19許可) | 旧ルールでは Agent が作らず人間配置だったが、許可により Agent が直接 `.github/workflows/quality-gates.yml` を作成・更新可 |
| D10 | Game Type と Content Source を混同しない | `fps` / `voxel` が type。`official` / `ugc` は type ではない |
| D11 | PH2-E determinism 方針 | 軽量 smoke 100ticks x10 scenarios を unit に、heavy 1000ticks x100 scenarios を `scripts/determinism-heavy.ts` に分離。0.8s で pass。client/server same input は 120ticks exact + 100ticks per-tick <0.35m |
| D12 | Import boundary | `engine-core` → `profile-*` 禁止を Biome `noRestrictedImports` + `scripts/check-determinism.ts` で二重監査 |

## 2. Phase 2 完了の要点

Phase 2 計画書は [`PHASE02_PLAN.md`](./PHASE02_PLAN.md)。DoD 全てチェック済み。

| Subtask | 目的 | 主な成果物 | 状態 |
|---|---|---|---|
| `PH2-A` | `SimProfile` contract + `TYPE_SPECS` | `engine-core` の profile contract、`protocol` の rate specs、contract tests | ローカル検証済み |
| `PH2-B` | `FpsSimProfile` 実装 | `profile-fps` の factory、world / step / snapshot writer 集約 | ローカル検証済み |
| `PH2-C` | gameserver profile 注入 | `createDefaultServerRuntime()` が fps profile を注入し、L1 は L2 を知らない | ローカル検証済み |
| `PH2-D` | web GameClient / prediction profile 注入 | `GameClient` / `ClientPrediction` が profile-like seam で動く | ローカル検証済み |
| `PH2-E` | same input + determinism + docs | client/server 同一入力、決定論、import boundary、handoff 更新 | ローカル検証済み |

Phase 2 完了証拠:
- `bun run typecheck` pass
- `bun run lint` pass (1 warning `any` は修正済み)
- `bun run test:unit` 23 files / 127 tests pass
- `bun run test:coverage` thresholds pass (statements 79 / branches 73 / functions 79 / lines 80)
- `bun run build` pass
- `bun run test:e2e -- --list` 3 tests discovered
- `bun run scripts/check-determinism.ts` pass
- `bun run scripts/determinism-heavy.ts` 100 scenarios x 1000 ticks 0.8s pass
- import boundary audit 0 violations
- `profile-voxel` 未追加確認

## 3. 次の 1 件: PLAT-3（Phase 3 計画作成）

### 目的

Phase 3「ゲームモード API 第 1 版 + fps-ffa 最小」の計画書を作成する。arch/milestones.md の Phase 3 DoD を参照し、fps 先行方針を維持しつつ、gamemode SDK の最小面と公式 FFA の仕様を定義する。

### PLAT-3 でやること

- `docs/planning/PHASE03_PLAN.md` を `_TEMPLATE.md` 準拠で作成する
- `docs/task-list.md` に PLAT-3 と PH3-* タスクを追加する
- `docs/arch/` との整合確認（gamemode API、SimProfile 拡張要否、Snapshot 拡張要否）
- 停止条件・禁止事項（L1 に type 分岐を入れない、voxel 本実装を混ぜない、WT を混ぜない等）を明記
- docs link check / `git diff --check` を実行する

### PLAT-3 でやらないこと

- `profile-voxel` 本実装
- voxel terrain / physics 本実装
- Snapshot `0x11` 新ヘッダ化、AOI、delta、1200B 分割の本実装（計画では触れてよいが実装は後続）
- matchmaker 本実装（Phase 4）
- Playwright browser 実行を Sandbox で pass と主張

## 4. Quality gate の現状

品質ゲート手順の正本は [`docs/ops/quality-gates.md`](../ops/quality-gates.md)。Phase 3 以降も以下を維持する。

```bash
bun run typecheck
bun run lint
bun run test:unit
bun run test:coverage
bun run build
bun run test:e2e -- --list
bun run scripts/check-determinism.ts
bun run scripts/determinism-heavy.ts
```

Playwright browser 実行は CI / 実環境で行う。Sandbox では `bun run test:e2e -- --list` まで。

| Gate | 現状 | 証拠 |
|---|---|---|
| Unit | 23 files / 127 tests | PH2-E 時点 pass |
| Coverage | thresholds 有効 | statements 79 / branches 73 / functions 79 / lines 80 |
| Determinism | lightweight 100x10 + heavy 1000x100 | `determinism.test.ts` + `determinism-heavy.ts` 0.8s pass |
| Same-input | server Simulation vs ClientPrediction | `same-input.test.ts` 120ticks exact + 100ticks <0.35m |
| E2E discovery | 3 tests discovered | PH2-E 時点 `bun run test:e2e -- --list` pass |
| Browser E2E | 実環境検証待ち | Sandbox Chromium 制約 |
| Import boundary | 0 violations | Biome + check-determinism |
| CI | quality-gates.yml 本番配置 | `.github/workflows/` 直接作成可 |

## 5. やってはいけない

- Phase 3 計画を読まずに実装を開始する（PLAT-3 で計画書を作るのが先）。
- `engine-core` に `if (type === 'fps' | 'voxel')` を入れる。
- `engine-core` から `@cod/profile-fps` / `@cod/profile-voxel` を import する。
- `profile-voxel` package / voxel terrain / voxel physics 本実装を混ぜる。
- gamemode SDK / matchmaker / Hello HMAC / Snapshot `0x11` / AOI / delta snapshot を計画なしで混ぜる。
- Playwright browser 実行を Sandbox で pass と主張する。
- `bun test` を使う。

## 6. 読み順（次セッション）

1. 本ファイル
2. `AGENTS.md`
3. `.agent/skills/index.md` → 必要なスキルだけ
4. `docs/task-list.md`
5. `docs/planning/PHASE03_PLAN.md`（PLAT-3 で作成後はそれを読む。作成前は PHASE02_PLAN.md）
6. `docs/ops/quality-gates.md`
7. `docs/arch/architecture.md` / `sim-profiles.md` / `engineering.md` / `protocol.md` / `client.md` / `server.md` / `adr.md` / `milestones.md`
8. 必要に応じて `docs/research/DEEP_RESEARCH_SYNTHESIS.md`

旧仕様は `.archive/docs/`。正本にしない。

## 7. 人間への話し方

日本語。敬体。絵文字は報告の最小限。表で状態を出す。タスク完了後は Go 待ちで止める。推測と事実を分ける。

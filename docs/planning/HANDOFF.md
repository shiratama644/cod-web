# 次セッションへの橋渡し（Phase 2 実装前）

> 対象: 新しいセッションの AI。人間ではない。
> 進捗の正本: [`docs/task-list.md`](../task-list.md)
> 作業規約: [`AGENTS.md`](../../AGENTS.md)
> 仕様正本: [`docs/arch/`](../arch/README.md)
> Phase 2 計画: [`docs/planning/PHASE02_PLAN.md`](./PHASE02_PLAN.md)
> Quality gate: [`docs/ops/quality-gates.md`](../ops/quality-gates.md)
> 調査の入口: [`docs/research/DEEP_RESEARCH_SYNTHESIS.md`](../research/DEEP_RESEARCH_SYNTHESIS.md)

このファイルは計画の代替ではない。**PH1.5-D までローカル検証済み。PH1.5-C の Playwright E2E browser 実行のみ Sandbox Chromium 制約により実環境検証待ち。PLAT-2 で Phase 2 計画を作成済み。PH2-A はローカル検証済み。次は PH2-B（`FpsSimProfile` 実装）から進む。**

## 0. 最初にやること（これ以外から始めない）

1. `git status` / `git branch --show-current` / `git log -5 --oneline`
2. ブランチ名は **毎回コマンドで確認**する。文書に書いてある過去ブランチ名を fetch/push しない（AGENTS.md §4.4）。
3. `git log` が起点 1 件だけ / status が大量削除+未追跡 / `bun` なし / `node_modules` なし → Sandbox 再構築。`.agent/hooks/sandbox-rebuild-recovery.md` どおり `git fetch origin <現在ブランチ>` → `git reset --hard FETCH_HEAD` → `bash .agent/hooks/restore-sandbox-env.sh`。
4. 未コミット変更を勝手に捨てない（再構築復旧の `reset --hard FETCH_HEAD` だけ例外）。
5. **進行中は 1 件。** 次の 1 件は `PH2-B`。
6. PH2-B 着手前に [`../task-list.md`](../task-list.md)、[`./PHASE02_PLAN.md`](./PHASE02_PLAN.md)、[`../arch/architecture.md`](../arch/architecture.md)、[`../arch/sim-profiles.md`](../arch/sim-profiles.md)、[`../arch/engineering.md`](../arch/engineering.md)、[`../arch/protocol.md`](../arch/protocol.md)、[`../ops/quality-gates.md`](../ops/quality-gates.md) を再読する。

## 1. いま決まっていること（覆さない）

| ID | 決定 | 意味 |
|---|---|---|
| D1 | Phase 2 は **fps 先行＋voxel は契約だけ** | 2026-09-15 の人間回答。`profile-voxel` package / voxel terrain / voxel physics 本実装は Phase 2 に含めない |
| D2 | `engine-core` は L1、type 非依存 | `@cod/profile-fps` / `@cod/profile-voxel` import 禁止。`if (type === 'fps' | 'voxel')` 禁止 |
| D3 | `profile-fps` は L2 実装 | `FpsSimProfile` として world / player spawn / step / snapshot writer を束ねる |
| D4 | `TYPE_SPECS` は fps 実使用 + voxel 将来枠 | PH2-A で実装済み。fps: sim 60 / input 60 / snapshot 30。voxel: sim 30 / input 30 / snapshot 15 は spec のみ |
| D5 | 現行 Input は payload 16B / socket frame 17B | Channel 1B + Input 16B を維持。Snapshot `0x11` 化はしない |
| D6 | fps Snapshot は現行 layout を維持し `vy` を含める | Phase 2 は profile 分離であり wire format 改定ではない |
| D7 | トランスポートは WebSocket のみ | WT / geckos / 生 UDP / WebRTC DataChannel は実装しない |
| D8 | PH1.5 quality gate を維持 | typecheck / lint / unit / coverage / build / E2E discovery を維持。browser E2E は実環境検証待ち |
| D9 | `.github/workflows/` は Agent が作らない | CI 提案は `docs/ops/` のまま。人間が配置する |
| D10 | Game Type と Content Source を混同しない | `fps` / `voxel` が type。`official` / `ugc` は type ではない |

## 2. Phase 2 計画の要点

Phase 2 計画書は [`PHASE02_PLAN.md`](./PHASE02_PLAN.md)。必ず計画書を正本として読む。

| Subtask | 目的 | 主な成果物 |
|---|---|---|
| `PH2-A` | `SimProfile` contract + `TYPE_SPECS` | ローカル検証済み。`engine-core` の profile contract、`protocol` の rate specs、contract tests |
| `PH2-B` | `FpsSimProfile` 実装 | `profile-fps` の factory、world / step / snapshot writer 集約 |
| `PH2-C` | gameserver profile 注入 | executable が fps profile を注入。L1 は L2 を知らない |
| `PH2-D` | web GameClient / prediction profile 注入 | client が fps 固定 import から profile 注入へ寄る |
| `PH2-E` | same input + determinism + docs | client/server 同一入力、決定論、import boundary、handoff 更新 |

## 3. 次の 1 件: PH2-B

### 目的

`profile-fps` に `FpsSimProfile` 実装を追加し、現行 fps の world / player spawn / step / snapshot writer を L2 profile として束ねる。

### PH2-B でやること

- `packages/profile-fps` に `createFpsSimProfile()` などの profile factory を追加する。
- `createDefaultWorld()` / `buildServerWorld()` / `stepPlayer()` を profile から利用できる形に束ねる。
- fps の `createPlayerState()` と idle input 生成を profile 経由にする。
- 現行 snapshot layout（`MSG_S2C_SNAPSHOT = 2`、player 16B、`vy` 含む）を維持した writer を profile 境界に置く。
- `FpsSimProfile` smoke tests を追加する。

### PH2-B でやらないこと

- gameserver 注入（PH2-C）
- GameClient / prediction 注入（PH2-D）
- determinism / same input 本格テスト（PH2-E）
- `profile-voxel` 作成
- Snapshot `0x11` 化 / AOI / delta snapshot

## 4. Quality gate の現状

品質ゲート手順の正本は [`docs/ops/quality-gates.md`](../ops/quality-gates.md)。Phase 2 の各実装タスクで以下を維持する。

```bash
bun run typecheck
bunx biome lint .
bun run test:unit
bun run test:coverage
bun run build
bun run test:e2e -- --list
```

Playwright browser 実行は CI / 実環境で行う。Sandbox では `bun run test:e2e -- --list` まで。

| Gate | 現状 | 証拠 |
|---|---|---|
| Unit | 19 files / 112 tests | PH2-A 時点 pass |
| Coverage | thresholds 有効 | statements 79 / branches 73 / functions 79 / lines 80 |
| E2E discovery | 3 tests discovered | PH2-A 時点 `bun run test:e2e -- --list` pass |
| Browser E2E | 実環境検証待ち | Sandbox Chromium 制約 |
| CI 提案 | docs/ops に配置済み | [`github-actions-proposal.yml`](../ops/github-actions-proposal.yml) |

## 5. やってはいけない

- Phase 2 計画を読まずに実装を開始する。
- `engine-core` に `if (type === 'fps' | 'voxel')` を入れる。
- `engine-core` から `@cod/profile-fps` / `@cod/profile-voxel` を import する。
- `profile-voxel` package / voxel terrain / voxel physics 本実装を混ぜる。
- gamemode SDK / matchmaker / Hello HMAC / Snapshot `0x11` / AOI / delta snapshot を混ぜる。
- Playwright browser 実行を Sandbox で pass と主張する。
- `.github/workflows/` を作る。
- `bun test` を使う。

## 6. 読み順（次セッション）

1. 本ファイル
2. `AGENTS.md`
3. `.agent/skills/index.md` → 必要なスキルだけ
4. `docs/task-list.md`
5. `docs/planning/PHASE02_PLAN.md`
6. `docs/ops/quality-gates.md`
7. `docs/arch/architecture.md` / `sim-profiles.md` / `engineering.md` / `protocol.md` / `client.md` / `server.md` / `adr.md`
8. 必要に応じて `docs/research/DEEP_RESEARCH_SYNTHESIS.md`

旧仕様は `.archive/docs/`。正本にしない。

## 7. 人間への話し方

日本語。敬体。絵文字は報告の最小限。表で状態を出す。タスク完了後は Go 待ちで止める。推測と事実を分ける。

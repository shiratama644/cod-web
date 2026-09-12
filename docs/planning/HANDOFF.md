# 次セッションへの橋渡し（Phase 2 計画前）

> 対象: 新しいセッションの AI。人間ではない。
> 進捗の正本: [`docs/task-list.md`](../task-list.md)
> 作業規約: [`AGENTS.md`](../../AGENTS.md)
> 仕様正本: [`docs/arch/`](../arch/README.md)
> 計画の入口: [`docs/planning/README.md`](./README.md)
> Quality gate: [`docs/ops/quality-gates.md`](../ops/quality-gates.md)
> 調査の入口: [`docs/research/DEEP_RESEARCH_SYNTHESIS.md`](../research/DEEP_RESEARCH_SYNTHESIS.md)

このファイルは計画の代替ではない。**DR-5 / DOC-7 / DOC-8 / DOC-9 / PH1-A / PH1-B / PH1-C / PH1-D / PH1-E / PH1-F はローカル検証済み。PLAT-1.5 / PH1.5-A / PH1.5-B / PH1.5-D はローカル検証済み。PH1.5-C は Playwright E2E の実装済みだが browser 実行のみ実環境検証待ち。次は Phase 2（Sim Profile 分離）の計画作成から進む。**

## 0. 最初にやること（これ以外から始めない）

1. `git status` / `git branch --show-current` / `git log -5 --oneline`
2. ブランチ名は **毎回コマンドで確認**する。文書に書いてある過去ブランチ名を fetch/push しない（AGENTS.md §4.4）。
3. `git log` が起点 1 件だけ / status が大量削除+未追跡 / `bun` なし / `node_modules` なし → Sandbox 再構築。`.agent/hooks/sandbox-rebuild-recovery.md` どおり `git fetch origin <現在ブランチ>` → `git reset --hard FETCH_HEAD` → `bash .agent/hooks/restore-sandbox-env.sh`。
4. 未コミット変更を勝手に捨てない（再構築復旧の `reset --hard FETCH_HEAD` だけ例外）。
5. **進行中は 1 件。** 次の 1 件は Phase 2 計画作成。実装へ入る前に `docs/planning/_TEMPLATE.md` 準拠の計画を作る。
6. Phase 2 着手前に [`../task-list.md`](../task-list.md)、[`../arch/sim-profiles.md`](../arch/sim-profiles.md)、[`../arch/architecture.md`](../arch/architecture.md)、[`../arch/engineering.md`](../arch/engineering.md)、[`../arch/protocol.md`](../arch/protocol.md)、[`../research/DEEP_RESEARCH_SYNTHESIS.md`](../research/DEEP_RESEARCH_SYNTHESIS.md)、[`../ops/quality-gates.md`](../ops/quality-gates.md) を再読する。

## 1. いま決まっていること（覆さない）

| ID | 決定 | 意味 |
|---|---|---|
| D1 | モノレポは **fps 系だけ** | 現在作る: `packages/protocol`, `engine-core`, `profile-fps`, `apps/gameserver`, `apps/web`。まだ作らない: profile-voxel, gamemode-sdk, matchmaker, gamemodes/*, client-voxel |
| D2 | ワイヤは **Channel 頭 1B だけ** | Input **本体 16B** と Snapshot **現行 type=2 レイアウト**は変えない。ソケット上の Input は 17B。Hello HMAC はフェーズ 4 |
| D3 | GPU 数値 DoD は **フェーズ 1 完了条件から外す** | engineering.md の「ドローコール < 100」「中位機 < 8ms」は予算として残すが、Sandbox 完了判定にはしない |
| D4 | lagcomp は **残して毎ティック record**。窓 500ms | PH0-E 済み |
| D5 | `dtMs` は **ミリ秒** | 0.1ms 単位（×10）は不採用 |
| D6 | トランスポートは **WebSocket のみ** | WT / geckos / 生 UDP / WebRTC DataChannel を実装しない |
| D7 | `bufferedAmount` は **使わない** | Bun server 側は `send()` の -1 / 0 / 1+ を見る |
| D8 | ホットパス送信は **`subarray`** | `slice` でバイトコピーしない |
| D9 | ライセンス MIT。初期は匿名 | 認証・ランキングは後続。ボイスは理想だがゲーム同期に WebRTC は使わない |
| D10 | プレーヤー同士はすり抜け | FPS マップは CDN 前提でパスだけ。チャンクは当面メモリ。初期リージョン 1 拠点 |
| D11 | fps Snapshot には **`vy` を含める** | 将来 0x11 化でも `vy` 前提で bytes/MTU を再計算 |
| D12 | workspace package name は **`@cod/*`** | `@cod/protocol`, `@cod/engine-core`, `@cod/profile-fps`, `@cod/gameserver`, `@cod/web` |
| D13 | Babylon options は **型にあるものだけ** | installed `.d.ts` を正として扱う |
| D14 | `.github/workflows/` は Agent が作らない | CI 提案は `docs/ops/` に置き、人間が配置する |

## 2. Phase 1.5 品質ゲートの現状

| Gate | 状態 | 証拠 / コマンド |
|---|---|---|
| Vitest coverage 導入 | 完了 | `test:coverage` / `@vitest/coverage-v8@4.1.11` / include・exclude 設定済み |
| Meaningful coverage 増加 | ローカル検証済み | 17 files / 107 tests。WebSocketTransport / GameClient / Interpolator / StartOverlay / TouchControls の重要経路を追加 |
| Coverage thresholds | 有効 | statements 79 / branches 73 / functions 79 / lines 80 |
| Playwright E2E 入口 | 実装済み | `@playwright/test@1.63.0`, `playwright.config.ts`, `e2e/game-shell.spec.ts`, `test:e2e` |
| E2E discovery | ローカル検証済み | `bun run test:e2e -- --list` pass（3 tests discovered） |
| E2E browser 実行 | 実環境検証待ち | Sandbox Chromium 制約により未実行。CI または実機で `bun run test:e2e` |
| CI 提案 | ローカル検証済み | [`docs/ops/github-actions-proposal.yml`](../ops/github-actions-proposal.yml) を `.github/workflows/quality-gates.yml` へ人間がコピーする想定 |

品質ゲート手順の正本は [`docs/ops/quality-gates.md`](../ops/quality-gates.md)。Phase 2 以降も以下を維持する。

```bash
bun run typecheck
bunx biome lint .
bun run test:unit
bun run test:coverage
bun run build
bun run test:e2e -- --list
```

Playwright browser 実行は CI / 実環境で行う。

## 3. 次の 1 件: Phase 2 計画作成

### 目的

Phase 2 は Sim Profile 分離。`engine-core` を type 非依存の L1 として保ち、`profile-fps` を L2 実装として切り出す。将来の `profile-voxel` に備えるが、Phase 2 で voxel 本実装を混ぜない。

### 計画で決めるべきこと

- `SimProfile` contract の置き場所と責務。
- `FpsSimProfile` が現行 `createDefaultWorld` / `simulatePlayer` / collision world をどう包むか。
- client/server 同一入力テストと決定論テストの粒度。
- `TYPE_SPECS` の置き場所。fps 60/60/30 と将来 voxel 30/30/15 をどう表現するか。
- `GameClient` / `apps/gameserver` から fps 固有実装を注入へ寄せる手順。
- PH1.5 quality gate を Phase 2 の各サブタスクでどう維持するか。

### やってはいけない

- Phase 2 計画なしに実装を開始する。
- `engine-core` に `if (type === 'fps' | 'voxel')` を入れる。
- voxel package / voxel terrain / gamemode SDK / matchmaker / Hello HMAC / Snapshot 0x11 を混ぜる。
- Playwright browser 実行を Sandbox で pass と主張する。
- `.github/workflows/` を作る。

### Phase 2 計画の完了条件候補

- `docs/planning/PHASE02_PLAN.md` が `_TEMPLATE.md` 準拠で作成される。
- `docs/task-list.md` に `PLAT-2` と PH2-* サブタスクが追加される。
- 既存 arch / Phase 1.5 quality gate と矛盾しない。
- docs-only の場合は link check / 整合確認を行う。コード変更を含めるなら 4検証を実行する。

## 4. 不一致（両方引用。どちらが正しいか決めない）

実装で衝突したら **停止して人間に聞く**。

**bufferedAmount**

- DOC-4 で protocol.md の `NetTransport` 型例から `bufferedAmount` を削除済み。
- AGENTS.md / server.md / フェーズ 0: Bun server 側は `send()` の -1 / 0 / 1+ を見る。

**Input 長さ**

- DOC-4 で protocol.md の古い Input 長さ記述を削除済み。
- コード / PH0-A: `INPUT_PACKET_BYTES === 16`、type `0x10`。

**Hello / Channel「最初から」**

- ADR-005: Channel・Hello 認証は最初から。
- milestones フェーズ 1: モノレポ + Babylon。Hello はフェーズ 4（マッチメイカー）。
- 合意 D2: Channel だけ今やる。

**milestones GPU DoD vs 合意 D3**

- milestones フェーズ 1 DoD: ドローコール < 100、中位機フレーム < 8ms。
- 合意 D3: 本フェーズ完了条件から外す。

## 5. 読み順（次セッション）

1. 本ファイル
2. `AGENTS.md`
3. `docs/task-list.md`
4. `docs/planning/README.md`
5. `docs/ops/quality-gates.md`
6. `docs/arch/product.md` / `architecture.md` / `sim-profiles.md` / `engineering.md` / `protocol.md` / `adr.md` / `milestones.md`
7. `docs/research/DEEP_RESEARCH_SYNTHESIS.md`
8. `.agent/hooks/pre-task.md` → 必要なスキルだけ（`skills/index.md`）

旧仕様は `.archive/docs/`。正本にしない。

## 6. 人間への話し方

日本語。敬体。絵文字は報告の最小限。表で状態を出す。Go 待ちで止める。推測と事実を分ける。

# 2026-09-09 Phase 1.5 quality gate plan

## 目的

ユーザー指示により、Phase 2 の前に Phase 1.5 として Vitest coverage 測定、意味ある coverage 増加、Playwright E2E 実装のフェーズを追加した。

## 確認した外部情報

- Vitest coverage guide: `v8` / `istanbul` provider、`vitest run --coverage`、support package、Bun runtime で V8 coverage 非対応の注意。
- Vitest coverage config: `coverage.include` 未設定では import 済み file 中心。`provider`, `include`, `exclude`, `reportsDirectory`, `reporter`, `thresholds`, `perFile` を確認。
- Playwright webServer: `command`, `url`, `reuseExistingServer`, `timeout`, `gracefulShutdown` 等。
- Playwright config: `testDir`, `fullyParallel`, `forbidOnly`, `retries`, `workers`, `reporter`, `use.baseURL`, `projects`, `webServer`。

## 変更

- `docs/planning/PHASE01_5_PLAN.md` を新規作成。
- `docs/task-list.md` に Phase 1.5 と `PLAT-1.5`, `PH1.5-A`〜`PH1.5-D` を追加。
- `docs/planning/README.md` / `HANDOFF.md` / `docs/README.md` を Phase 1.5 優先に更新。
- `docs/arch/milestones.md` に Phase 1.5 を追加。
- `docs/arch/engineering.md` に coverage / E2E 品質ゲート方針を追加。
- `docs/arch/api-sources.md` に Vitest / Playwright 公式 API 確認メモを追加。
- `.agent/skills/*` に Phase 1.5 の coverage / Playwright 制約と実践方針を同期。

## 次

次タスクは `PH1.5-A`: Vitest coverage 測定導入。

- `@vitest/coverage-v8` など provider package を導入。
- `test:coverage` と `vitest.config.ts` coverage 設定を追加。
- baseline を記録。
- 4 検証 + `git diff --check` 後に commit/push。

## 注意

- Playwright は Phase 1.5 で実装するが、Sandbox では Chromium browser 実行不可。実行済みと捏造しない。
- `.github/workflows/` は書かない。CI 提案は必要なら `docs/ops/` に置く。

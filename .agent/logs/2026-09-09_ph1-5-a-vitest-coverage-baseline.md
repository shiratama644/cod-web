# PH1.5-A Vitest coverage baseline

> Date: 2026-09-09(JST) / Commit: 本コミット / Branch: arena/01a0748a-cod-web

## 1. 指示内容 (Task Summary)

ユーザー指示により、現状と計画、AGENTS.md と `.agent/` ルールを確認したうえで Phase 1.5 実装へ移行。最初の実装単位として `PH1.5-A`（Vitest coverage 測定導入）を行った。

## 2. 実行内容 (Executed Actions)

| 項目 | 内容 |
|---|---|
| 事前確認 | `git status --short`, `git branch --show-current`, `git log -5 --oneline`。作業ツリー clean、branch `arena/01a0748a-cod-web`、HEAD `f422847` |
| ルール確認 | `AGENTS.md`, `.agent/skills/index.md`, `.agent/hooks/index.md`, `.agent/hooks/pre-task.md`, relevant skills/hooks を読了 |
| 公式確認 | Vitest coverage guide/config を `web_search depth:3` と `fetch_page` で再確認 |
| 依存追加 | `@vitest/coverage-v8@4.1.11` を devDependency と lockfile に追加 |
| script | root `package.json` に `test:coverage: vitest run --coverage` を追加 |
| config | `vitest.config.ts` に `coverage.provider`, `include`, `exclude`, `reporter`, `reportsDirectory`, 初期 `thresholds` を追加 |
| baseline | `bun run test:coverage` pass。Statements 66.82%、Branches 57.10%、Functions 64.43%、Lines 68.97% |
| docs | `docs/task-list.md`, `docs/planning/PHASE01_5_PLAN.md`, `docs/planning/HANDOFF.md`, `docs/planning/README.md` を PH1.5-B 次タスクへ更新 |
| skills | coverage baseline と除外方針を `.agent/skills/` へ同期 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- `bun run test:coverage` から Vitest v4.1.11 + `@vitest/coverage-v8@4.1.11` はこの Sandbox で実行できた。
- baseline は `apps/web/src/components/StartOverlay.tsx`, `TouchControls.tsx`, `apps/web/src/game/net/websocket.ts`, `apps/gameserver/src/index.ts`, `BabylonGame.ts` が大きく未カバー。
- `apps/gameserver/src/index.ts` は import すると Bun server / setInterval を起動するため、coverage を上げるなら handler 抽出などの小さい seam を検討する必要がある。
- PH1.5-A の threshold は baseline 計測用に 0% 明示。PH1.5-B で meaningful tests 後に ratchet する。

## 4. 次にすべきこと (Next Actions)

- `PH1.5-B`: baseline を基に、WebSocketTransport / StartOverlay / TouchControls / interpolation / GameClient など、重要 branch に meaningful tests を追加する。
- Playwright E2E は `PH1.5-C` まで開始しない。Sandbox で browser 実行済みと主張しない。

# PH1.5-C: Playwright E2E 実装

> Date: 2026-09-09(JST) / Commit: 本コミット / Branch: arena/01a0748a-cod-web

## 1. 指示内容 (Task Summary)

PH1.5-B 完了後の次タスクとして、現状と計画を確認したうえで `PH1.5-C: Playwright E2E 実装` を進める。AGENTS.md と `.agent/` ルールを適用し、Playwright 公式 docs を確認して事実に基づき実装する。Sandbox では browser 実行を捏造しない。

## 2. 実行内容 (Executed Actions)

| 項目 | 内容 |
|---|---|
| 事前確認 | `git status --short && git branch --show-current && git log -5 --oneline` で clean / `arena/01a0748a-cod-web` / HEAD `be13e45` を確認 |
| ルール確認 | `AGENTS.md`、`.agent/skills/*`、`.agent/hooks/*`、`docs/task-list.md`、`PHASE01_5_PLAN.md`、`HANDOFF.md`、`api-sources.md`、`engineering.md` を全体確認 |
| 公式確認 | Playwright 公式 `test-configuration` と `test-webserver` を web_search / fetch_page で確認 |
| 依存追加 | `bun add -d @playwright/test` で `@playwright/test@1.63.0` を追加 |
| script | `package.json` に `test:e2e: playwright test` を追加 |
| config | `playwright.config.ts` を追加。local は `bun run start` + `http://127.0.0.1:4173`、preview/CI は `PLAYWRIGHT_BASE_URL` で webServer を起動しない |
| specs | `e2e/game-shell.spec.ts` に shell smoke / fullscreen unavailable start / same-origin WS proxy connection の 3 specs を追加 |
| artifacts | `.gitignore` に `playwright-report/` と `test-results/` を追加 |
| 型 | `tsconfig.json` に `e2e` と `playwright.config.ts` を include |
| docs/skills | task-list / PHASE01_5_PLAN / HANDOFF / planning README / api-sources / engineering / skills を PH1.5-C 状態へ更新 |
| 検証 | `bun run test:e2e -- --list` pass（3 tests discovered）、`bun run test:coverage` pass、4検証 pass、refined Markdown link check broken 0、`git diff --check` pass |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- Playwright 公式 docs では `webServer.command/url/reuseExistingServer/timeout/stdout/stderr/gracefulShutdown` と `use.baseURL` の併用が推奨される。本プロジェクトでは `bun run start` が install/build/server/preview をまとめるため、E2E の local 起動コマンドとして使える。
- `PLAYWRIGHT_BASE_URL` を指定した場合は preview/CI の既存 URL を対象にし、local `webServer` を起動しない構成にすると、同じ spec を local と CI/preview で使い回せる。
- E2E spec は browser-facing code に backend `localhost` を書かず、app 側の `/ws` same-origin proxy をユーザー可視 HUD (`net: connected`) で検証する。
- Sandbox では Chromium browser 実行を捏造しない。`bun run test:e2e -- --list` は browser を起動しない discovery 検証として有用。

## 4. 次にすべきこと (Next Actions)

- PH1.5-D で quality gate docs / CI 提案を整理する。
- `.github/workflows/` は作らず、必要な CI YAML は `docs/ops/` に配置案として置く。
- 実環境または CI で `bun run test:e2e` を実行し、Playwright browser 結果を記録する。

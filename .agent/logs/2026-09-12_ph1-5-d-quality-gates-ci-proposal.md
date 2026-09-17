# PH1.5-D: Quality gate docs / CI 提案整理

> Date: 2026-09-12(JST) / Commit: 本コミット / Branch: `arena/01a0748a-cod-web`

## 1. 指示内容 (Task Summary)

ユーザー指示に従い、現状と計画、AGENTS.md と `.agent/` ルールを確認してから実装へ移る。PH1.5-D として、Phase 1.5 の quality gate docs、E2E 実行手順、CI 提案、Phase 2 handoff を整理する。

## 2. 実行内容 (Executed Actions)

| 項目 | 内容 |
|---|---|
| Sandbox 復旧 | 再構築状態を検知し、`git fetch origin arena/01a0748a-cod-web && git reset --hard FETCH_HEAD && bash .agent/hooks/restore-sandbox-env.sh` で `b48aef2` へ復旧 |
| ルール確認 | `AGENTS.md`, `.agent/skills/index.md`, `.agent/hooks/index.md`, `pre-task`, `verify-before-commit`, `log-task`, `sandbox-rebuild-recovery` を確認 |
| 現状確認 | `docs/task-list.md`, `PHASE01_5_PLAN.md`, `HANDOFF.md`, `planning/README.md`, skills、`package.json`, `playwright.config.ts`, `e2e/game-shell.spec.ts` を確認 |
| 公式確認 | Playwright CI / webServer、Bun install / `bun ci`、GitHub Actions workflow syntax、`oven-sh/setup-bun` を web_search / fetch_page で確認 |
| docs 追加 | `docs/ops/README.md`, `docs/ops/quality-gates.md`, `docs/ops/github-actions-proposal.yml` を追加 |
| docs 更新 | `docs/README.md`, `docs/arch/api-sources.md`, `docs/task-list.md`, `docs/planning/PHASE01_5_PLAN.md`, `docs/planning/README.md`, `docs/planning/HANDOFF.md` を更新 |
| skills 更新 | `project-overview`, `tech-stack`, `sandbox-constraints`, `skills/index.md` を PH1.5-D 状態に同期 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- GitHub Actions workflow は公式仕様上 `.github/workflows` 配下に置くが、AGENTS.md §6.3 により Agent は直接作成しない。提案 YAML は `docs/ops/` に置く。
- Playwright 公式 CI docs は browser と OS dependencies の install を前提にしている。Bun project では `bun ci` 後に `bunx playwright install --with-deps chromium` を実行する構成が自然。
- `playwright.config.ts` は `PLAYWRIGHT_BASE_URL` がある場合に `webServer` を起動しないため、デプロイ済み preview に向けた E2E とローカル `bun run start` E2E を同じ spec で扱える。
- Sandbox で Playwright browser 実行を pass と主張しない。`bun run test:e2e -- --list` で discovery のみ確認する。

## 4. 次にすべきこと (Next Actions)

- Phase 2（Sim Profile 分離）の計画書 `docs/planning/PHASE02_PLAN.md` を作成する。
- `docs/task-list.md` に `PLAT-2` と PH2-* サブタスクを追加する。
- CI 提案を採用する場合、人間が `docs/ops/github-actions-proposal.yml` を `.github/workflows/quality-gates.yml` にコピーする。
- CI / 実環境で `bun run test:e2e` を実行し、結果を後続ログまたは task-list に記録する。

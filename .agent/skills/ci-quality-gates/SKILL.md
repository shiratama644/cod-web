---
name: ci-quality-gates
description: GitHub Actions quality-gates.ymlを唯一の正本として扱い、typecheck/lint/determinism/unit/coverage/build/E2E discoveryを段階的に実行するCIスキル。
---

# CI Quality Gates — quality-gates.ymlを正本として扱うスキル

> 仕様正本: `docs/ops/quality-gates.md`（全面）、`docs/ops/README.md`  
> 計画: `docs/planning/PHASE01_5_PLAN.md` §10.4, `EM01_PLAN.md` B16, `EM02_PLAN.md` §10.6, `PLAT-3`以降

## 原則

- **`.github/workflows/quality-gates.yml` が唯一の正本**。`docs/ops/github-actions-proposal.yml` は2026-09-22に削除済み、docsに再作成しない
- Agentは `.github/workflows/` を直接作成しない（AGENTS.md §6.3例外: 2026-09-19以降はbun/mono-repo効率化のため直接書き込み許可済みだが、提案→承認フローが基本）
- quality-gates.mdはworkflowの解説、proposal ymlの複製ではない

## quality-gates.yml構成（現行）

```yaml
name: quality-gates
on:
  push: { branches: [main, 'arena/**'] }
  pull_request: { branches: [main] }
  workflow_dispatch:
    inputs:
      job:
        description: 'Run specific job (all/quality/e2e)'
        required: false
        default: 'all'

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run typecheck
      - run: bun run lint
      - run: bun run check:determinism
      - run: bun run test:unit
      - run: bun run test:coverage
      - run: bun run build
      - run: bun run test:e2e -- --list  # discoveryのみ、browser実行はe2e jobで

  e2e:
    runs-on: ubuntu-latest
    if: inputs.job == 'all' || inputs.job == 'e2e' || github.event_name != 'workflow_dispatch'
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bunx playwright install --with-deps chromium
      - run: bun run test:e2e
```

### inputs.job

- `all` (default): quality + e2e 両方
- `quality`: qualityのみ
- `e2e`: e2eのみ
- `workflow_dispatch` 手動実行時に選択可能

## 4検証 + coverage + determinism + E2E discovery

| コマンド | 目的 | 失敗時の典型 |
|---|---|---|
| `bun run typecheck` | tsc --noEmit | 型エラー、import境界違反 |
| `bun run lint` | biome check | import制限、noConsole、any濫用 |
| `bun run check:determinism` | 禁止API検出 | Math.random / Date.now / setTimeout がSimProfile.stepに混入 |
| `bun run test:unit` | Vitest unit 30files/189tests | 意味あるテスト失敗 |
| `bun run test:coverage` | threshold 85/85/85/85 | 95.12%/87.97%/90.7%/96.8% 実績 |
| `bun run build` | Vite + tsc build | importエラー、型エラー |
| `bun run test:e2e -- --list` | discovery | spec構文エラー、configエラー |

## Manual dispatch（手動実行）

- GitHub Actions UI → quality-gates → Run workflow → job選択
- docs: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax (on.workflow_dispatch.inputs)
- 公式docsで `inputs` の書き方を確認済み（2026-09-22検証）

## Sandboxでの代替検証（AGENTS.md §3.1）

- docs-only変更時は4検証をスキップ可能だが、リンクチェッカーとURL検証で代替
- pre-commit hook `git commit` without --no-verifyは typecheck+biome+determinism+vitest 30files 189tests ~5sでtimeoutする可能性。docs-onlyなら `--no-verify` で回避可

## よくある失敗

- `bun.lockb` が古い: `bun install` → `git diff bun.lockb` を確認、CIは `--frozen-lockfile` なのでlockb不一致で失敗
- `oven-sh/setup-bun` バージョン固定忘れ: v2を使う
- Playwright browser未インストール: CIでは `bunx playwright install --with-deps chromium` 必須、localでは `bunx playwright install chromium`
- proposal ymlをdocsに再作成: しない、`.github/workflows/` が正本

## 関連

- `.github/workflows/quality-gates.yml` 正本
- `docs/ops/quality-gates.md` 解説（公式URL付き）
- `docs/ops/README.md` 正本宣言
- `.agent/logs/2026-09-12_ph1-5-d-quality-gates-ci-proposal.md`
- `.agent/logs/2026-09-21_em2-coverage-85.md`

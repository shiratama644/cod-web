# Quality Gates（Phase 1.5）

> 対応タスク: `PH1.5-D`  
> 目的: Phase 2 の Sim Profile 分離前に、coverage / E2E / CI の運用ルールを明確化する。  
> 注意: `.github/workflows/` は AGENTS.md §6.3 により AI Agent が直接作成しない。提案 YAML は [`github-actions-proposal.yml`](./github-actions-proposal.yml)。

## 1. 公式確認した根拠

| 領域 | 確認内容 | URL |
|---|---|---|
| Playwright CI | CI agent は browser 実行環境が必要。Linux では Docker image または `playwright install --with-deps` を使う。CI では workers=1 が安定性優先として推奨される。 | <https://playwright.dev/docs/ci> |
| Playwright webServer | `webServer.command` / `url` / `reuseExistingServer` / `timeout` / `gracefulShutdown` があり、`use.baseURL` と組み合わせると相対 `page.goto('/')` を使える。 | <https://playwright.dev/docs/test-webserver> |
| Bun CI install | 再現性のため `bun ci` または `bun install --frozen-lockfile` を使う。`bun ci` は `bun install --frozen-lockfile` 相当。 | <https://bun.com/docs/pm/cli/install> |
| GitHub Actions workflow | workflow は YAML で、公式配置先は `.github/workflows`。`on` / `jobs` / `runs-on` / `steps` / `uses` / `run` で構成する。 | <https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax> |
| setup-bun | GitHub Actions では `oven-sh/setup-bun@v2` で Bun をセットアップできる。 | <https://github.com/oven-sh/setup-bun> |

## 2. Local gate

各実装タスクの commit 前に、原則として次を実行する。

```bash
bun run typecheck
bunx biome lint .
bun run test:unit
bun run build
```

Phase 1.5 以降は coverage も品質ゲートとして扱う。

```bash
bun run test:coverage
```

E2E の spec discovery は browser binary 不要なので、Playwright 設定変更時に確認する。

```bash
bun run test:e2e -- --list
```

## 3. Coverage gate

PH1.5-B で測定した after coverage を下限として、`vitest.config.ts` に threshold を設定済み。

| Metric | PH1.5-A baseline | PH1.5-B after | Current threshold |
|---|---:|---:|---:|
| Statements | 66.82% (725/1085) | 79.17% (859/1085) | 79 |
| Branches | 57.10% (225/394) | 73.85% (291/394) | 73 |
| Functions | 64.43% (125/194) | 79.38% (154/194) | 79 |
| Lines | 68.97% (696/1009) | 80.77% (815/1009) | 80 |

運用ルール:

- threshold を下げる場合は、削除理由・代替テスト・未カバー範囲を docs に記録する。
- threshold を上げる場合は、数字稼ぎではなく重要経路の assertion 追加後に行う。
- `coverage/` は artifact であり Git に入れない。必要な数値だけ docs に残す。
- coverage 対象から production code を外す場合は、entrypoint / type-only / generated など明確な理由を config コメントか計画書に残す。

## 4. E2E gate

PH1.5-C で Playwright の入口を追加済み。

| 項目 | 値 |
|---|---|
| script | `bun run test:e2e` |
| config | [`../../playwright.config.ts`](../../playwright.config.ts) |
| specs | [`../../e2e/game-shell.spec.ts`](../../e2e/game-shell.spec.ts) |
| local baseURL | `http://127.0.0.1:4173` |
| local server | `webServer.command: bun run start` |
| preview / CI override | `PLAYWRIGHT_BASE_URL=<url> bun run test:e2e` |
| current project | Desktop Chrome / Chromium |

Sandbox 方針:

- Arena Sandbox では Chromium browser install / 実行が不可または不安定なため、`bun run test:e2e` の browser 実行を pass と主張しない。
- Sandbox で確認するのは `bun run test:e2e -- --list` による spec discovery まで。
- 実行結果は CI または実機で記録する。

CI / 実環境での実行例:

```bash
bun ci
bunx playwright install --with-deps chromium
bun run test:e2e
```

デプロイ済み preview に向ける場合:

```bash
PLAYWRIGHT_BASE_URL=https://example-preview.example.com bun run test:e2e
```

## 5. CI 提案

提案 YAML は [`github-actions-proposal.yml`](./github-actions-proposal.yml) に置く。人間が採用する場合は次の場所へコピーする。

```text
.github/workflows/quality-gates.yml
```

提案の構成:

| Job | 内容 | 備考 |
|---|---|---|
| `quality` | `bun ci` → typecheck → lint → unit → coverage → build → E2E discovery | PR の基本 gate |
| `e2e` | Playwright browser install → `bun run test:e2e` → report artifact upload | Browser 実行可能な GitHub-hosted runner / self-hosted runner 用 |

## 6. Phase 2 へ進む前の確認

Phase 2（Sim Profile 分離）へ進む前に最低限確認すること。

- `bun run test:coverage` が PH1.5-B thresholds を満たす。
- `bun run test:e2e -- --list` で spec discovery が通る。
- CI または実環境で `bun run test:e2e` を一度実行し、結果を `docs/task-list.md` か後続ログに記録する。
- E2E browser 実行が未完了の場合、Phase 2 は着手できるが、リリース判定では「実環境検証待ち」と明記する。

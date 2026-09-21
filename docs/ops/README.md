# Ops / CI

このディレクトリは、運用・CI・品質ゲートの提案と本番配置の入口です。

## `.github/workflows/` への配置（2026-09-19 許可）

旧ルールでは AGENTS.md §6.3 により AI Agent が `.github/workflows/` に直接 workflow を作成できませんでしたが、2026-09-19 にユーザー許可により解除されました。

現在は **提案 + 本番配置** の両方を扱います：

- 提案: [`github-actions-proposal.yml`](./github-actions-proposal.yml)（人間/Agentが編集する元）
- 本番: `.github/workflows/quality-gates.yml`（GitHub Actions が実際に実行するファイル、Agent が直接作成可）

## ファイル

| ファイル | 役割 |
|---|---|
| [`quality-gates.md`](./quality-gates.md) | Phase 1.5 で導入した coverage / E2E / validation gate の運用手順 |
| [`github-actions-proposal.yml`](./github-actions-proposal.yml) | 提案元 YAML（本番と同期） |
| `../../.github/workflows/quality-gates.yml` | 本番 CI ワークフロー（許可後、Agent が直接配置） |

## 現在の品質ゲート要約

| Gate | コマンド | 実行場所 | 備考 |
|---|---|---|---|
| Typecheck | `bun run typecheck` | Local / CI | client + server tsconfig |
| Lint | `bunx biome lint .` | Local / CI | Biome 直接実行 |
| Determinism | `bun run check:determinism` | Local / CI | SimProfile決定論ガード |
| Unit | `bun run test:unit` | Local / CI | Vitest run (30 files / 189 tests) |
| Coverage | `bun run test:coverage` | Local / CI | EM2 thresholds: statements 85 / branches 85 / functions 85 / lines 85 (95.12%/87.97%/90.7%/96.8%) |
| Build | `bun run build` | Local / CI | Vite chunk-size warning は既存 |
| E2E discovery | `bun run test:e2e -- --list` | Local / CI | Browser 不要。spec discovery 確認 (11 tests) |
| E2E browser | `bun run test:e2e` | CI / 実環境 | Sandbox では Chromium 制約により未実行扱い |

## 手動実行（2026-09-21 追加）

GitHub Actions UI から `Quality Gates` workflow を手動実行できます。

- `workflow_dispatch` に `inputs.job` を追加:
  - `all` (default): quality + e2e の2ジョブを順に実行
  - `quality`: Typecheck/Lint/Unit/Coverage/Build/discovery のみ
  - `e2e`: Playwright E2E のみ (quality が skipped でも `always()` で実行)

実行方法:
1. GitHub → Actions → Quality Gates → Run workflow
2. `Select job to run manually` で `all` / `quality` / `e2e` を選択
3. Run workflow

ローカルでの同等実行:
```bash
# quality 相当
bun run typecheck && bunx biome lint . && bun run check:determinism && bun run test:unit && bun run test:coverage && bun run build && bun run test:e2e -- --list

# e2e 相当 (要: bun run server + bun run preview 別ターミナル or CI環境)
bunx playwright install --with-deps chromium
bun run test:e2e
```

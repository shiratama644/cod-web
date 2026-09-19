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
| Unit | `bun run test:unit` | Local / CI | Vitest run |
| Coverage | `bun run test:coverage` | Local / CI | PH1.5-B thresholds: statements 79 / branches 73 / functions 79 / lines 80 |
| Build | `bun run build` | Local / CI | Vite chunk-size warning は既存 |
| E2E discovery | `bun run test:e2e -- --list` | Local / CI | Browser 不要。spec discovery 確認 |
| E2E browser | `bun run test:e2e` | CI / 実環境 | Sandbox では Chromium 制約により未実行扱い |

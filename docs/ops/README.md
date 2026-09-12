# Ops / CI 提案

このディレクトリは、運用・CI・品質ゲートの提案を置く場所です。

## なぜ `.github/workflows/` ではないか

AGENTS.md §6.3 により、このリポジトリでは AI Agent が `.github/workflows/` に直接 workflow を作成しません。GitHub Actions の workflow は公式仕様上 `.github/workflows` 配下の YAML として配置しますが、本ディレクトリでは **人間が配置するための提案**として管理します。

## ファイル

| ファイル | 役割 |
|---|---|
| [`quality-gates.md`](./quality-gates.md) | Phase 1.5 で導入した coverage / E2E / validation gate の運用手順 |
| [`github-actions-proposal.yml`](./github-actions-proposal.yml) | `.github/workflows/quality-gates.yml` に配置する想定の GitHub Actions 提案 YAML |

## 現在の品質ゲート要約

| Gate | コマンド | 実行場所 | 備考 |
|---|---|---|---|
| Typecheck | `bun run typecheck` | Local / CI | client + server tsconfig |
| Lint | `bunx biome lint .` | Local / CI | Biome 直接実行 |
| Unit | `bun run test:unit` | Local / CI | Vitest run |
| Coverage | `bun run test:coverage` | Local / CI | PH1.5-B thresholds: statements 79 / branches 73 / functions 79 / lines 80 |
| Build | `bun run build` | Local / CI | Vite chunk-size warning は既存 |
| E2E discovery | `bun run test:e2e -- --list` | Local / CI | Browser 不要。spec discovery 確認 |
| E2E browser | `bun run test:e2e` | CI / 実環境 | Sandbox では Chromium 制約により未実行扱い |

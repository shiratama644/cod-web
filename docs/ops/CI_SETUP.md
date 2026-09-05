# CI セットアップ手順

CodWeb の CI（GitHub Actions）を有効化するには、エージェント（GitHub App）によっては `.github/workflows/` に書き込めない権限制約があるため、正本 `docs/ops/CI_WORKFLOW.yml` をユーザー側で `.github/workflows/ci.yml` に配置します。

## 手順

1. リポジトリのルートに `.github/workflows/` ディレクトリを作成
   ```bash
   mkdir -p .github/workflows
   ```

2. 本リポジトリの `docs/ops/CI_WORKFLOW.yml` を `.github/workflows/ci.yml` にコピー
   ```bash
   cp docs/ops/CI_WORKFLOW.yml .github/workflows/ci.yml
   ```

3. コミット & push（ユーザーのアカウントで実施）
   ```bash
   git add .github/workflows/ci.yml
   git commit -m "ci: enable GitHub Actions workflow"
   # ブランチ名はセッションごとに変わるためハードコードせず現在値を使う
   git push origin "$(git branch --show-current)"
   ```

4. GitHub リポジトリ Settings > Actions > General で:
   - **Actions permissions**: "Allow all actions and reusable workflows"
   - **Workflow permissions**: "Read and write permissions"（artifact upload に必要）

## ワークフロー概要

| Job | トリガー | 内容 | 想定時間 |
|---|---|---|---|
| `static-checks` | push / PR | tsc + lint + vitest+coverage | ~3-5 min |
| `build` | static-checks 後 | client / server のビルド | ~2 min |
| `e2e` | push / 手動 | Playwright でクライアント描画・入力・フロー | ~5-10 min |

## 配置後の動作確認手順

1. GitHub リポジトリ > Actions タブに `CI` ワークフローが表示され、最新 commit で自動 trigger されている。
2. 各 Job が順に pass する（コマンドは各パッケージの検証手順に依存。`static-checks` と `build` は確定後に追記）。

## トラブルシューティング

### Actions が「workflow file issue」で 0 秒 failure になる
- YAML の引用符なしスカラーに `: `（コロン+スペース）が含まれると誤パース。引用符で修正。

### `pnpm/action-setup` が「Multiple versions of pnpm specified」で失敗する
- workflow 側に `version:` を書かない。`package.json` の `packageManager` から自動解決。

### `pnpm install` が失敗する
- `pnpm-lock.yaml` が古い → 手動で `pnpm install` してから commit / push。

> 実装フェーズで `packages/*` の検証コマンドが確定したら、本ドキュメントのワークフロー概要・検証手順を更新する。

---
paths:
  - "docs/**/*.md"
  - "README.md"
  - "AGENTS.md"
---

# Rule 03: ドキュメント記述スタイル（cod-web）

> 優先度: **HIGH** — 可読性と再利用性の一貫性を保つ

## 1. 言語と表記

- 本文は**日本語**。コード識別子・技術固有名詞は英語のまま。
- 「〜です/ます」調。計画書の完了条件などは断定形「〜する」。
- 絵文字は既存ファイルのパターンに従う。新規の飾り絵文字は増やさない。
- JSX や表の中で日本語と `{式}` を汚く混ぜない。

## 2. ディレクトリ構成（現構成）

| 場所 | 内容 |
|---|---|
| `docs/README.md` | 全ドキュメントの目次（追加・削除・移動時に必ず更新） |
| `docs/task-list.md` | 進捗の唯一の正本 |
| `docs/arch/` | 設計仕様書（README.md が目次） |
| `docs/planning/` | 計画書（`_TEMPLATE.md` 準拠、`{TOPIC}_PLAN.md`）。完了済みは `complete/` |
| `docs/research/codm/` | CoDM ディープリサーチ成果物（`00_scope.md` 〜 R7 `INTEGRATION_SPEC.md`） |
| `docs/audit/` | 監査・差分・バグの時点記録（追加のみ） |
| `docs/ops/` | 運用（`README.md` + `quality-gates.md` のみ。proposal yml は再作成禁止） |
| `.archive/docs/` | 旧仕様。正本にしない・参照リンクを張らない |

## 3. 命名規約

| 種類 | 命名規則 | 例 |
|---|---|---|
| 計画書 | `{TOPIC}_PLAN.md` | `PHASE02_PLAN.md`, `CODM_DEEP_RESEARCH_PLAN.md` |
| 仕様書 | `kebab-case.md` | `sim-profiles.md` |
| リサーチ | `NN_topic.md`（codm 配下） | `00_scope.md`, `05_ranked.md` |
| スキル | `<kebab-case>/SKILL.md` | `nextjs-frontend/SKILL.md` |
| フック手順 | `kebab-case.md` | `verify-before-commit.md` |
| フックスクリプト | `kebab_case.sh` または `kebab-case.sh` | `restore-sandbox-env.sh` |
| ログ | `YYYY-MM-DD_kebab-case-summary.md` | `2026-10-03_promote-recent-knowledge-to-skills-hooks.md` |
| テスト | `_tests_/` にソース構造をミラー、`<name>.test.ts` | `_tests_/packages/engine-core/client/prediction.test.ts` |

## 4. リンク規約

- `docs/` 内の相互リンクは相対パス。存在しないファイルへのリンクを残さない。移動時は参照も更新。
- 検証ラベル付きの外部リンクは公式ソース優先（`codm-research/SKILL.md` の信頼順）。
- 内部リンク検査では fenced code / inline code を除外する（`[id](url)` の例示を誤検出しない。`docs-maintenance/SKILL.md`）。

## 5. 運用

- 検証ラベル `[検証済み]` / `[単一情報源]` / `[概算・設計値]` はリサーチ文書で必須。
- タスク ID と進捗は `docs/task-list.md` にのみ記録、計画書には「対応 task-list ID」を書いて相互参照。
- Phase 番号は 2 桁。サブフェーズ = 1 commit を原則。

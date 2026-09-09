# 2026-09-06 DOC-9: docs final check

## 指示内容

ユーザー指示: ドキュメントの最終チェック。質問があれば質問し、API 根拠が必要なら Web 検索、必要なら git clone で実コード確認も可。完了した plan は `complete/` フォルダへ移動する。

## 実行内容

- `docs/planning/complete/` を作成。
- 完了済み計画を移動。
  - `docs/planning/PHASE00_PLAN.md` → `docs/planning/complete/PHASE00_PLAN.md`
  - `docs/planning/DEEP_RESEARCH_PLAN.md` → `docs/planning/complete/DEEP_RESEARCH_PLAN.md`
- `docs/planning/complete/README.md` を追加。
- 現用リンクを更新。
  - `docs/README.md`
  - `docs/planning/README.md`
  - `docs/planning/HANDOFF.md`
  - `docs/task-list.md`
  - `docs/research/DR-1_COMPETITOR_DEEP_RESEARCH.md`
  - `docs/research/DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md`
  - `docs/research/DR-5_PERPLEXITY_DIFF_RESEARCH.md`
- `docs/task-list.md` に `DOC-9` 完了行を追加。

## API / 外部根拠確認

- Bun workspaces 公式: `workspaces` key、`workspace:*`、`--filter`、self-contained workspaces/catalog を再確認。
- Biome `noRestrictedImports` 公式: diagnostic category `lint/style/noRestrictedImports`、`linter.rules.style.noRestrictedImports`、recommended ではないことを再確認。
- Babylon `EngineOptions` typedoc を fetch し、現行 typedoc の property 一覧では `desynchronized` / `preserveDrawingBuffer` が直接 listed property に無いことを再確認。既存 docs の「型に無い key を invent しない」方針と整合。

新たな GitHub clone は不要と判断。今回の作業はリンク・配置・導線の最終確認であり、clone 済み research の内容再調査は発生していない。

## 検証

- Current markdown relative link check（`.archive/` 除外）: `checked 79 current md files, 292 relative links`, `broken 0`。
- 完了済み plan 配置チェック: `PHASE00_PLAN.md` / `DEEP_RESEARCH_PLAN.md` は `docs/planning/complete/` に存在し、元の `docs/planning/` 直下には存在しない。
- 現用 plan チェック: `docs/planning/PHASE01_PLAN.md` は active plan として残存。
- 導線チェック: `docs/README.md`, `docs/planning/README.md`, `docs/task-list.md` は complete 配置へ更新済み。
- 旧 plan path 残存チェック（現用 docs、logs/archive 除外）: 旧 `docs/planning/PHASE00_PLAN.md` / `docs/planning/DEEP_RESEARCH_PLAN.md` 参照なし。
- `git diff --check`: pass。
- `bun` が未導入だったため `.agent/hooks/restore-sandbox-env.sh` で bun 1.4.0 と依存を復旧。
- `bun run typecheck`: pass。
- `bunx biome lint .`: pass（既存の Biome schema 2.5.11 vs CLI 2.5.12 info のみ）。
- `bun run test:unit`: pass（11 files / 72 tests）。
- `bun run build`: pass（既存の Vite chunk-size warning のみ）。

## 次アクション

- 次の実装タスクは `PH1-A`。

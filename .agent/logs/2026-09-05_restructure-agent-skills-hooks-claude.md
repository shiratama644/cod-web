# 再構成: `.agent/skills` と `.agent/hooks` を Claude Code のディレクトリ構造に

> Date: 2026-09-05(JST) / Commit: 6725307 / Branch: arena/01a06efa-cod-web

## 1. 指示内容 (Task Summary)

`.agent/` フォルダ内の **`skills`** と **`hooks`** を、Claude Code（`.claude/`）のディレクトリ構造と同じにする。

- 方針（ユーザー選択）: **構造のみ**（レイアウトを揃える）。日本語の手順・ノウハウの中身と `index.md` エントリは維持する。
- `AGENTS.md`・`docs/`・README 等の `.agent` への参照も追従して更新し、リンク切れを防ぐ。
- `.agent/logs/` の過去ログは再構成対象にしない（§8.5 の運用ルール）。

## 2. 実行内容 (Executed Actions)

| # | 変更 | 内容 |
| :--- | :--- | :--- |
| 1 | skills 再構成 | `*.md` → `<skill>/SKILL.md` フォルダへ `git mv`。`project-overview` / `tech-stack` / `sandbox-constraints` の 3 スキル。 |
| 2 | SKILL.md 整備 | 各 `SKILL.md` 冒頭に `name` / `description` の YAML frontmatter を追加（本文は維持）。 |
| 3 | 相対リンク修正 | 1 階層深くなったため `../../docs|AGENTS` → `../../../docs|AGENTS`、スキル間リンクを `../<sibling>/SKILL.md` に、`sandbox-constraints` の `../hooks` → `../../hooks` に修正。 |
| 4 | hooks 再構成 | `.agent/hooks/settings.json` を追加（Claude Code の `hooks.<event>` と同型）。既存 `.sh` / `.md`（手順）は維持。 |
| 5 | index 更新 | `.agent/skills/index.md`・`.agent/hooks/index.md` のリンクと運用ルール・命名規則を新構造へ。 |
| 6 | 参照追従 | `AGENTS.md` §8.1/§8.2/§8.3、`docs/arch/{game-engineering-principles,modules}.md`、`docs/planning/PHASE00_PLAN.md`、`docs/task-list.md` を新パスへ。 |

- 変更ファイル数: 14 files（＋新規 `settings.json`）。
- 検証: ドキュメントのみ変更のため 4 検証はスキップ（§3.1）。代わりに `.agent/` ツリー（logs 除外）のマークダウン相対リンク解決チェック（broken: 0）と旧ファイル名の残存チェックを実施。
- コミット: `6725307`。push 済み（`arena/01a06efa-cod-web`）。

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- **Claude Code の skills は「フォルダ 1 つ = 1 スキル」+ `SKILL.md`**。フラットな `*.md` ではなく `<name>/SKILL.md` が正の形で、`SKILL.md` 冒頭に必ず `name` / `description` frontmatter を持つ。
- **Claude Code の hooks は「実行スクリプト（`.sh`）+ `settings.json` の `hooks.<event>` 登録」**。手順そのものは手動参照の `.md` が併存しても良い（本リポジトリは手順 `.md` を維持しつつ登録マニフェストを追加）。
- **ファイルを 1 階層深くすると、`../` / `../../` の相対リンクが必ずずれる**。`git mv` + 中身修正を同時に行うと、リンクの解決先（docs/AGENTS などリポジトリ直下）を 1 つ深くする必要がある。自動リンクチェッカーで回して確認するのが速い。
- `.agent/logs/` の過去ログは再構成の対象外（§8.5）。過去ログには当時の構造が正しく残っていて良い。

## 4. 次にすべきこと (Next Actions)

- 必要なら `.claude/` へ完全移行（本リポジトリは `.agent/` のまま）。
- 今後の新規スキル追加は `<kebab-case>/SKILL.md` で行い、`skills/index.md` の「読み方ガイド」「一覧」両方に追記する。
- 今後 `.agent/hooks/` に実装済みの実フックを増やす場合は、`settings.json` へ登録し `hooks/index.md` に対応表を追記する。

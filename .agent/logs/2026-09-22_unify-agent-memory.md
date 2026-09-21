# .agent正本化と.claude削除

> Date: 2026-09-22(JST) / Commit: 984c169 / Branch: arena/01a0b161-cod-web

## 1. 指示内容 (Task Summary)

ユーザー指示: `.claude`と`.agent`のどちらを正にするかを決める必要がある。claudeだけでなくすべてのagentに対応させたいので`.agent`だけを正とし、`.claude`は削除して使わないようにする。

## 2. 実行内容 (Executed Actions)

| # | 対象 | 実装 |
|---|---|---|
| 1 | 現状把握 | `find .claude -type f` で `.claude/logs/2026-09-21_em2-coverage-85.md` 1件のみ、`.agent/logs/` は50件以上、`grep -rn "\.claude"` で active参照は `log-task.md` と `testing/SKILL.md` の2件、他はhistorical logsとAGENTS.mdのClaude Code準拠説明 |
| 2 | 移行 | `cp .claude/logs/2026-09-21_em2-coverage-85.md .agent/logs/` で正本へ移行、内容同一 |
| 3 | 削除 | `rm -rf .claude` で物理削除、`git rm` で追跡から削除、`git status` で `R .claude/... -> .agent/...` としてrename検出 |
| 4 | 禁止化 | `.gitignore` に `.claude/` 追加、AGENTS.md §4.5に「正本は.agentのみ、.claude廃止・使用禁止」追記、§8.5に「.claudeは廃止・使用禁止、作成・参照しない」追記、§8.1に「物理パスは.agentに統一、.claudeは使用しない」明記 |
| 5 | 参照修正 | `.agent/hooks/log-task.md` 58行目の `.agent/logs/ + .claude/logs/` 両方対象を `.agent/logs/` のみに修正、`.agent/skills/testing/SKILL.md` 146行目の `(.claude/logs)` 注記を削除 |
| 6 | 検証 | `biome lint` 107 files 0 errors、`grep -R "\.claude" --include="*.md" | grep -v .agent/logs | grep -v .archive | grep -v node_modules` で残存はAGENTS.mdの禁止明記のみ、historical logsの言及は§8.5不変ルールにより維持 |
| 7 | commit/push | `984c169 chore: unify agent memory to .agent, remove .claude` でpush（タイトルtypoは本文で補足、force禁止のためamendせず） |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- **.claudeは1ファイルのみ残存**: `.claude/logs/2026-09-21_em2-coverage-85.md` だけが `.agent/logs/` に存在せず、EM02完了時に誤って.claude側に作成されていた。`.agent/logs/` が正本なので移行で解決。
- **.gitignoreで再作成防止**: `.claude/` を `.gitignore` に追加することで、Claude Codeがデフォルトで作成しようとしてもGit追跡されない。AGENTS.mdでの禁止明記と二重で防止。
- **historical logsは書き換えない**: AGENTS.md §8.5で過去ログは事実記録として不変。`.agent/logs/2026-09-05_restructure-agent-skills-hooks-claude.md` や `2026-09-22_promote-logs-to-skills-hooks-rules.md` が `.claude` に言及しているのは当時の事実なので維持。activeな `hooks/log-task.md` と `skills/testing/SKILL.md` のみ修正。
- **Claude Code準拠は概念**: ディレクトリ構造がClaude Code準拠という説明は残してよいが、物理パスは `.agent/` に統一することをAGENTS.md §8.1に明記。`hooks/index.md` の「Claude Code準拠」表記は構造の由来説明なので維持。
- **commitメッセージtypo**: `unify agent memory to .claude` と書いてしまったが正しくは `.agent`。本文で補足済み、force push禁止のためamendせず次回以降で注意。

## 4. 次にすべきこと (Next Actions)

1. PH3-B: GameModeRuntime + Tick timer + RateLimiter実装（.agent正本化済みなので今後は.agentのみ参照）
2. docs-maintenanceスキルに「.claude禁止」ルールを追記検討（現在はAGENTS.mdで担保、スキル側でも明記するとより確実）
3. 新規agent参加時のonboardingで `.agent/` のみを使うことを `project-overview/SKILL.md` にも明記検討

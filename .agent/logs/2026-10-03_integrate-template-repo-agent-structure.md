# TEMPLATE_REPO の .agent/ 構成を cod-web 専用に最適化して統合

> Date: 2026-10-03(JST) / Commit: TBD / Branch: arena/01a0b161-cod-web

## 1. 指示内容 (Task Summary)

ユーザー: 「shiratama644/TEMPLATE_REPO の .agent/ や AGENTS.md をこのリポジトリに追加してください。それぞれこのリポジトリ専用に書き換えたり最適化や必要ない skill などは削除して完全最適してください。そして現在の構成に AGENTS.md や .agent/ 内を修正してください」

## 2. 実行内容 (Executed Actions)

| # | 対象 | 実装 |
|---|---|---|
| 1 | 調査 | TEMPLATE_REPO を /tmp に clone、AGENTS.md(473行) + .agent/ 全ファイル読了。テンプレは cod-web 由来の汎用版（pnpm 前提）と判明 |
| 2 | rules/ 新設 | 01_information-hierarchy（cod-web の正の対応表、logs/audit 追加のみ）/ 02_git-workflow（2種復旧診断、push 事前許可）/ 03_doc-style（現 docs 構成・命名）/ 04_verification（bun check:all / 4+3 / apps/web 分離） |
| 3 | agents/ 新設 | explore(haiku) / plan / code-reviewer（決定論・ゼロアロケ・リーク・境界の重点チェック）/ doc-editor / test-writer（Vitest・_tests_ ミラー・include-all）の5体 |
| 4 | commands/ + output-styles/ + workflows/ | commit/review/test（bun 版）、concise/detailed（§7.2 準拠）、implement-task.js（テンプレ原文、汎用のため無改変） |
| 5 | hooks 拡張 | pre_edit_guard.sh（.git/node_modules/dist/.next/coverage/.archive ブロック、exit 2）+ post_edit_verify.sh（.env 混入 / docs 目次 / packageManager=bun 検証）。POSIX sh、sh -n + 実行テスト済み |
| 6 | settings.json 移設・強化 | `.agent/hooks/settings.json` → `.agent/settings.json`（公式準拠配置）。permissions allow/deny（bun 系、破壊的 git deny、.env read deny）+ UserPromptSubmit/PreToolUse/PostToolUse/Stop の4イベント登録 |
| 7 | 新スキル | verify-doc-integrity（docs-only コミットの代替検証の実体、bun 調整）/ diff-review-report（docs/audit/diff-*.md、時点記録）→ 21 スキル |
| 8 | 不採用の判断 | deep-dive-setup（pnpm setup テンプレ専用）、テンプレ版 determinism/testing 等の汎用スキル（既存の方が詳細）、restore-env.sh（corepack+pnpm; bun 版が正）、rules/project-template.md（テンプレ利用時専用）。`.agent/README.md` に採用/不採用の対応表を記録 |
| 9 | AGENTS.md 現構成化 | タイトル AGENT.md→AGENTS.md、冒頭をCoDM方針+Next.js現構成に改訂、§3.1 check:all 推奨+next build+web 検証追加、§4.1.1 HEAD巻き戻り追記、§6.1 全面更新（Next 16 / TS 6 ピン / Biome 除外範囲）、§6.4 preview 行、§6.5 noConsole 旧パス撤去、§7.2 報告テンプレ、§8 新ディレクトリ構成表+8.4 rules 追加+8.5 gitignore 例外 |
| 10 | 整合 | skills/index（+2行・rules 案内）、hooks/index（新フック行・settings 移設・終了コード規約）、pre-task/log-task（21 スキル）、.gitignore（settings.local.json / agent-memory/）、biome.json `files.includes=["**","!apps/web","!.agent"]`（workflows/*.js は DSL のため除外 + useBiomeIgnoreFolder 警告修正） |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- TEMPLATE_REPO は cod-web の arena ブランチから汎用化されたもの（README に「cod-web最新arena由来」多数）。**逆輸入時はテンプレの汎用スキルで既存の詳細スキルを上書きしない**こと（情報が薄まる）。
- `.agent/workflows/*.js` は Claude Code の DSL（トップレベル return / 暗黙 globals）なので Biome 対象に入れると即エラー。`files.includes` で `.agent` ごと除外が正解。
- Biome 2.2+ ではフォルダ除外に `/**` 不要（useBiomeIgnoreFolder 警告）。`!apps/web` 形式に統一。
- settings.json は公式準拠だと `.agent/settings.json`（ディレクトリ直下）。hooks/ 配下に置くのは旧配置。移設時は hooks/index と AGENTS.md §8 の参照更新が必要。
- hooks のファイル名はテンプレ（verify-commit.md 等）に合わせず**既存名を維持**（verify-before-commit.md 等）。過去ログ・AGENTS.md からの参照を壊さないため。

## 4. 次にすべきこと (Next Actions)

1. R1 リサーチ or S フェーズ設計の GO 待ち（従来どおり）。
2. サブエージェント（agents/）・workflows は Claude Code 系ランタイムでのみ自動発火。他エージェントでは手順書として参照する運用。
3. `docs/README.md` に `.agent/README.md` への案内を追加するか検討（次の docs タスクで）。

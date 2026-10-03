# .agent/ — Agent設定ディレクトリ（cod-web）

> 本ディレクトリは Claude Code 公式の `.claude/` ディレクトリ構成に準拠しつつ、すべての Agent に対応するため
> ディレクトリ名は `.agent/` に統一しています（`.claude/` は廃止・使用禁止、AGENTS.md §4.5/§8.5）。
> 構成は shiratama644/TEMPLATE_REPO を本リポジトリ専用に最適化して導入（2026-10-03）。

## ディレクトリ構成

```
.agent/
├── settings.json              # チーム共有設定（permissions, hooks 登録）— コミット対象
├── settings.local.json        # 個人オーバーライド（gitignore）— 個人のみ
├── rules/                     # トピック別ルール（paths で発火条件）
│   ├── 01_information-hierarchy.md   # 情報の正・編集可否（logs/audit は追加のみ）
│   ├── 02_git-workflow.md            # Git運用・2種の環境復旧診断
│   ├── 03_doc-style.md               # ドキュメント書式・命名・リンク
│   └── 04_verification.md            # bun 検証ゲート（check:all / 4+3 / apps/web）
├── skills/<name>/SKILL.md     # Agent のノウハウ（21スキル、入口は skills/index.md）
├── agents/                    # サブエージェント定義
│   ├── explore.md / plan.md / code-reviewer.md / doc-editor.md / test-writer.md
├── hooks/                     # フック手順(.md) + 実行スクリプト(.sh)（入口は hooks/index.md）
│   ├── index.md / pre-task.md / verify-before-commit.md / log-task.md
│   ├── sandbox-rebuild-recovery.md   # 完全再構築 + HEAD巻き戻りの診断表
│   ├── restore-sandbox-env.sh        # bun を npm 経由で導入 + install（bun.sh は到達不可）
│   ├── pre_edit_guard.sh             # PreToolUse: 編集禁止領域ブロック（exit 2）
│   └── post_edit_verify.sh           # PostToolUse: .env混入 / docs目次 / packageManager検証
├── commands/                  # 旧commands互換（commit / review / test）
├── output-styles/             # 出力スタイル（concise / detailed = AGENTS.md §7.2 準拠）
├── workflows/                 # 動的ワークフロー（implement-task.js: Explore→Plan→Implement→Verify）
├── agent-memory/              # サブエージェント永続メモリ（自動生成, gitignore）
└── logs/                      # タスク実行ログ（追加のみ、書き換え禁止）
    └── YYYY-MM-DD_<summary>.md
```

## 運用ルール（要点）

- **settings.json** はチーム共有。個人の上書きは `settings.local.json`（gitignore 済）。
- **rules/** は `paths` フロントマターで発火条件を絞る。AGENTS.md の詳細版であり矛盾させない。
- **skills/** は `<name>/SKILL.md` 形式、frontmatter に `name` / `description` 必須。入口は [`skills/index.md`](./skills/index.md)（全スキルを常に読まない）。
- **hooks/** のトリガー対応は [`hooks/index.md`](./hooks/index.md)。自動実行は `settings.json` の `hooks` に登録。
- **logs/** は**追加のみ**。過去ログの書き換え・一括置換への巻き込みは厳禁（AGENTS.md §8.5）。
- スキル/ルール/フック/エージェントを更新したら対応 index / 本 README も更新する（腐らせない）。

## TEMPLATE_REPO からの採用と差分（2026-10-03）

| 項目 | 判断 |
|---|---|
| rules/ agents/ commands/ output-styles/ workflows/ README | 採用（bun / cod-web 構成に書き換え） |
| pre_edit_guard.sh / post_edit_verify.sh | 採用（保護対象 + bun packageManager 検証に調整） |
| settings.json（permissions + 4イベント登録） | 採用（pnpm→bun、`.agent/settings.json` に配置） |
| verify-doc-integrity / diff-review-report スキル | 採用（bun / docs 構成に調整） |
| deep-dive-setup スキル | 不採用（`pnpm setup` テンプレ専用。要求深掘りは `codm-research` 等で代替） |
| determinism / testing 等の汎用スキル | 不採用（本リポジトリの `deterministic-sim` 等の方が詳細なため既存を維持） |
| restore-env.sh（corepack+pnpm） | 不採用（bun 版 `restore-sandbox-env.sh` が正） |
| rules/project-template.md | 不採用（テンプレ利用時専用。本リポジトリは AGENTS.md §6 に反映済み） |
| hooks のファイル名 | 既存名を維持（`verify-before-commit.md` 等。過去ログ・AGENTS.md からの参照を壊さない） |

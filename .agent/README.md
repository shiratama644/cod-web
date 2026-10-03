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
│   ├── restore-sandbox-env.sh        # pnpm を npm 経由で導入 + install（2026-10-03 bun→pnpm 移行）
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

## TEMPLATE_REPO からの追加採用（第2弾: scripts / workflows / meta、2026-10-03）

| テンプレ資産 | 判断 |
|---|---|
| scripts/verify-docs.ts | 採用（bun 版に書き直し。対象 = docs/ + .agent/(logs除く) + ルート md、PM 検査は pnpm-lock.yaml 整合に変更） |
| scripts/check-env.ts | 採用（Termux 診断を捨て、cod-web 実績事故の検出器に全面書き直し: tsgo 混入・@types/react 二重化・Biome スキーマ乖離・husky） |
| scripts/check-security.ts | 採用（pnpm audit/SBOM 版を縮約: シークレットスキャン + `bun audit --audit-level=high`、ignore は理由+確認日必須） |
| bench（vitest bench + bench/） | 採用（protocol packer encode/decode の実ベンチに差し替え。ゼロアロケーション文化の回帰検知） |
| cspell | 採用（コード識別子のみ対象、CJK 除外、CoDM/netcode 辞書） |
| .github/workflows: codeql / dependency-review | 採用（CodeQL は依存インストール不要の構成に縮約。quality-gates.yml = 品質ゲート唯一正本は維持） |
| ISSUE/PR テンプレ・CODEOWNERS・SECURITY.md・.editorconfig | 採用（cod-web の領域・7 ゲート・IP 境界に合わせ書き換え） |
| scripts/setup.ts（pnpm setup） | **不採用（ユーザー明示指示）** |
| check-cicd.ts / lib/(detector・cache・termux 等) | 不採用（テンプレの自動検出基盤専用。cod-web は構成固定） |
| knip / jscpd / stryker(mutation) / type-coverage / dep-cruise | 不採用（ゲート過多。Biome + coverage 85% + 決定論ガードで回帰は検知可能。必要になれば個別導入） |
| size-limit / publint / changesets / release / taze / renovate | 不採用（npm 公開パッケージではない。依存更新は `security:check` + 手動） |
| lighthouse / a11y / visual / bundle-size / preview / stale / automerge / label の各 workflow | 不採用（デプロイ先・PR 流量が前提。bundle 監視は `next build` ルート表で代替） |
| docker / devcontainer / bin/create-template.mjs / FUNDING | 不採用（対象外） |

## bun→pnpm 全面移行（2026-10-03、ユーザー指示）

- パッケージマネージャを **pnpm** に移行（`packageManager: pnpm@10.34.6` / `pnpm-workspace.yaml` / `pnpm-lock.yaml`。bun.lock と bunfig.toml は削除）
- TS スクリプト（scripts/*.ts）は **tsx** 実行に移植（Bun API → node:child_process 等）
- **gameserver の実行ランタイムのみ bun 継続**（`Bun.serve`。devDependencies.bun → `node_modules/.bin/bun`）
- 上記 2026-10-03 採用表の「bun 版に書き直し」等の記述は当時の記録（現在は pnpm 版が正: `bun-runtime/SKILL.md` 参照）

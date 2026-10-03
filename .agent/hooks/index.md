# Hooks Index — 定型ワークフロー & トリガー

> このファイルは `.agent/hooks/` の**入口**。特定トリガー時に本ファイルで該当フックを特定し、
> 手順（`.md`）やスクリプト（`.sh`）を実行する。作業規約の本体は `AGENTS.md`（§2/§3/§4）と [`../rules/`](../rules/)。
> ここは「いつ・どのフック」の索引と、再利用可能な具体手順。
>
> ディレクトリ構造は Claude Code 準拠: 実行スクリプトを `.sh` で置き、トリガー登録は
> [`../settings.json`](../settings.json)（`hooks.<event>`、2026-10-03 に `.agent/settings.json` へ移設）で行う。
> 手順 md は人間/Agent の参照用、自動実行は `.sh` + settings.json のハイブリッド構成（TEMPLATE_REPO 統合）。

## トリガー → フック 対応表

| トリガー（いつ） | フック | 形式 | 登録先 |
| :--- | :--- | :--- | :--- |
| **タスク開始時**（ユーザー指示を受けた直後） | [`pre-task.md`](./pre-task.md) | 手順 | `UserPromptSubmit`（git 現状把握のみ自動） |
| **編集前**（Edit/Write 前） | [`pre_edit_guard.sh`](./pre_edit_guard.sh) | スクリプト | `PreToolUse`（禁止領域は exit 2 でブロック） |
| **編集後**（Edit/Write 後） | [`post_edit_verify.sh`](./post_edit_verify.sh) | スクリプト | `PostToolUse`（.env混入/目次/packageManager） |
| **commit 直前**（§3.1 検証） | [`verify-before-commit.md`](./verify-before-commit.md) | 手順 | 手動参照 + `Stop` |
| **タスク完了時**（ユーザー指示を完了した直後） | [`log-task.md`](./log-task.md) | 手順 | 手動参照 |
| **Sandbox 再構築を検知**（`git status` が大量削除/未追跡, node_modules 無, ログが起点1件） | [`sandbox-rebuild-recovery.md`](./sandbox-rebuild-recovery.md) + [`restore-sandbox-env.sh`](./restore-sandbox-env.sh) | 手順 + スクリプト | 手動参照 |
| **HEAD のみ巻き戻りを検知**（HEAD が古いのにワークツリーは最新、push 済み作業が diff に見える） | [`sandbox-rebuild-recovery.md`](./sandbox-rebuild-recovery.md) の診断表（`reset --soft`、**--hard 禁止**） | 手順 | 手動参照 |

## フック一覧

| ファイル | 実行トリガー | 対象 / 内容 |
| :--- | :--- | :--- |
| [pre-task.md](./pre-task.md) | タスク開始時 | 現状把握（git status/branch/log + HEAD巻き戻り診断 + pnpm PATH復旧）→ `.agent/skills/index.md` から必要スキルをピンポイント読込（21スキル、タスクに必要な1-2個だけ）→ ゲームループ分離・ゼロアロケーション・決定論・メモリリーク・coverage方針の意識 |
| [verify-before-commit.md](./verify-before-commit.md) | commit 直前 | 推奨 `pnpm run check:all` 一発（7タスク）。または 4+3 検証（typecheck/biome/test:unit/build(next) + check:determinism/test:coverage/test:e2e -- --list）+ apps/web(Next) は `cd apps/web && typecheck && lint` + ゼロアロケ/メモリリーク/proposal残存監査 + 意図しない差分の確認 |
| [log-task.md](./log-task.md) | タスク完了時 | `.agent/logs/YYYY-MM-DD_<summary>.md` 作成（4 セクション）→ 重要知見を `.agent/skills/` へ同期（21スキル、一覧は `skills/index.md`）→ `skills/index.md` + 本 index の「最終更新」更新 |
| [sandbox-rebuild-recovery.md](./sandbox-rebuild-recovery.md) | Sandbox 再構築 / HEAD巻き戻り検知時 | 診断表で2パターンを区別: 完全再構築 = `git fetch` → `reset --hard FETCH_HEAD`（例外的許可）→ `restore-sandbox-env.sh`。HEADのみ巻き戻り = `reset --soft origin/<branch>`（--hard 禁止）。復旧後は git log でリモート先端と一致確認 |
| [restore-sandbox-env.sh](./restore-sandbox-env.sh) | 上記から呼出 | npm 経由で bun を導入（package.json devDependencies.bunからversion読む）+ `pnpm install --frozen-lockfile` |
| [pre_edit_guard.sh](./pre_edit_guard.sh) | PreToolUse | 編集禁止領域（.git/, node_modules/, dist/, .next/, coverage/, .archive/）への変更をブロック（exit 2） |
| [post_edit_verify.sh](./post_edit_verify.sh) | PostToolUse | 機密ファイル混入・docs/README 目次・packageManager=pnpm の事後検証（exit 1 = 警告） |

> 登録マニフェストは [`../settings.json`](../settings.json)（permissions + `UserPromptSubmit` / `PreToolUse` / `PostToolUse` / `Stop` の4イベント）。
> 旧 `.agent/hooks/settings.json` は 2026-10-03 に `.agent/settings.json` へ移設（TEMPLATE_REPO 公式準拠の配置）。

## 運用ルール

- フックは**必須実行**ではなく「該当トリガー時に**必ず参照すべき**手順」。迷ったら該当フックを読む。
- 新フック追加時は本 index の「対応表」「一覧」の両方、および [`../settings.json`](../settings.json) へ登録する。
- 実行スクリプト（`.sh`）は POSIX sh で書く（bash/zsh 依存文法は使わない）。終了コード: `0`=許可/OK、`1`=検証NG（警告）、`2`=PreToolUse のみ編集ブロック。
- フック内のコマンドは `package.json` script or 既知コマンドのみ（捏造禁止, AGENTS.md §3.1）。

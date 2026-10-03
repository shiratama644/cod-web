# Hooks Index — 定型ワークフロー & トリガー

> このファイルは `.agent/hooks/` の**入口**。特定トリガー時に本ファイルで該当フックを特定し、
> 手順（`.md`）やスクリプト（`.sh`）を実行する。作業規約の本体は `AGENT.md`（§2/§3/§4）。
> ここは「いつ・どのフック」の索引と、再利用可能な具体手順。
>
> ディレクトリ構造は Claude Code 準拠: 実行スクリプトを `.sh` で置き、トリガー登録は
> [`settings.json`](./settings.json)（Claude Code の `hooks.events` と同型）で行う。

## トリガー → フック 対応表

| トリガー（いつ） | フック | 形式 |
| :--- | :--- | :--- |
| **タスク開始時**（ユーザー指示を受けた直後） | [`pre-task.md`](./pre-task.md) | 手順 |
| **commit 直前**（§3.1 検証） | [`verify-before-commit.md`](./verify-before-commit.md) | 手順 |
| **タスク完了時**（ユーザー指示を完了した直後） | [`log-task.md`](./log-task.md) | 手順 |
| **Sandbox 再構築を検知**（`git status` が大量削除/未追跡, node_modules 無, ログが起点1件） | [`sandbox-rebuild-recovery.md`](./sandbox-rebuild-recovery.md) + [`restore-sandbox-env.sh`](./restore-sandbox-env.sh) | 手順 + スクリプト |
| **HEAD のみ巻き戻りを検知**（HEAD が古いのにワークツリーは最新、push 済み作業が diff に見える） | [`sandbox-rebuild-recovery.md`](./sandbox-rebuild-recovery.md) の診断表（`reset --soft`、**--hard 禁止**） | 手順 |

## フック一覧

| ファイル | 実行トリガー | 対象 / 内容 |
| :--- | :--- | :--- |
| [pre-task.md](./pre-task.md) | タスク開始時 | 現状把握（git status/branch/log + HEAD巻き戻り診断 + bun PATH復旧）→ `.agent/skills/index.md` から必要スキルをピンポイント読込（19スキル、タスクに必要な1-2個だけ）→ ゲームループ分離・ゼロアロケーション・決定論・メモリリーク・coverage方針の意識 |
| [verify-before-commit.md](./verify-before-commit.md) | commit 直前 | 推奨 `bun run check:all` 一発（7タスク）。または 4+3 検証（typecheck/biome/test:unit/build(next) + check:determinism/test:coverage/test:e2e -- --list）+ apps/web(Next) は `cd apps/web && typecheck && lint` + ゼロアロケ/メモリリーク/proposal残存監査 + 意図しない差分の確認 |
| [log-task.md](./log-task.md) | タスク完了時 | `.agent/logs/YYYY-MM-DD_<summary>.md` 作成（4 セクション）→ 重要知見を `.agent/skills/` へ同期（19スキル、一覧は `skills/index.md`）→ `skills/index.md` + 本 index の「最終更新」更新 |
| [sandbox-rebuild-recovery.md](./sandbox-rebuild-recovery.md) | Sandbox 再構築 / HEAD巻き戻り検知時 | 診断表で2パターンを区別: 完全再構築 = `git fetch` → `reset --hard FETCH_HEAD`（例外的許可）→ `restore-sandbox-env.sh`。HEADのみ巻き戻り = `reset --soft origin/<branch>`（--hard 禁止）。復旧後は git log でリモート先端と一致確認 |
| [restore-sandbox-env.sh](./restore-sandbox-env.sh) | 上記から呼出 | npm 経由で bun を導入（package.json devDependencies.bunからversion読む）+ `bun install --frozen-lockfile` |
| [settings.json](./settings.json) | — （Claude Code 準拠の登録マニフェスト） | `hooks.<event>` にトリガー → コマンドを登録。本表の手順/スクリプトと対応。 |

## 運用ルール

- フックは**必須実行**ではなく「該当トリガー時に**必ず参照すべき**手順」。迷ったら該当フックを読む。
- 新フック追加時は本 index の「対応表」「一覧」の両方、および [`settings.json`](./settings.json) へ登録する。
- 実行スクリプト（`.sh`/`.py`）は `kebab-case` + 拡張子。手順は `kebab-case.md`。
- フック内のコマンドは `package.json` script or 既知コマンドのみ（捏造禁止, AGENT.md §3.1）。

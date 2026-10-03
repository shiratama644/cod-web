---
paths:
  - ".agent/hooks/**"
  - "AGENTS.md"
---

# Rule 02: Git運用 & 環境復旧ルール

> 優先度: **CRITICAL** — 実行環境消失時の復旧チェックポイントとして Git を扱う
> 本体は AGENTS.md §4。ここは要点と cod-web 実測の復旧パターン。

## 1. 作業開始時の現状把握（必須）

```bash
git status
git branch --show-current
git log -5 --oneline
```

- 未コミット変更があれば勝手に破棄・混入しない。
- ブランチ名はセッションごとに変わる。必ず `git branch --show-current` で確認し、過去のブランチ名を文書に残さない。
- pnpm が無いことが多い: `bash .agent/hooks/restore-sandbox-env.sh; export PATH=$PATH:/usr/local/bin` を最初に実行。

## 2. 環境異常の診断（cod-web 実測、2パターン）

| 症状 | 診断 | 復旧 |
|---|---|---|
| ワークツリーも古い（大量削除+未追跡、node_modules 無、ログ起点1件） | **Sandbox 完全再構築** | `git fetch origin <branch>` → `git reset --hard FETCH_HEAD`（この時のみ --hard 許可）→ `restore-sandbox-env.sh` |
| **ワークツリーは最新だが HEAD だけ古い**（push 済み作業が diff に見える、`git rm` が "local modifications" で失敗） | **HEAD のみ巻き戻り**（頻発） | `git fetch origin <branch>` → `git reset --soft origin/<branch>` → `git reset -q`。**--hard 厳禁**（最新ツリーを過去で潰す） |

詳細: [`../hooks/sandbox-rebuild-recovery.md`](../hooks/sandbox-rebuild-recovery.md)

## 3. コミットルール

- 検証（§3.1 の 4+3 または `pnpm run check:all`）全 PASS 時のみコミット。docs-only は整合性確認で代替可。
- Conventional Commits + タスク ID をスコープに（例: `feat(PH1-A): binary reader bounds`）。
- pre-commit hook はフル検証を回すため 15s timeout の恐れ。docs-only は `--no-verify` 可。**commit と push は別の bash 呼び出しに分離**（push 単体でも timeout し得るため）。

## 4. 厳禁な Git 操作

- `git reset --hard` / `git clean -fd`（例外は上表の完全再構築時の `reset --hard FETCH_HEAD` のみ）
- `git rebase` / `git commit --amend` / `git push --force*`

## 5. Push の事前許可（恒久合意）

- 検証 PASS + 意図しない差分なしを確認したら、その場で `git push origin <セッション固定ブランチ>`（push ごとの確認不要）。
- push 先はセッション固定ブランチのみ。feature branch は切らない。PR 作成（`gh pr create`）も許可済み。
- 認証エラー時はユーザーに GitHub 再接続を依頼する（トークン等をチャットで要求しない）。

---
description: 変更を検証し、Conventional Commits形式でコミットする。Use when you want to commit changes after verification.
---

# Commit Command

変更を検証し、コミットする手順。詳細は [`../hooks/verify-before-commit.md`](../hooks/verify-before-commit.md)。

## 手順

1. **現状確認**:
   ```bash
   git status && git diff --stat && git log -5 --oneline
   ```

2. **検証**:
   ```bash
   pnpm run check:all          # 推奨（7タスク一括）
   # apps/web を触った場合は追加
   cd apps/web && pnpm run typecheck && pnpm run lint
   ```
   1つでも失敗したら原因を特定して修正し、再検証。docs-only は整合性確認で代替可。

3. **差分確認**: `git diff` で意図しない変更が含まれていないか確認。

4. **コミット**（Conventional Commits + タスクID、docs-only は `--no-verify` 可）:
   ```bash
   git add <対象ファイル>
   git commit -m "feat(PH3-B): <変更内容>"
   ```

5. **プッシュ**（commit とは別の bash 呼び出しで。§4.3.1 で事前許可済み）:
   ```bash
   git push origin <現在のブランチ>
   ```

## 禁止事項

- 検証 FAIL のままコミットしない
- `git reset --hard` / `git push --force` / `--amend` / rebase は使わない
- 意図しないファイル・`.agent/logs/` の過去ログ変更を混ぜない

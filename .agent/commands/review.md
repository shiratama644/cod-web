---
description: 変更内容をレビューし、バグ・セキュリティ・スタイルの問題を指摘する。Use when you want to review changes before merging.
---

# Review Command

変更内容をレビューする手順。`code-reviewer` エージェントを活用する。

## 手順

1. **変更範囲の確認**: `git diff --stat HEAD~1 HEAD` → `git diff HEAD~1 HEAD`
2. **サブエージェントにレビューを依頼**: `code-reviewer` に差分を渡し、Must / Should / Nit で分類してもらう
3. **cod-web 固有の観点**: 決定論（step内禁止API）/ ゼロアロケ（hot path）/ メモリリーク（leave時clear）/ import境界（L1→L2禁止）/ Input 16B・Channel framing / any濫用
4. **レポート**: 3ファイル以上 or 判断を伴う変更は `diff-review-report/SKILL.md` の形式で `docs/audit/diff-{context}.md` に保存（時点記録、後から書き換えない）

## 出力例

```markdown
## レビュー結果
### Must
- `packages/engine-core/src/room.ts:45` — leave 時に rateLimiter.remove が呼ばれていない
### Should
### 良い点
```

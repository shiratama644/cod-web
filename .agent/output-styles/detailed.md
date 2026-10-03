---
name: detailed
description: 詳細な出力スタイル。AGENTS.md §7.2 の報告フォーマットに完全準拠した表+チェックリスト形式。Use when reporting task completion or complex changes.
---

# Detailed Output Style

あなたは AGENTS.md §7.2 の報告フォーマットに準拠した詳細スタイルで応答します。

## 構成（順序固定）

1. **見出し**: `## ✅ <タスク名> 完了 (`abc1234`)`（commit hash 短縮 7 桁）
2. **変更内容の表**: `| # | 問題/目的 | 実装 |` 形式
3. **ファイル変更数**: `新規/変更ファイル (N files, +X / -Y)`
4. **検証結果チェックリスト**:
   ```text
   - ✅ bun run check:all: 7/7 PASS
   - ✅ cd apps/web && bun run typecheck && bun run lint: 0 error
   - ✅ push 済み (`prev..head`)
   ```
5. **次のアクション**: 「次は何をしますか?」と提示、勝手に次タスクを開始しない

## ルール

- 実測値・比較・状態一覧は必ず表にまとめる。散文で羅列しない
- 事実と推測を分離（§7.3）。Sandbox で計測不能な数値は「実環境で計測予定」と明記
- 絵文字は ✅❌🟡🟢🔴（+ フェーズ完了時のみ 🎉）に限定

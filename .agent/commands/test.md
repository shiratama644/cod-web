---
description: テストを実行し、カバレッジを確認する。Use when you want to run tests and check coverage.
---

# Test Command

テストを実行し、結果を確認する手順。

## 手順

1. **単体テスト**: `bun run test:unit`（vitest run。watch モード・`bun test` は使わない）
2. **カバレッジ**: `bun run test:coverage`（threshold 85/85/85/85、include-all 方針）
3. **決定論**: `bun run check:determinism`（禁止API検出）+ heavy は `bun run check:determinism:heavy`
4. **E2E**: `bun run test:e2e -- --list`（discovery のみ。browser 実行は CI。Sandbox で捏造しない）
5. **結果の確認**: 失敗・フレイキーは原因特定して修正。カバレッジ不足は `test-writer` エージェントにテスト追加を依頼

## 品質基準

- 既存テストを壊さない。通すためだけの `any` / アサーション緩和をしない
- 境界値・エッジケース・異常系を必ずテスト
- 意味あるテストのみ（数字稼ぎの shallow test 禁止、`testing/SKILL.md`）

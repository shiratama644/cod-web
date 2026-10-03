# 2026-10-03 拡張性の恒久ルール化(ユーザー指示)

## 指示
voxel 等「全く異なるゲーム」を将来追加する可能性を含めて、**拡張性を高く実装することを忘れない**こと。
(前提: voxel 実装自体は現時点では絶対に追加しない — 同日の別指示)

## 反映箇所
| ファイル | 内容 |
|---|---|
| docs/planning/HANDOFF.md | 決定 **D25** を追加(異種ゲームタイプ追加を見据えた拡張性の常時維持) |
| AGENTS.md §6.4 | L1 type分岐禁止の直前に拡張性原則を追加(「profile 層か engine-core 層か」の自問を義務化) |
| .agent/hooks/pre-task.md §5 | タスク開始時チェックに拡張性原則を追加 |
| .agent/skills/gamemode-api/SKILL.md | 注意事項に D25 を追記 |

## 既存アーキテクチャとの関係(新規発明ではなく既存方針の明文化・格上げ)
- SimProfile 注入: engine-core は `@cod/profile-*` を import しない(Biome noRestrictedImports で機械監査)
- `TYPE_SPECS` 契約: fps 実使用 + voxel は契約のみ(PH2-A)
- gamemode-api: `parentGenre: 'fps' | 'voxel'`、defineGameMode で異種タイプ登録可能
- マップ: JSON 定義・マルチマップ前提(2026-09-24 ユーザー合意、00_scope §1.4)

## 検証
- `bun run verify:docs`: PASS(リンク整合)
- ドキュメントのみの変更のためコード検証はスキップ(AGENTS.md §3.1)

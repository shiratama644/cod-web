---
paths:
  - "**/*.md"
  - "docs/**"
  - ".agent/**"
---

# Rule 01: 情報の正と編集ルール

> 優先度: **CRITICAL** — 他の全ルールに優先する

## 1. 「正」の対応表（cod-web）

| 用途 | 参照すべき情報源 | 編集可否 | 備考 |
|---|---|---|---|
| 作業規約・開発ワークフロー | `AGENTS.md` | ✅ 編集可（主に §6 固有事項） | 常に正。速さより復旧可能性を優先 |
| 進捗・タスク状態の正本 | `docs/task-list.md` | ✅ 編集可（状態・証拠の更新） | 矛盾時は本ファイルを正とする。タスクID再利用禁止 |
| 設計仕様書 | `docs/arch/*` | ✅ 編集可 | どう作るか（product / architecture / protocol / engineering / adr / milestones 等） |
| 個別タスクの詳細計画 | `docs/planning/*_PLAN.md` | ✅ 編集可（計画時） | `_TEMPLATE.md` 準拠。**計画書 > AGENTS.md**（§6.8） |
| CoDM リサーチ成果物 | `docs/research/codm/*` | ✅ 編集可 | 基準は `00_scope.md` §1.4 ハイブリッド。検証ラベル必須（`codm-research/SKILL.md`） |
| 監査・差分・バグ | `docs/audit/*` | ⚠️ 追加のみ | 時点記録、書き換え禁止 |
| タスク実行ログ | `.agent/logs/*` | ⚠️ **追加のみ** | 過去ログの書き換え・一括置換への巻き込みは厳禁（AGENTS.md §8.5） |
| コードベース知識（ノウハウ） | `.agent/skills/*/SKILL.md` | ✅ 知見が得られたら更新 | 更新時は `skills/index.md` の最終更新も |
| トピック別ルール | `.agent/rules/*` | ✅ 編集可 | AGENTS.md の詳細版。paths で発火条件 |
| Agent 設定 | `.agent/settings.json` | ✅ 編集可（チーム共有） | permissions, hooks 登録 |
| 個人オーバーライド | `.agent/settings.local.json` | ✅ 個人のみ（gitignore） | コミットしない |
| 旧仕様アーカイブ | `.archive/docs/*` | ❌ 原則触らない | 正本にしない。lint/test/build 対象外 |

## 2. 鉄則

1. **進捗は `docs/task-list.md` のみを正本とする**。チャット・PR・ログと矛盾したら本ファイルを正とする。
2. **仕様は `docs/arch/` が正本**。計画は `docs/planning/`、リサーチは `docs/research/codm/`。
3. **スキルはノウハウ、AGENTS.md は規約、rules/ はトピック別詳細**。重複させない。
4. **ドキュメント追加・削除・移動時は目次（`docs/README.md` / `docs/arch/README.md` / 各 index.md）を更新する**。参照切れを残さない。
5. **`.claude/` は廃止・使用禁止**。正本は `.agent/` のみ（AGENTS.md §4.5）。

## 3. 禁止操作

- `docs/task-list.md` のタスク ID の再利用
- `.agent/logs/` / `docs/audit/` の過去記録の書き換え（一括置換・リネームの射程にも含めない。必要ならユーザーへ事前確認）
- `AGENTS.md` の汎用節（§1〜§5）の勝手な削除・大幅書き換え
- 完了したタスクの計画書・ログの削除（履歴として残す）

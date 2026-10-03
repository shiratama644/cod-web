# 2026-10-03 ドキュメント完全整理(docs/ + .agent/ 参照)

## 依頼

ドキュメント(agent 管理ドキュメント含む)を完全に整理し、それぞれのフォルダにあったファイル構成にする。

## 実施内容

### 移動(git mv)

| 移動元 | 移動先 | 理由 |
|---|---|---|
| `docs/planning/PHASE01_PLAN.md` ほか PHASE01_5/02/03/04, EM01, EM02(計 7 本) | `docs/planning/complete/` | 全てローカル検証済み=完了済み計画 |
| `docs/planning/SANDBOX_FILTER_DISCUSSION.md` / `SANDBOX_FINAL_AGREED.md` / `SANDBOX_SPEC整理.md` | `docs/planning/complete/` | 2026-09-22 合意記録。arch 反映済み |
| `docs/planning/ARSENAL_IO_DESIGN_PLAN.md` | `.archive/docs/planning/` | ヘッダに SUPERSEDED(2026-09-24)・未実装と明記。正本にしない旧計画の退避先前例(.archive)に従う |
| `docs/Perplexity-AI.md` | `docs/research/` | raw DeepResearch 入力は調査ディレクトリに属する |

planning/ 直下残留: `README.md` / `_TEMPLATE.md` / `HANDOFF.md` / `CODM_DEEP_RESEARCH_PLAN.md`(現用のみ)。

### 索引の書き直し

- `docs/README.md`: ディレクトリツリー・読む順を実体と一致させた(CoDM R フェーズ入口、research/codm/、complete/ 構成、Perplexity の新パスを反映)。
- `docs/planning/README.md`: 現用 3 本+完了済み 10 本+ARSENAL 退避の一覧へ全面更新。「次に着手可能」を R1(GO 待ち)に更新。
- `docs/planning/complete/README.md`: 2 本のみ → 9 計画+SANDBOX 合意記録 3 本の全掲載に更新。
- `docs/research/README.md`: Perplexity-AI.md(同階層)と codm/(現用 R フェーズ)を追加。
- `docs/マルチタイプ・ゲームプラットフォーム 設計書.md`(互換スタブ): PHASE01 前提の導線を planning/README 経由に修正。

### リンク修正

- verify:docs が列挙した 43 件のリンク切れを全修正(complete/ 配下へ移った計画の `../arch/` → `../../arch/`、HANDOFF/task-list/research/設計書スタブの旧パス)。
- `.agent/skills/` 10 本(e2e / babylon-engine / ci-quality-gates / deterministic-sim / gamemode-api / import-boundaries / memory-leak / networking / testing / zero-alloc)のプレーンテキスト参照 `docs/planning/*_PLAN.md` → `docs/planning/complete/*_PLAN.md`。
- 表示テキストと href の不一致(HANDOFF ヘッダ、SYNTHESIS、DR-5)も解消。

### 触っていないもの

- `.agent/logs/`(追記専用)・`docs/audit/`・`.archive/` の既存内容。
- HANDOFF.md の本文(ヘッダの「Phase 4 完了・Phase 5 待ち」等の歴史的記述はリンク修正のみ)。
- `docs/ops/quality-gates.md` の更新履歴文中の `PHASE04_PLAN.md改訂版` 等はパスでない歴史的記述のため据え置き。
- `.agent/` の構成自体(README ツリー・hooks/skills index は実体一致を確認済みのため変更不要)。

## 検証

- `bun run verify:docs` PASS(リンク切れ 0 / .env 未追跡 / bun.lock のみ)
- `bun run spell` 93 files, 0 issues
- `bun run check:all` 7/7 PASS

# DOC-4 — 現用ドキュメントの公式 API 監査

> Date: 2026-09-06(JST) / Commit: 本コミット / Branch: arena/01a0748a-cod-web

## 1. 指示内容 (Task Summary)

ユーザー指示: 「またすべてのドキュメントを公式ドキュメントなどを見てAPIなどを最新のものに揃えてください。」

対象は現用ドキュメント（`README.md`, `docs/`, `.agent/skills`, `.agent/hooks`）です。`.archive/` と既存 `.agent/logs/` は過去記録として書き換えていません。

## 2. 実行内容 (Executed Actions)

| # | 対象 | 内容 |
|---|---|---|
| 1 | 公式確認 | Bun WebSocket/workspaces、Biome rules、Babylon Engine/EngineOptions、Chrome canvas desynchronized、Noa npm/history、voxel-physics-engine npm、ent-comp npm、QuickJS JSR、Colyseus Room/matchmaker を確認 |
| 2 | `docs/arch/api-sources.md` | 外部 API 確認結果を中央集約する新規ドキュメントを追加 |
| 3 | `docs/arch/*` | `EngineOptions.desynchronized` の扱い、Bun `ws.data` typing、Biome rule path、`NetTransport.bufferedAmount`、Noa/QuickJS/OSS license などを公式確認内容へ更新 |
| 4 | `docs/planning/*` / `docs/task-list.md` | Phase 1 計画と handoff の古い不一致メモを更新し、DOC-4 を完了として記録 |
| 5 | `docs/マルチタイプ・ゲームプラットフォーム 設計書.md` | 旧 v2 単一仕様書の重複・古い API 記述を廃し、現用 `arch/` への互換入口に変更 |
| 6 | `.agent/skills/tech-stack/SKILL.md` | Bun `websocket.data` 型付け、Biome rule path、Babylon/Noa 注意点をスキル化 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- Bun 最新 docs は `ws.data` の型付けを serve generic ではなく `websocket.data` property で示している。
- Bun workspaces は catalog / self-contained workspaces も公式 docs にあるが、PH1-A では単純な `workspaces` 配列で十分。
- `noa-engine@0.33.0` は `@babylonjs/core ^6.1.0` を peer dependency に持つ。fps 側の Babylon 導入と voxel 側 Noa 導入は major の確認タイミングを分ける。
- `ent-comp` は npm metadata 上 MIT。旧 `legal.md` の「要確認」は更新できる。
- 旧 v2 単一仕様書を現用 docs に残すと古い API 名が再発するため、分割済み正本への案内にする方が安全。

## 4. 検証

- `bun run typecheck`: pass
- `bunx biome lint .`: pass（既存 `$schema` 2.5.11 vs CLI 2.5.12 の info あり）
- `bun run test:unit`: pass（11 files / 72 tests）
- `bun run build`: pass（既存 large chunk warning あり）
- markdown relative link check: 32 md files checked / broken 0

## 5. 次にすべきこと (Next Actions)

次の実装タスクは引き続き PH1-A（bun workspaces + fps 系へ移動）。PH1-A では `docs/arch/api-sources.md` と `PHASE01_PLAN.md` を確認してから作業する。

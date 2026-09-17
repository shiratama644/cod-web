# PLAT-1R — Phase 1 計画の公式 API 確認

> Date: 2026-09-06(JST) / Commit: 本コミット / Branch: arena/01a0748a-cod-web

## 1. 指示内容 (Task Summary)

`docs/planning/HANDOFF.md` に従い、PLAT-1R として `PHASE01_PLAN.md` の API 表を公式一次情報の Web 検索結果で書き直す。D1–D10 は維持し、PH1-A 実装はまだ行わない。

## 2. 実行内容 (Executed Actions)

| # | 対象 | 内容 |
|---|---|---|
| 1 | 環境 | `git status` / branch / log を確認。remote session branch の fetch は存在せず失敗したため、現行 clean tree のまま `restore-sandbox-env.sh` で bun と依存を復旧 |
| 2 | Web 検索 | Bun workspaces / Bun WebSocket / Bun v1.3.14 HTTP/3 制約 / Biome `noRestrictedImports` / Pointer Lock / Canvas desynchronized / Babylon Engine / npm registry を確認 |
| 3 | `docs/planning/PHASE01_PLAN.md` | §10.5 を公式一次情報ベースに差し替え。`EngineOptions.desynchronized` / `preserveDrawingBuffer` の typedoc 不一致を明示 |
| 4 | `docs/task-list.md` | PLAT-1R を完了にし、PH1-A を次に着手可能へ |
| 5 | `docs/planning/HANDOFF.md` / `docs/README.md` | PLAT-1R 前提の記述を、PLAT-1R 完了後の PH1-A handoff に更新 |
| 6 | `.agent/skills/tech-stack/SKILL.md` / index | Bun workspaces・Biome rule・Babylon EngineOptions 不一致の再利用知見をスキル化 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- Bun workspaces は root `package.json` の `workspaces` と `workspace:*` で足りる。PH1-A では未確認の catalog を使わない方が安全。
- Biome の import 制限は `linter.rules.style.noRestrictedImports`。architecture.md の `noRestrictedImports` は意図で、実設定上は style group 配下に置く。
- Babylon typedoc の `EngineOptions` 取得結果には `desynchronized` / `preserveDrawingBuffer` が出ていなかった。一方 Chrome は Canvas context attributes として両 key を公式に説明している。PH1-D では installed `.d.ts` を再確認し、型に無い key を invent しない。

## 4. 検証

- `bun run typecheck`: pass
- `bunx biome lint .`: pass（既存 `$schema` 2.5.11 vs CLI 2.5.12 の info あり）
- `bun run test:unit`: pass（11 files / 72 tests）
- `bun run build`: pass（既存の large chunk warning あり）
- markdown relative link check: broken 0

## 5. 次にすべきこと (Next Actions)

ユーザーの Go があれば PH1-A（bun workspaces + fps 系へ移動）。PH1-A では Babylon や Channel や Biome 依存規則を混ぜず、移動とビルド復旧に限定する。

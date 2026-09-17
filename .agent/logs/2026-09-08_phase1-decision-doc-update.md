# Phase 1 Decision Documentation Update

> Date: 2026-09-08(JST) / Commit: 本コミット / Branch: arena/01a0748a-cod-web

## 1. 指示内容 (Task Summary)

ユーザーから、DeepResearch 後に残った不確かな点を最終決定としてドキュメントへ反映し、まだ実装はしないよう依頼された。

反映する決定:
- Input `dtMs` はミリ秒。
- fps Snapshot は `vy` を含める。
- PH1-A の Bun workspace package name は `@cod/*`。
- Babylon `desynchronized` / `preserveDrawingBuffer` は、`@babylonjs/core` の型にあるものだけ使い、型に無い場合は後続最適化へ回す。

## 2. 実行内容 (Executed Actions)

| # | 対象 | 内容 |
|---:|---|---|
| 1 | `docs/arch/protocol.md` | OPEN-A を解決済みにし、`dtMs` をミリ秒と明記。fps Snapshot に `vy` を含める方針へ更新。 |
| 2 | `docs/arch/adr.md` | ADR-015〜018 として、`dtMs`、fps Snapshot `vy`、`@cod/*`、Babylon options 方針を追加。未決一覧から解決済み項目を削除。 |
| 3 | `docs/arch/client.md` / `docs/arch/api-sources.md` | Babylon options は型にあるものだけ使い、型に無い canvas hint は後続最適化に回す方針へ更新。 |
| 4 | `docs/arch/architecture.md` | PH1-A の内部 package name `@cod/*` を追記。 |
| 5 | `docs/planning/PHASE01_PLAN.md` / `docs/planning/HANDOFF.md` | PH1 の合意 D11〜D13 と PH1-A package naming、OPEN-A 解決を反映。 |
| 6 | `docs/task-list.md` | `PLAT-1Q` を追加し、`PH1-A` の依存を `PLAT-1Q` へ更新。OPEN-A を完了へ更新。 |
| 7 | `docs/planning/complete/PHASE00_PLAN.md` | 完了済み履歴計画に、OPEN-A は後続決定でミリ秒になった旨の注記を追加。 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- `dtMs` をミリ秒に確定すると、既存の `Math.round(1000/60)` と `DT_MS_CLAMP = 500` の意味が自然に揃う。
- fps Snapshot の `vy` は、帯域最小化だけなら省略可能だが、現行実装からの移行・補間・デバッグを優先するなら含めるほうが安全。
- Babylon の `EngineOptions` と Canvas/WebGL context attributes は同一視しない。型に無い key は渡さず、最適化は後続タスクへ分けるほうが PH1-D のリスクを下げられる。
- 完了済み計画は履歴性を残しつつ、後続で解決済みになった未決事項は注記で現在の正本へ誘導すると矛盾を避けやすい。

## 4. 次にすべきこと (Next Actions)

- 次の実装指示があれば、`PH1-A: bun workspaces + fps 系へ移動` に着手する。
- PH1-A では実装を広げず、`@cod/*` package name と `workspace:*` 参照を使った fps 系 5 workspace の移動・ビルド復旧に限定する。

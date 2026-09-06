# DOC-2 / DOC-3 / LIC-1 — AGENTS・skills 追従と MIT LICENSE

> Date: 2026-09-05(JST) / Commit: (このコミット) / Branch: arena/01a06f8b-cod-web

## 1. 指示内容 (Task Summary)

DOC-1 完了後の「おねがいします」で、残りの DOC-2（AGENTS.md を理想形へ）、DOC-3（`.agent/skills` を理想形へ）、LIC-1（ルート MIT LICENSE）を進める。フェーズ 0 計画は対象外。過去ログは書き換えない。

## 2. 実行内容 (Executed Actions)

| # | 対象 | 内容 |
|---|---|---|
| 1 | `AGENTS.md` | 冒頭・§1.2・§2・§3.1・§4.2・§6 全体・§7.4.1・§7.5 を Babylon / WS のみ / 16B Input / `docs/arch/` 正本へ |
| 2 | `.agent/skills/*` | index・project-overview・tech-stack・sandbox-constraints を書き換え。欠ファイル arch を指さない |
| 3 | `.agent/hooks/pre-task.md` `verify-before-commit.md` | 旧 tech-stack/networking/R3F 参照を arch 現行ファイルへ |
| 4 | `LICENSE` | MIT 全文（Copyright 2026 shiratama644） |
| 5 | `README.md` `docs/arch/legal.md` `docs/task-list.md` | LICENSE 配置済みに更新。DOC-2/3/LIC-1 完了 |

コード変更なし（ドキュメント・規約のみ）。

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- 現行コードの bun WS / `_tests_/` / Vite `allowedHosts` / `ws.send` 戻り値はスキルに残し、R3F/WebGPU は「破棄対象・真似しない」と明記しないとフェーズ 0 で誤って R3F を足す。
- skills/index が存在しない `docs/arch/tech-stack.md` を指していた。正本は product / protocol / engineering / adr。

## 4. 次にすべきこと (Next Actions)

- ユーザーが Go したら `PLAT-0`（フェーズ 0 計画書 `PHASE00_PLAN.md`）。
- Input `dtMs` 単位（OPEN-A）は人間確認待ち。

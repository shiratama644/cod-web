# PR #1 由来の旧ドキュメント混入を取り消し、PR #2 の状態へ戻す

> Date: 2026-09-05(JST) / Commit: 4172571 / Branch: arena/01a06d13-cod-web

## 1. 指示内容 (Task Summary)

- まずリポジトリ全体を完全に理解する。
- 理解の過程で見つかった「旧構想（CodWeb / geckos.io）ドキュメントの混入」について、
  ユーザーから経緯の説明があった: **PR #1 を通常マージ → PR #2 を強制マージ**した結果、
  古い PR #1 の内容が main に残ってドキュメントがズレた。
- ゴール: **PR #1 を取り消し、PR #2 の状態へ戻す**。

## 2. 実行内容 (Executed Actions)

| # | 手順 | 結果 |
|---|---|---|
| 1 | 環境復旧（`restore-sandbox-env.sh`）＋ 4 検証で現状把握 | typecheck 0 / lint 0 error(54 files) / vitest **51 passed**(8 files) / build 951ms・JS gzip 481KB |
| 2 | ライブ smoke（`bun run server` ＋ WS クライアント） | health 200、welcome(playerId=1)、1 秒で **29 snapshot**（30Hz）・1人 25B、入力 61 発で権威 z 0→-7.60m（MOVE_SPEED 8m/s と整合） |
| 3 | `gh pr list` ＋ `git fetch --unshallow` で PR/DAG 解析 | PR #1=955089f、PR #2 実体=d80717e、PR #3=e54515c、**origin/main は 7c69568**（e54515c とツリー同一） |
| 4 | `git diff d80717e origin/main` で混入範囲を特定 | **6 ファイルのみ**（新規 5 + `.agent/hooks/log-task.md` の 2 行）。コードへの影響ゼロ |
| 5 | 5 ファイルを `git rm` し、参照残存を grep 確認 | `docs/ARCH.md` / `docs/ROADMAP.md` / `docs/TECH_SELECTION.md` / `docs/planning/P1-C_PLAN.md` / `docs/planning/README.md` を削除。現用ドキュメントからの参照は 0 件 |
| 6 | commit（`4172571`）→ push → main 向け PR 作成 | ツリーは d80717e と一致（log-task.md の 2 行を除く） |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- **`git revert -m 1 <PR#1 のマージコミット>` は使ってはいけなかった**。PR #1 以前の main
  （`f5c630a`）は **cod-web とは無関係な別プロジェクト**（`.agent/skills/modrinth-integration.md`
  `ui-layout.md` `routing-and-pages.md` 等）の状態であり、revert すると無関係なファイルが
  大量に復活する。正しい取り消し方は「**戻したい状態（PR #2 の成果 = d80717e）のツリーに
  一致させる**」こと。マージの revert は「その親の状態に戻す」であって「そのブランチの
  変更だけを消す」ではない、という点に注意する。
- **PR のマージ順序が履歴に与える影響**: PR #1 → PR #3（PR #1 を取り込んだマージ 7c69568）
  → PR #3 マージ（e54515c）と進んだ後、main は **7c69568 に巻き戻っている**（e54515c は
  main から到達不能）。ツリーは同一なので実害はないが、「main の tip = 最後のマージコミット」
  と決めつけず `git ls-remote origin` で実際の指し先を確認すること。
- **旧ドキュメントの見分け方**: `docs/ARCH.md` `ROADMAP.md` `TECH_SELECTION.md` は
  `docs/README.md` の索引に載っていない「孤児ファイル」だった。索引に無いドキュメントは
  混入・残骸を疑う。現行の正本は `docs/arch/`（仕様）＋ `docs/task-list.md`（進捗）。
- **`.agent/logs/` は過去記録なので一括置換・削除の対象外**（AGENTS.md §8.5）。今回も
  logs 内の旧ドキュメント名への言及はそのまま残した。

## 4. 次にすべきこと (Next Actions)

- 🔴 **PR #4（OPEN・head `arena/01a062ac-cod-web` = ee80aa4）の扱いを決める**。この head は
  PR #1 を取り込み済み（`ee80aa4` の親が `955089f`）なので、**マージすると旧ドキュメントが
  再び main に戻る**。クローズを推奨。
- 🟡 `.agent/skills/project-overview.md` の進捗表が「Phase 0 未着手・src 未作成」のままで実態と
  2 フェーズ分ずれている（Phase 0 完了・Phase 1 実装済み）。
- 🟡 `GameClient` の docstring と `.agent/skills/tech-stack.md` は「入力/予測は setInterval(60Hz)
  駆動、rAF では回さない」と記述しているが、実装は `useFrame` → `frame(dt)` のアキュムレータ
  駆動。記述と実装のどちらを正とするか要判断。
- 🟡 バンドルが単一チャンク 1.73MB（gzip 481KB）で 500kB 警告。code splitting 未着手。
- 🟢 テスト件数が `docs/task-list.md` 記載の 47 件 → 実際 51 件。デッドコード
  （`src/game/scene/Objects.tsx` / `src/game/loop/useSpin.ts`）が Phase 0 の残骸として残存。
- 🟢 `biome.json` の `$schema` が 2.5.11 固定・導入版 2.5.12 で lint info 1 件。

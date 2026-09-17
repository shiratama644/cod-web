# DR-2 Additional Source Research

> Date: 2026-09-06(JST) / Commit: 本コミット / Branch: arena/01a0748a-cod-web

## 1. 指示内容 (Task Summary)

ユーザーから「Goです。現状と計画を確認してからDRに移ってください。AGENTS.md のルールを適用したまま実行してください。」と指示を受けた。DR-1 は完了済みだったため `ask_user` で次の DR 範囲を確認し、「DR-2: 追加 Deep Research」を選択された。

## 2. 実行内容 (Executed Actions)

| 項目 | 内容 |
|---|---|
| 開始前確認 | `git status --short`, `git branch --show-current`, `git log -5 --oneline` で clean / `arena/01a0748a-cod-web` / HEAD `9a9a591` を確認 |
| ルール確認 | `AGENTS.md`, `.agent/hooks/pre-task.md`, `.agent/skills/index.md`, `docs/task-list.md`, `docs/planning/DEEP_RESEARCH_PLAN.md`, `docs/research/DR-1_COMPETITOR_DEEP_RESEARCH.md` を再読 |
| ユーザー確認 | DR-1 完了済みのため、DR-2 追加調査 / 仕様反映 / PH1-A / 停止から選択してもらい、DR-2 追加調査に決定 |
| Web 調査 | bloxd 公式 Terms / Privacy、Krunker networking guide / NETWORK API、noa-engine / Babylon npm metadata、Noa history を確認 |
| GitHub clone | `/tmp/cod-web-research/noa-examples` を clone し、remote / HEAD / license / 読んだファイル一覧を記録 |
| 成果物 | `docs/research/DR-2_ADDITIONAL_SOURCE_RESEARCH.md` を追加 |
| 索引・進捗更新 | `docs/research/README.md`, `docs/README.md`, `docs/task-list.md`, `docs/planning/DEEP_RESEARCH_PLAN.md`, `docs/arch/legal.md` を更新 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- DR-1 で secondary mirror 扱いだった bloxd Terms は、公式 URL `https://bloxd.io/terms-of-service` で取得できた。
- bloxd 公式 Terms は reverse engineering / decompile / disassemble / unauthorized access を明示的に禁止しているため、live service 解析禁止の根拠を公式 URL に更新できる。
- Krunker networking guide と `api/network` direct endpoint は取得できるが、versioned / immutable permalink は確認できない。設計反映前の再取得が必要。
- `noa-engine@0.33.0` は `@babylonjs/core:^6.1.0` peer で、`noa-examples` も Babylon 6 系前提だった。cod-web の Babylon 9 系方針とは Phase 7 で smoke test が必要。

## 4. 次にすべきこと (Next Actions)

- ユーザーの Go があれば、PH1-A（bun workspaces + fps 系へ移動）に着手可能。
- Phase 7 着手前に Noa + Babylon 9 の smoke test / peer warning / bundle 重複を検証する。
- Phase 8 計画時に UGC sandbox の言語/API と公開範囲をユーザーに確認する。

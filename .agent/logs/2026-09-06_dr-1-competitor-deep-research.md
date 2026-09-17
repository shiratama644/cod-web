# DR-1 Competitor Deep Research

> Date: 2026-09-06(JST) / Commit: 本コミット / Branch: arena/01a0748a-cod-web

## 1. 指示内容 (Task Summary)

ユーザーから「Goです。現状と計画を確認してから実装に移ってください。AGENTS.md のルールを適用したまま実行してください。」と指示を受け、DOC-6 で作成済みの Deep Research 計画に従って Krunker.io / bloxd.io の network / frontend / editor / UGC / voxel 技術調査を実施する。

## 2. 実行内容 (Executed Actions)

| 項目 | 内容 |
|---|---|
| 開始前確認 | `git status --short`, `git branch --show-current`, `git log -5 --oneline` で clean / `arena/01a0748a-cod-web` / HEAD `99cde9b` を確認 |
| ルール確認 | `AGENTS.md`, `.agent/hooks/*`, `.agent/skills/index.md`, `project-overview/SKILL.md`, `docs/planning/DEEP_RESEARCH_PLAN.md`, `docs/task-list.md`, `docs/arch/legal.md`, `docs/arch/editor.md` を再読 |
| Web 調査 | Krunker official docs、FRVR legal、bloxd/Bloxdy public GitHub、bloxd terms mirror、Krunker changelog secondary sources を確認 |
| GitHub clone | `/tmp/cod-web-research` 配下に Noa 系 OSS、Bloxdy/code-api、Bloxdy/texture-packs、Bloxdy/developedCustomGames 等を clone し、remote / HEAD / license / 読んだファイル一覧を記録 |
| 成果物 | `docs/research/DR-1_COMPETITOR_DEEP_RESEARCH.md` と `docs/research/README.md` を追加 |
| 進捗更新 | `docs/task-list.md` の `DR-1` を完了へ更新し、`docs/planning/DEEP_RESEARCH_PLAN.md` の実績欄を記入 |
| 索引更新 | `docs/README.md` に `docs/research/` と DR-1 調査結果への導線を追加 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- Krunker official docs は UGC 用 `GAME.NETWORK` の message size / rate limit と server authority を公開しているが、本体の private protocol / transport / packet format は公開情報だけでは断定できない。
- bloxd public `Bloxdy/code-api` は World Code / Code Blocks / callbacks / client options / chunk API を詳しく公開しているが、live protocol は公開されておらず、計画上も解析禁止。
- Noa 系 OSS は voxel client の候補として有用だが、`noa-engine@0.33.0` は Babylon 6 系 peer のため、cod-web の Babylon 9 系方針とは導入前に互換検証が必要。
- Bloxdy の public examples / texture packs / code-api は license file がないものがあるため、設計観察に留め、コード・アセット流用はしない。

## 4. 次にすべきこと (Next Actions)

- ユーザーの Go があれば、PH1-A（bun workspaces + fps 系へ移動）に着手可能。
- DR-1 の提案（UGC message API と game sync 分離、resource pack manifest、Noa peer mismatch 検証など）は、Phase 7/8 計画時に `docs/arch/` へ反映する。

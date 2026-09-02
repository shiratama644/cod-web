# 仕様書を docs/arch/ に分離（仕様書 vs 計画書の区別）＋サンドボックス再構築復旧

> Date: 2026-09-03(JST) / Commit: (commit 後に追記) / Branch: arena/01a062ac-cod-web

## 1. 指示内容 (Task Summary)

- ユーザー指摘: 「`.agent/skills`, hooks の使い方を間違えている。**仕様書は `docs/arch/` に置く**。計画書はそのまま。**仕様書と計画書は区別する**」。
- ask_user で確認した方針:
  - **仕様書を docs/arch/ に集約**（CONFIG.md・NETWORK_DESIGN・設計ルール）。計画書は docs/planning/ 据え置き。
  - `.agent/skills` は**仕様メモ（要約）としても維持**するが、正本は docs/arch を参照する。

## 2. サンドボックス再構築の復旧（§4.1.1 発動）

- 作業途中で `git mv docs/planning/NETWORK_DESIGN.md …` が失敗し調査したところ、HEAD が起点 `f5c630a` のみ（当セッションの push 済みコミット 5308c8c〜92e626b が手元に無い）＝サンドボックス再構築。
- `git fetch origin arena/01a062ac-cod-web` → `git reset --hard FETCH_HEAD`（§4.1.1 の例外的許可）で `92e626b` まで復旧。ファイルは最新版で損傷なし。

## 3. 実行内容（docs/arch 分離）

| # | 変更 | 内容 |
|---|---|---|
| 1 | 移動（`git mv`） | `docs/CONFIG.md` → `docs/arch/tech-stack.md`／`docs/planning/NETWORK_DESIGN.md` → `docs/arch/networking.md`／`.agent/skills/game-engineering-principles.md` → `docs/arch/game-engineering-principles.md` |
| 2 | 新規 | `docs/arch/README.md`（仕様書の目次＋「仕様書 vs 計画書 vs 進捗正本 vs agent 記憶」の区別表） |
| 3 | 参照更新 | AGENTS.md（§6.7 に arch/planning 区別を追記、CONFIG→arch/tech-stack、NETWORK→arch/networking）／README.md／docs/README.md（ツリー＋参照表）／docs/task-list.md／docs/planning/PHASE00_PLAN.md |
| 4 | skills/hooks | `.agent/skills/index.md` を「正本は docs/arch」参照に再構成（skills は要約・sandbox 制約に限定）／pre-task.md の仕様読込先を docs/arch に |
| 5 | 内部リンク | 移動した 3 仕様書の内部リンク（tech-stack→networking、principles→tech-stack/networking/skills 等）を新相対パスに修正 |
| 6 | ログ | `.agent/logs/` は履歴記録のため旧パス参照をそのまま残した（§8.5、書き換えない） |

区別ルール（docs/arch/README.md に明記）:

| 種類 | 置き場所 | 内容 |
|---|---|---|
| 仕様書 | docs/arch/ | 技術選定・プロトコル・設計ルール（どう作るか）。正本 |
| 計画書 | docs/planning/ | 目的・変更範囲・完了条件・サブタスク（何を・どの順で） |
| 進捗正本 | docs/task-list.md | タスク ID・状態・証拠 |
| Agent 記憶 | .agent/ | skills＝コード由来事実の要約（arch 参照）、hooks＝定型手順、logs＝実行記録 |

## 4. 気づき・知見

- `.agent/skills` の本来の役割は「**実コード由来の**コードベース事実・暗黙了解」。コードが無い段階で設計仕様そのものを skills に置くと、正本（仕様書）と重複して乖離する。設計仕様は docs/arch に正本を持ち、skills はそれを要約・参照する形が正しい。
- `git mv` が「source not under version control」で失敗したのが再構築検知のきっかけだった。reset 後はクリーンに成功。
- 仕様書を移すと内部相対リンク（特に planning→親、skills→../../docs）が全て張り直しになるため、移動後は必ず全ファイルのリンクチェッカを回す（今回もリンク切れ 0 を確認）。

## 5. 次にすべきこと

- Phase 0（基盤構築）はこの docs/arch 仕様を参照しつつ実装。仕様を変更する場合は docs/arch/ を正本として更新し、skills は要約として追従。
- 実コードが書けた段階で、ファイル構成・実装のハマりどころといった**コード由来の事実**を `.agent/skills/` に育てていく（設計仕様は arch のまま）。

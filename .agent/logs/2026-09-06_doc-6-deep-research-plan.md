# DOC-6 — Krunker.io / bloxd.io Deep Research 計画

> Date: 2026-09-06(JST) / Commit: 本コミット / Branch: arena/01a0748a-cod-web

## 1. 指示内容 (Task Summary)

ユーザー指示: Krunker.io と bloxd.io のネットワークプロトコル、使われている技術、フロントエンド実装技術などを調べる Deep Research 計画をまず立てる。追加指示として、GitHub からコードを確認する場合は実際に clone して確実な方法で調べることを明記する。

## 2. 実行内容 (Executed Actions)

| # | 対象 | 内容 |
|---|---|---|
| 1 | `docs/planning/DEEP_RESEARCH_PLAN.md` | Deep Research 計画を新規作成。調査範囲、禁止事項、source 優先順位、GitHub clone 手順、成果物、停止条件を定義 |
| 2 | `docs/task-list.md` | `DOC-6` を完了、`DR-1` を未着手として登録 |
| 3 | `docs/README.md` | 新計画書を planning index と読む順に追加 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- 競合サービス調査は、公開情報・公式 docs・clone した public repo・npm metadata までを安全圏にする。
- bloxd.io は既存 `legal.md` の制約どおり、ライブサービスへ接続しての解析・リバースエンジニアリングは禁止する。
- GitHub のコード確認は Web UI や検索スニペットだけでは不十分。`git clone`、`git remote -v`、`git rev-parse HEAD`、読んだファイル一覧を記録する手順を計画に明記した。

## 4. 次にすべきこと (Next Actions)

次にユーザーの Go があれば `DR-1` として実調査に入る。調査結果は source URL / clone SHA / 読んだファイル一覧付きで `docs/research/` に保存する。

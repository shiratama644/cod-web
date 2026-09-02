# cod-web ドキュメント索引

cod-web（[Krunker.io](https://krunker.io) インスパイアのブラウザ向けクロスプラットフォーム・オンラインFPS／全端末 60FPS 目標）のドキュメント一式を種類別に整理したものです。ルート [`../README.md`](../README.md) からアプリの概要へアクセスできます。

---

## 📂 ディレクトリ構造

```
docs/
├── README.md            ← 本ファイル（全ドキュメントの目次）
├── CONFIG.md            ★ 技術スタック完全ガイド + 全端末60FPS・WebGPU/WebGL2 の設計・実装黄金ルール
├── task-list.md         ★ タスク管理の唯一の正本（進捗・証拠）
├── planning/            # 計画書（Phase 単位・_TEMPLATE.md 形式）
│   ├── _TEMPLATE.md     # 計画書テンプレート（新規計画書は必ず本形式）
│   ├── PHASE00_PLAN.md  # Phase 0: プロジェクト基盤構築
│   └── complete/        # 完了レポート
├── audit/               # 差分・バグ監査
└── ops/                 # 運用ドキュメント（デプロイ・CI 実務）
```

---

## 🗺️ 用途別リファレンス

### 「まず全体像を把握したい」

| 見る順 | ドキュメント | 内容 |
|---:|---|---|
| 1 | [`../README.md`](../README.md) | アプリ概要、技術構成、セットアップ |
| 2 | [`CONFIG.md`](CONFIG.md) | 技術スタックの全容・ライブラリ選定・設計ルール |
| 3 | [`task-list.md`](task-list.md) | **タスク管理の正本**（全フェーズの状態・証拠） |

### 「これから開発を継続したい」

| 見る順 | ドキュメント | 内容 |
|---:|---|---|
| 1 | [`task-list.md`](task-list.md) | 次に着手すべきタスクと依存・検証待ち項目の一覧 |
| 2 | [`planning/PHASE00_PLAN.md`](planning/PHASE00_PLAN.md) | **直近フェーズ**: Phase 0（プロジェクト基盤構築） |
| 3 | [`planning/_TEMPLATE.md`](planning/_TEMPLATE.md) | 計画書テンプレート（新規タスクはこの形式で計画） |
| 4 | [`../AGENTS.md`](../AGENTS.md) | AI Agent 開発規約（コミット手順・検証・Git 運用・コミュニケーション） |
| 5 | [`../.agent/skills/`](../.agent/skills) | コードベース知識（`index.md` が入口） |

### 「デプロイしたい / CI を動かしたい」

| ドキュメント | 内容 |
|---|---|
| `ops/` | Phase 0 完了後に CI / デプロイ手順を整備予定（`.github/workflows/` は書き込み権限制約あり、AGENTS.md §6.3） |

---

## ドキュメント運用ルール（AGENTS.md §6.7）

- 計画書は `docs/planning/PHASE{N}_PLAN.md`（N は 2 桁）、完了レポートは `docs/planning/complete/PHASE{N}_COMPLETE.md`。
- バグ監査・差分レポートは `docs/audit/`、デプロイ・CI 運用は `docs/ops/`。
- ファイルを追加したら必ず本索引を更新する。

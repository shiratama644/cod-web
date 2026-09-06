# cod-web ドキュメント索引

cod-web は、ブラウザ向け **マルチタイプ・ゲームプラットフォーム**（`voxel` / `fps`）のリポジトリです。  
現行コードは単一ルーム FPS の原型であり、**理想形（本ディレクトリ）へ段階移行**します。

旧ドキュメント（Krunker 上位互換・単一 FPS 前提）は [`.archive/docs/`](../.archive/docs/) に退避済みです。ソース仕様書 v2 の現用入口は [`マルチタイプ・ゲームプラットフォーム 設計書.md`](./マルチタイプ・ゲームプラットフォーム%20設計書.md) に残しますが、本文は重複防止のため `arch/` への案内だけにしています。

---

## ディレクトリ

```
docs/
├── README.md            ← 本ファイル
├── task-list.md         ★ 進捗の唯一の正本
├── Perplexity-AI.md     # ユーザー追加の raw DeepResearch 入力（検証結果は research/DR-5）
├── arch/                ★ 仕様書（どう作るか）
│   ├── README.md
│   ├── product.md       # プロダクト定義・既存資産・用語
│   ├── architecture.md  # レイヤー・リポジトリ・依存規則
│   ├── types.md         # TypeSpec / SimProfile / GameMode / RoomCtx
│   ├── protocol.md      # バイナリプロトコル・AOI・トランスポート
│   ├── server.md        # ゲームノード（Bun WS）
│   ├── matchmaker.md    # マッチメイカー・チケット・Redis
│   ├── client.md        # ハブ・Babylon・予測補間
│   ├── editor.md        # 公式/UGC 階層とマップ/ワールドエディタ
│   ├── sim-profiles.md  # VoxelProfile / FpsProfile
│   ├── engineering.md   # 決定論・テスト・性能予算・セキュリティ
│   ├── ugc.md           # ユーザー生成モード（フェーズ8）
│   ├── adr.md           # 意思決定ログ
│   ├── milestones.md    # フェーズ 0–9 と完了条件
│   └── legal.md         # 法務・OSS・参考資料
├── planning/            # 計画書（着手前に _TEMPLATE.md で作成）
│   ├── _TEMPLATE.md
│   ├── HANDOFF.md       # 次セッションへの橋渡し（先に読む）
│   ├── PHASE00_PLAN.md  # フェーズ 0（現行コードの穴）
│   └── PHASE01_PLAN.md  # フェーズ 1（fps モノレポ + Babylon）
└── research/            # 競合・関連技術の調査結果
    ├── README.md
    ├── DEEP_RESEARCH_SYNTHESIS.md
    ├── DR-1_COMPETITOR_DEEP_RESEARCH.md
    ├── DR-2_ADDITIONAL_SOURCE_RESEARCH.md
    ├── DR-3_DEEPER_COMPETITOR_RESEARCH.md
    ├── DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md
    └── DR-5_PERPLEXITY_DIFF_RESEARCH.md
```

仕様書（`arch/`）= どう作るかの正本。計画書（`planning/`）= 何をどの順で。進捗（`task-list.md`）= 状態と証拠。調査（`research/`）= 根拠と採用判断の補助。raw 入力（`Perplexity-AI.md`）= 検証前の材料。

---

## 読む順

### 通常の実装タスク

| 順 | 文書 | 内容 |
|---:|---|---|
| 0 | [`planning/HANDOFF.md`](planning/HANDOFF.md) | 次セッション: DR-5 / DOC-7 反映後の PH1-A 着手メモ |
| 1 | [`../README.md`](../README.md) | プロダクト概要・セットアップ（現行コード） |
| 2 | [`task-list.md`](task-list.md) | 進捗の唯一の正本。次に着手するタスク |
| 3 | 対象フェーズの `planning/*_PLAN.md` | そのタスクで何をどの順で実施するか |
| 4 | [`arch/README.md`](arch/README.md) | 仕様書一覧と実装時に守ること |
| 5 | [`arch/product.md`](arch/product.md) / [`arch/architecture.md`](arch/architecture.md) / [`arch/adr.md`](arch/adr.md) | プロダクト定義、層、覆さない決定 |
| 6 | 対象領域の `arch/*.md` | protocol / server / client / editor / ugc 等 |
| 7 | [`research/DEEP_RESEARCH_SYNTHESIS.md`](research/DEEP_RESEARCH_SYNTHESIS.md) | DR-1〜DR-5 の採用/不採用/要確認の入口 |
| 8 | 必要な DR-* / [`arch/api-sources.md`](arch/api-sources.md) | 具体的な URL、clone SHA、公式 API 根拠 |

### 調査・レビュータスク

| 順 | 文書 | 内容 |
|---:|---|---|
| 0 | [`planning/DEEP_RESEARCH_PLAN.md`](planning/DEEP_RESEARCH_PLAN.md) | Krunker.io / bloxd.io Deep Research の手順・禁止事項 |
| 1 | [`research/DEEP_RESEARCH_SYNTHESIS.md`](research/DEEP_RESEARCH_SYNTHESIS.md) | 既存調査の統合サマリー |
| 2 | [`research/DR-1_COMPETITOR_DEEP_RESEARCH.md`](research/DR-1_COMPETITOR_DEEP_RESEARCH.md) | Krunker.io / bloxd.io 初回調査 |
| 3 | [`research/DR-2_ADDITIONAL_SOURCE_RESEARCH.md`](research/DR-2_ADDITIONAL_SOURCE_RESEARCH.md) | DR-1 要確認の追加調査 |
| 4 | [`research/DR-3_DEEPER_COMPETITOR_RESEARCH.md`](research/DR-3_DEEPER_COMPETITOR_RESEARCH.md) | Krunker direct API / bloxd code-api / texture packs / netcode |
| 5 | [`research/DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md`](research/DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md) | Noa 系 engine / UGC sandbox / GLB asset pipeline |
| 6 | [`research/DR-5_PERPLEXITY_DIFF_RESEARCH.md`](research/DR-5_PERPLEXITY_DIFF_RESEARCH.md) | Perplexity DeepResearch との差分検証 |
| 7 | [`Perplexity-AI.md`](Perplexity-AI.md) | ユーザー追加 raw DeepResearch 入力。必要時のみ全体読了 |

実装担当は [`arch/README.md`](arch/README.md) の「実装時に守ること」も読むこと。

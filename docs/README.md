# cod-web ドキュメント索引

cod-web は、ブラウザ向け **マルチタイプ・ゲームプラットフォーム**(`fps` 先行、将来 `voxel` 等を追加可能な拡張構造)のリポジトリです。
2026-09-24 の決定により、ゲームシステムは *Call of Duty: Mobile* の仕組みを Web 上で再現する方向へ全面入れ替え中です
(現在は R フェーズ = リサーチのみ。実装は統合 Spec 承認後の S フェーズ)。

旧ドキュメント(Krunker 上位互換・単一 FPS 前提)は [`.archive/docs/`](../.archive/docs/) に退避済みです。
`.archive/` は参照用であり正本にしません。

---

## ディレクトリ

```
docs/
├── README.md            ← 本ファイル(索引)
├── task-list.md         ★ 進捗の唯一の正本
├── マルチタイプ・ゲームプラットフォーム 設計書.md   # 旧 v2 単一仕様書への互換入口(本文なし)
├── arch/                ★ 仕様書(どう作るか)
│   ├── README.md        # 仕様書一覧と実装時に守ること
│   ├── product.md       # プロダクト定義・既存資産・用語
│   ├── architecture.md  # レイヤー・リポジトリ・依存規則
│   ├── types.md         # TypeSpec / SimProfile / GameMode / RoomCtx
│   ├── protocol.md      # バイナリプロトコル・AOI・トランスポート
│   ├── server.md        # ゲームノード(Bun WS)
│   ├── matchmaker.md    # マッチメイカー・チケット・Redis
│   ├── client.md        # ハブ・クライアント・予測補間
│   ├── editor.md        # 公式/UGC 階層とマップ/ワールドエディタ
│   ├── sim-profiles.md  # FpsProfile(voxel は契約のみ)
│   ├── engineering.md   # 決定論・テスト・性能予算・セキュリティ
│   ├── ugc.md           # ユーザー生成モード(フェーズ8)
│   ├── adr.md           # 意思決定ログ
│   ├── milestones.md    # フェーズ 0–9 と完了条件
│   ├── api-sources.md   # 外部 API / 公式資料の確認メモ
│   └── legal.md         # 法務・OSS・参考資料
├── planning/            # 計画書(着手前に _TEMPLATE.md で作成)
│   ├── README.md        # 計画書索引・次に使う計画
│   ├── _TEMPLATE.md
│   ├── HANDOFF.md       # 次セッションへの橋渡し(先に読む)
│   ├── CODM_DEEP_RESEARCH_PLAN.md  ★ 現用: CoDM システム全面入れ替えの R フェーズ計画
│   └── complete/        # 完了済み計画・合意記録(Phase 0〜4, EM1/EM2, DR, SANDBOX 合意)
├── ops/                 # CI / quality gate(本番は .github/workflows/)
│   ├── README.md
│   └── quality-gates.md
└── research/            # 競合・関連技術の調査結果
    ├── README.md        # 調査索引・ソース信頼度ルール
    ├── DEEP_RESEARCH_SYNTHESIS.md   # DR-1〜DR-5 の統合サマリー(入口)
    ├── DR-1 〜 DR-5_*.md            # Krunker/bloxd/engine/UGC/Perplexity 差分の個別証跡
    ├── Perplexity-AI.md             # ユーザー追加の raw DeepResearch 入力(検証結果は DR-5)
    └── codm/            ★ 現用: CoD Mobile リサーチ(R フェーズ成果物)
        └── 00_scope.md  # R0: 調査範囲・ハイブリッド基準(確定)
```

役割分担: 仕様書(`arch/`)= どう作るかの正本。計画書(`planning/`)= 何をどの順で。
進捗(`task-list.md`)= 状態と証拠。運用(`ops/`)= CI / quality gate。
調査(`research/`)= 根拠と採用判断の補助(正本ではない)。

---

## 読む順

### 通常の実装タスク

| 順 | 文書 | 内容 |
|---:|---|---|
| 0 | [`planning/HANDOFF.md`](planning/HANDOFF.md) | 次セッションへの橋渡しメモ |
| 1 | [`../README.md`](../README.md) | プロダクト概要・セットアップ・起動(現行コード) |
| 2 | [`task-list.md`](task-list.md) | 進捗の唯一の正本。次に着手するタスク |
| 3 | [`planning/README.md`](planning/README.md) → 対象の計画書 | 計画書の入口と、そのタスクで何をどの順で実施するか |
| 4 | [`arch/README.md`](arch/README.md) | 仕様書一覧と実装時に守ること |
| 5 | [`arch/product.md`](arch/product.md) / [`arch/architecture.md`](arch/architecture.md) / [`arch/adr.md`](arch/adr.md) | プロダクト定義、層、覆さない決定 |
| 6 | 対象領域の `arch/*.md` | protocol / server / client / editor / ugc 等 |

### CoDM リサーチ(R フェーズ・現用)

| 順 | 文書 | 内容 |
|---:|---|---|
| 0 | [`planning/CODM_DEEP_RESEARCH_PLAN.md`](planning/CODM_DEEP_RESEARCH_PLAN.md) | R0〜R7 の手順・IP 境界・検証ラベル |
| 1 | [`research/codm/00_scope.md`](research/codm/00_scope.md) | R0 確定: 調査範囲とハイブリッド基準 |
| 2 | `.agent/skills/codm-research/SKILL.md` | リサーチの進め方ノウハウ |

### 過去調査・レビュータスク(完了済み)

| 順 | 文書 | 内容 |
|---:|---|---|
| 1 | [`research/DEEP_RESEARCH_SYNTHESIS.md`](research/DEEP_RESEARCH_SYNTHESIS.md) | DR-1〜DR-5 の採用/不採用/要確認の入口 |
| 2 | 必要な `research/DR-*` / [`arch/api-sources.md`](arch/api-sources.md) | 具体的な URL、clone SHA、公式 API 根拠 |
| 3 | [`research/Perplexity-AI.md`](research/Perplexity-AI.md) | raw 入力。再検証が必要な時だけ全体読了 |

実装担当は [`arch/README.md`](arch/README.md) の「実装時に守ること」も読むこと。
ファイルを追加・移動したら本索引と [`arch/README.md`](arch/README.md) を必ず更新する(AGENTS.md §6.7)。

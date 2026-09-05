# cod-web ドキュメント索引

cod-web は、ブラウザ向け **マルチタイプ・ゲームプラットフォーム**（`voxel` / `fps`）のリポジトリです。  
現行コードは単一ルーム FPS の原型であり、**理想形（本ディレクトリ）へ段階移行**します。

旧ドキュメント（Krunker 上位互換・単一 FPS 前提）は [`.archive/docs/`](../.archive/docs/) に退避済みです。ソース仕様書 v2 も同ディレクトリにあります。

---

## ディレクトリ

```
docs/
├── README.md            ← 本ファイル
├── task-list.md         ★ 進捗の唯一の正本
├── arch/                ★ 仕様書（どう作るか）
│   ├── README.md
│   ├── product.md       # プロダクト定義・既存資産・用語
│   ├── architecture.md  # レイヤー・リポジトリ・依存規則
│   ├── types.md         # TypeSpec / SimProfile / GameMode / RoomCtx
│   ├── protocol.md      # バイナリプロトコル・AOI・トランスポート
│   ├── server.md        # ゲームノード（Bun WS）
│   ├── matchmaker.md    # マッチメイカー・チケット・Redis
│   ├── client.md        # ハブ・Babylon・予測補間
│   ├── sim-profiles.md  # VoxelProfile / FpsProfile
│   ├── engineering.md   # 決定論・テスト・性能予算・セキュリティ
│   ├── ugc.md           # ユーザー生成モード（フェーズ8）
│   ├── adr.md           # 意思決定ログ
│   ├── milestones.md    # フェーズ 0–9 と完了条件
│   └── legal.md         # 法務・OSS・参考資料
└── planning/            # 計画書（着手前に _TEMPLATE.md で作成）
    ├── _TEMPLATE.md
    └── PHASE00_PLAN.md  # フェーズ 0（現行コードの穴）
```

仕様書（`arch/`）= どう作るかの正本。計画書（`planning/`）= 何をどの順で。進捗（`task-list.md`）= 状態と証拠。

---

## 読む順

| 順 | 文書 | 内容 |
|---:|---|---|
| 1 | [`../README.md`](../README.md) | プロダクト概要・セットアップ（現行コード） |
| 2 | [`arch/product.md`](arch/product.md) | 何を作るか・現行コードの扱い |
| 3 | [`arch/architecture.md`](arch/architecture.md) | 層とモノレポ |
| 4 | [`arch/adr.md`](arch/adr.md) | 覆してはいけない決定 |
| 5 | [`task-list.md`](task-list.md) | 次に着手するタスク |
| 6 | [`arch/milestones.md`](arch/milestones.md) | フェーズと DoD |

実装担当は [`arch/README.md`](arch/README.md) の「実装時に守ること」も読むこと。

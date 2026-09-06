# Research Index

競合・関連技術の調査結果を保存するディレクトリです。

## 位置づけ

| 種別 | 役割 | 注意 |
|---|---|---|
| [`DEEP_RESEARCH_SYNTHESIS.md`](./DEEP_RESEARCH_SYNTHESIS.md) | DR-1〜DR-5 の統合サマリー。通常は最初に読む | 仕様正本ではない。採用判断は `docs/arch/` に反映してから実装 |
| `DR-*` | 個別調査の詳細証跡 | URL / clone SHA / source 種別 / 読んだファイル一覧を確認する |
| [`../Perplexity-AI.md`](../Perplexity-AI.md) | ユーザー追加の raw DeepResearch 入力 | 検証済み結論は DR-5 と synthesis を優先 |

## 読む順

1. 通常は [`DEEP_RESEARCH_SYNTHESIS.md`](./DEEP_RESEARCH_SYNTHESIS.md) を読む。
2. 根拠が必要な項目だけ該当 DR を読む。
3. 実装タスクに渡す時は [`../planning/README.md`](../planning/README.md) と対象計画書を確認する。
4. 外部 API の実装時は [`../arch/api-sources.md`](../arch/api-sources.md) と公式ドキュメントを再確認する。
5. raw 入力の `../Perplexity-AI.md` は、再検証が必要な時だけ全体読了する。

## 文書一覧

| 文書 | 内容 |
|---|---|
| [`DEEP_RESEARCH_SYNTHESIS.md`](./DEEP_RESEARCH_SYNTHESIS.md) | DR-1〜DR-5 の採用済み判断、低信頼情報、現行 cod-web 再分類、次タスクへの渡し方 |
| [`DR-1_COMPETITOR_DEEP_RESEARCH.md`](./DR-1_COMPETITOR_DEEP_RESEARCH.md) | Krunker.io / bloxd.io の公開情報・clone 済み OSS から見た network / frontend / editor / UGC / voxel 調査 |
| [`DR-2_ADDITIONAL_SOURCE_RESEARCH.md`](./DR-2_ADDITIONAL_SOURCE_RESEARCH.md) | DR-1 要確認の追加調査。bloxd 公式 Terms、Krunker direct API URL、Noa/Babylon peer mismatch を確認 |
| [`DR-3_DEEPER_COMPETITOR_RESEARCH.md`](./DR-3_DEEPER_COMPETITOR_RESEARCH.md) | ユーザー指示に基づく追加 deep research。Krunker direct API、bloxd code-api 追加 docs、texture-packs、authoritative netcode を深掘り |
| [`DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md`](./DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md) | ユーザー指示に基づく追加 deep research。Noa 系 engine、voxel physics、input/mobile、QuickJS sandbox、glTF validation/optimization pipeline を深掘り |
| [`DR-5_PERPLEXITY_DIFF_RESEARCH.md`](./DR-5_PERPLEXITY_DIFF_RESEARCH.md) | ユーザー追加 Perplexity DeepResearch と DR-1〜DR-4 の差分検証。現行 cod-web への古い指摘/未解決課題/一次情報採用候補を整理 |

## ソース信頼度ルール

| 優先 | 種別 | 扱い |
|---:|---|---|
| 1 | 公式ドキュメント / 公式 npm metadata / 公式 GitHub repo | 一次情報。仕様へ反映しやすい |
| 2 | clone 済み public GitHub repo | clone path、remote、HEAD、license、読んだファイルが記録されている場合のみ根拠にする |
| 3 | 公式ブログ / changelog | version 差に注意して使う |
| 4 | 技術記事 / forum / Reddit / 動画 / AI 調査結果 | 二次情報。単独では断定しない |
| 5 | live service 観測 | 原則禁止。特に通信キャプチャ・production bundle 解析はしない |

注意: 調査文書は設計の正本ではありません。採用判断は [`../arch/`](../arch/README.md) と計画書へ反映してから実装します。

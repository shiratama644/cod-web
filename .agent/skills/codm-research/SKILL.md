---
name: codm-research
description: CoD Mobile ディープリサーチ（R0〜R7）と仕様書作成の進め方。ハイブリッド基準・検証ラベル・IP境界・情報源の使い分け。2026-09-24開始の「完全入れ替え」方針の実務スキル。
---

# CoDM Research — ディープリサーチの進め方

> 2026-09-24 ユーザー指示「完全にシステムを入れ替える」。CoD Mobile の仕組み・機能を調査し Web で再現する。
> 計画の正本: `docs/planning/CODM_DEEP_RESEARCH_PLAN.md`（意思決定ログ付き）。
> 成果物の正本: `docs/research/codm/`（R0 の `00_scope.md` は作成済み・コミット c0f6c3d / 4984b67）。
> **リサーチフェーズ中はコードを書かない**。実装は R7 の INTEGRATION_SPEC 承認後（S フェーズ）のみ。

## 基準バージョン = ハイブリッド（00_scope.md §1.4 が正本）

| 領域 | 基準 |
| :--- | :--- |
| モード | 初出期 **2020-03-25 時点**（TDM/FFA/Dom/SD/Frontline/Kill Confirmed/Hardpoint。Control 無し） |
| 武器 | **2026 年の Gunsmith**（アタッチメント+stat%） |
| その他機能 | **2026 年**相当 |
| マップ | **独自**・拡張可能・JSON 定義（MVP はコード/自動生成、本番は 3D アップロード） |

- マップは「1枚だけ」ではない（ユーザー明示訂正）。複数マップ前提の拡張可能設計。

## フェーズと成果物の対応

| Phase | 成果物（docs/research/codm/） |
| :--- | :--- |
| R0 | `00_scope.md`（済） |
| R1 | `01`〜`04`（MP コア: モード/武器/移動射撃/スコアストリーク等） |
| R2 | `05_ranked.md` |
| R3 | `06_br.md` |
| R4 | `07_zombies.md` |
| R5 | `08_progression_economy.md` |
| R6 | `09_social_settings.md` + `10_ui_inventory.md` |
| R7 | `INTEGRATION_SPEC.md`（Next app への統合提案。承認が S フェーズの入口） |

## 検証ルール

- 事実は **2ソース以上**で突合し、ラベルを付ける: `[検証済み]` / `[単一情報源]` / `[概算・設計値]`。URL を併記。
- 情報源の信頼順: **Activision 公式ブログ > Wikipedia > CoD Fandom wiki > ニュースサイト > 攻略サイト**。wiki は公式と矛盾することがある（例: Ranked 開始時期は公式 2020-01-14 だが wiki の Series 表は 2019-09 — 矛盾はラベルで明示して残す）。
- 数値がどうしても取れないものは「概算・設計値」として自分で設計し、その旨を明記する。

## IP 境界（厳守）

- 再現してよいのは **メカニクス・ルール・数値・フロー・UX 構造**のみ。
- アート・3D モデル・音声・マップ地形・公式名称はコピーしない（名称は独自に付け直す）。

## 進め方の実務

- 各 R フェーズ開始前にユーザーの GO を取る（ask_user 可）。ユーザーは 2026 年版の実機プレイヤーで、スクリーンショット提供を受けられる（画面構成は 1:1、ビジュアルは独自）。
- 意思決定は `CODM_DEEP_RESEARCH_PLAN.md` の決定ログ表に追記する（これまで6行: スコープ、ハイブリッド基準、マップ方針、UI 1:1、実機観察、Next フロントエンド採用）。
- UI の情報設計（IA）は R7 の成果物から確定する（先行して独自 IA を固定しない）。

## 関連

- `docs/planning/CODM_DEEP_RESEARCH_PLAN.md` / `docs/research/codm/00_scope.md`
- `.agent/logs/2026-10-03_codm-deep-research-plan-r0-hybrid-baseline.md`
- フロントエンド統合先: `nextjs-frontend/SKILL.md`

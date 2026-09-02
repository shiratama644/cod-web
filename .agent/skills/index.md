# Skills Index — cod-web コードベース知識

> このファイルは `.agent/skills/` の**入口**。タスク着手時に本ファイルだけ読み、
> 必要なスキルだけをピンポイントで読み込む（コンテキストの無駄遣いを防ぐ）。
> 各スキルは「このコードベースの *事実/仕様/暗黙了解*」をまとめたもの。
> 作業規約（コミット手順・Lint 等）は [`../../AGENTS.md`](../../AGENTS.md) を参照。

## 読み方ガイド（どの状況でどのスキルを読むか）

| 状況 | 読むスキル |
| :--- | :--- |
| 初回 / 全体把握 | [`project-overview.md`](./project-overview.md) → [`tech-stack.md`](./tech-stack.md) |
| 使うライブラリ・依存関係を選ぶ / 技術構成を確認 | [`tech-stack.md`](./tech-stack.md) |
| ゲームコード（ゲームループ・状態・ネットワーク・判定）を書く | [`game-engineering-principles.md`](./game-engineering-principles.md) |
| 「動かない / テストできない / ネットワーク・WebGL が絡む」環境トラブル | [`sandbox-constraints.md`](./sandbox-constraints.md) |

## スキル一覧

| ファイル | 概要 | 最終更新 |
| :--- | :--- | :--- |
| [project-overview.md](./project-overview.md) | 製品概要・技術スタック要点・フェーズ進捗。最初に読む。 | 2026-09-03 |
| [tech-stack.md](./tech-stack.md) | ライブラリの役割・使い分け（3D/物理/ECS/ネットワーク/UI/オーディオ/アセット/ツール）。網羅は docs/CONFIG.md が正。 | 2026-09-03 |
| [game-engineering-principles.md](./game-engineering-principles.md) | FPS 設計の 8 黄金ルール（ゲームループ分離・ゼロアロケーション・権威サーバー等）と実装パターン集。 | 2026-09-03 |
| [sandbox-constraints.md](./sandbox-constraints.md) | Sandbox / ネットワーク / GitHub App の制約と迂回策（E2E 不可・WebGPU/実結合は実環境確認）。 | 2026-09-03 |

## 運用ルール

- スキルを更新したら**必ず本 index.md の「最終更新」も更新**する。
- 新スキル追加時は「読み方ガイド」と「一覧」の両方に追記する。
- AGENTS.md と重複する作業規約はスキルに書かず AGENTS.md を正とする（スキルは *事実/仕様* 中心）。
- ファイル名は `kebab-case.md`。

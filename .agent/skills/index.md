# Skills Index — CodWeb コードベース知識

> このファイルは `.agent/skills/` の**入口**。タスク着手時に本ファイルだけ読み、必要なスキルだけをピンポイントで読み込む（コンテキストの無駄遣いを防ぐ）。
> 各スキルは「このコードベースの *事実/仕様/暗黙了解*」をまとめたもの。
> 作業規約（コミット手順・Lint 等）は `AGENT.md` を参照。

## 読み方ガイド（どの状況でどのスキルを読むか）

| 状況 | 読むスキル |
| :--- | :--- |
| 初回 / 全体把握 | [`project-overview.md`](./project-overview.md) → [`architecture-and-data-flow.md`](./architecture-and-data-flow.md) |
| ネットワーク / 権威サーバー / ネットコードを触る | `networking.md`（追加予定） |
| 描画 / three.js / WebGPU を触る | `rendering.md`（追加予定） |
| 共有シミュレーション / 決定論性を触る | `shared-simulation.md`（追加予定） |
| 環境制約（ネットワーク到達不可 / GPU 無し / 権限） | [`sandbox-constraints.md`](./sandbox-constraints.md) |
| テスト / カバレッジ / CI を触る | [`testing.md`](./testing.md) |

> ※ CodWeb 化に伴い、現状スキルは共通基盤（project-overview / architecture-and-data-flow / sandbox-constraints / testing）のみ。サブシステム別スキル（networking / rendering / shared-simulation 等）は実装フェーズで追加する。

## スキル一覧

| ファイル | 概要 | 最終更新 |
| :--- | :--- | :--- |
| [project-overview.md](./project-overview.md) | 製品概要・目標・技術方針（WebGL2 / Colyseus+WebTransport / 完全オリジナルアセット）。最初に読む。 | 2026-09-01 |
| [architecture-and-data-flow.md](./architecture-and-data-flow.md) | 権威サーバー + クライアント予測の全体レイヤとデータフロー。 | 2026-09-01 |
| [sandbox-constraints.md](./sandbox-constraints.md) | 開発環境の制約と迂回策（ネットワーク到達不可 / GPU 無し / 権限）。 | 2026-09-01 |
| [testing.md](./testing.md) | vitest / msw / Playwright・CI の進め方。 | 2026-09-01 |

## 運用ルール

- スキルを更新したら**必ず本 index.md の「最終更新」も更新**する。
- 新スキル追加時は「読み方ガイド」と「一覧」の両方に追記する。
- AGENT.md と重複する作業規約はスキルに書かず AGENT.md を正とする（スキルは*事実/仕様*中心）。
- ファイル名は `kebab-case.md`。

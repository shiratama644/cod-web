# Skills Index — cod-web コードベース知識

> このファイルは `.agent/skills/` の**入口**。タスク着手時に本ファイルだけ読み、
> 必要なスキルだけをピンポイントで読み込む（コンテキストの無駄遣いを防ぐ）。
> 各スキルは「このコードベースの *事実/仕様/暗黙了解*」の agent 向け要約。
> 作業規約（コミット手順・Lint 等）は [`../../AGENTS.md`](../../AGENTS.md) を参照。
>
> **設計仕様の正本は [`../../docs/arch/`](../../docs/arch/)**。スキルはそれを要約・参照するだけとし、矛盾した場合は docs/arch が正。

## 読み方ガイド（どの状況で何を読むか）

| 状況 | 読むもの |
| :--- | :--- |
| 初回 / 全体把握 | [`project-overview.md`](./project-overview.md) → [`tech-stack.md`](./tech-stack.md) |
| 技術選定・ライブラリ・プロトコルの**仕様** | **仕様書 [`docs/arch/`](../../docs/arch/README.md)**（tech-stack / networking / game-engineering-principles） |
| 実コードのファイル構成・実装でハマった事実 | この `skills/`（コード由来の事実。コードが書けたら育てる） |
| 「動かない / テストできない / ネットワーク・WebGL が絡む」環境トラブル | [`sandbox-constraints.md`](./sandbox-constraints.md) |

## スキル一覧（agent 向け要約）

| ファイル | 概要 | 最終更新 |
| :--- | :--- | :--- |
| [project-overview.md](./project-overview.md) | 製品概要・技術スタック要点・フェーズ進捗。最初に読む。 | 2026-09-03 |
| [tech-stack.md](./tech-stack.md) | ライブラリ役割分担の要約。**正本は [`docs/arch/tech-stack.md`](../../docs/arch/tech-stack.md)**。 | 2026-09-03 |
| [sandbox-constraints.md](./sandbox-constraints.md) | Sandbox / ネットワーク / GitHub App の制約と迂回策（E2E 不可・WebGPU/実結合は実環境確認）。 | 2026-09-03 |

## 仕様書（正本は docs/arch/、スキルではない）

| 仕様書 | 内容 |
| :--- | :--- |
| [docs/arch/tech-stack.md](../../docs/arch/tech-stack.md) | 技術スタック完全ガイド＋設計・実装黄金ルール（WebGPU→WebGL2 フォールバック、可変 FPS 等） |
| [docs/arch/networking.md](../../docs/arch/networking.md) | ネットワーク＆リアルタイム設計（WebTransport 主 / WebSocket フォールバック、30Hz、msgpackr、FX クライアント再生） |
| [docs/arch/game-engineering-principles.md](../../docs/arch/game-engineering-principles.md) | FPS 設計の黄金ルール・実装パターン集（ゲームループ分離・ゼロアロケーション・権威サーバー等） |

## 運用ルール

- スキルを更新したら**必ず本 index.md の「最終更新」も更新**する。
- **設計・仕様（どう作るか）は docs/arch/ に書く**。skills/ は実コード由来の事実・要約に留め、正本は arch を参照する。
- 計画書（何をやるか）は [`../../docs/planning/`](../../docs/planning/)。進捗は [`../../docs/task-list.md`](../../docs/task-list.md)。
- 新スキル追加時は「読み方ガイド」と「一覧」の両方に追記する。
- AGENTS.md と重複する作業規約はスキルに書かず AGENTS.md を正とする。
- ファイル名は `kebab-case.md`。

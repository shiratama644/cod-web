# Skills Index — Agent のスキル集

> このファイルは `.agent/skills/` の**入口**。タスク着手時に本ファイルだけ読み、
> 必要なスキルだけをピンポイントで読み込む（コンテキストの無駄遣いを防ぐ）。
>
> ここにあるのは **Agent 自身のスキル** — 「このプロジェクトで何をどうやるとうまくいくか」
> という実践的なノウハウ・テクニック・手順・パターン・コードベース知識。
> 仕様書（設計の正本）ではない。設計の事実は [`../../docs/arch/`](../../docs/arch/README.md) が正本。
> 作業規約は [`../../AGENTS.md`](../../AGENTS.md)。

## 読み方ガイド（どの状況でどのスキルを使うか）

| 状況 | 使うスキル |
| :--- | :--- |
| 初回 / 全体把握 | [`project-overview/SKILL.md`](./project-overview/SKILL.md) |
| ライブラリの使いどころ・サンドボックスでの bun/Vite/WS ハマり | [`tech-stack/SKILL.md`](./tech-stack/SKILL.md) |
| 「動かない / テストできない / ネットワーク・GPU が絡む」環境トラブル | [`sandbox-constraints/SKILL.md`](./sandbox-constraints/SKILL.md) |
| 設計の正本（プロダクト・プロトコル・ADR・マイルストーン） | [`../../docs/arch/`](../../docs/arch/README.md)（product / protocol / engineering / adr / milestones） |

## スキル一覧

| スキル | できるようになること（Agent の能力） | 最終更新 |
| :--- | :--- | :--- |
| [project-overview/SKILL.md](./project-overview/SKILL.md) | プロダクト目標・現行コード（移行元）と理想フェーズを素早く把握する | 2026-09-05 |
| [tech-stack/SKILL.md](./tech-stack/SKILL.md) | 理想スタックと移行元コードのハマりどころを区別して実装できる | 2026-09-05 |
| [sandbox-constraints/SKILL.md](./sandbox-constraints/SKILL.md) | Sandbox / ネットワーク / GitHub App の制約を迂回して検証できる | 2026-09-05 |

## 設計仕様の正本（スキルではなく docs/arch/）

| 仕様書 | 内容 |
| :--- | :--- |
| [docs/arch/product.md](../../docs/arch/product.md) | プロダクト・用語・現行資産の移植判定 |
| [docs/arch/architecture.md](../../docs/arch/architecture.md) | L0–L3、モノレポ、依存規則 |
| [docs/arch/protocol.md](../../docs/arch/protocol.md) | パケット・AOI・WS 固定と WT 備え |
| [docs/arch/engineering.md](../../docs/arch/engineering.md) | 決定論・テスト・予算 |
| [docs/arch/adr.md](../../docs/arch/adr.md) | 意思決定ログ |
| [docs/arch/milestones.md](../../docs/arch/milestones.md) | フェーズ 0–9 |

> 実装テクニック・ハマりどころは **skills** に貯め、設計の事実は **docs/arch** を正本とする。
> 欠ファイル（`tech-stack.md` / `networking.md` / `game-engineering-principles.md`）は正本ではない。旧内容は `.archive/docs/`。

## 運用ルール

- 新しいノウハウを得たらスキルとして追加/更新し、本 index の「最終更新」も更新する。
- 新スキル追加時は「読み方ガイド」と「一覧」の両方に追記する。
- スキルは実践的なやり方・コードパターン・回避策を書く。設計の正本は docs/arch。
- AGENTS.md と重複する作業規約はスキルに書かず AGENTS.md を正とする。
- 各スキルは `<kebab-case>/SKILL.md`（YAML frontmatter に `name` / `description`）。

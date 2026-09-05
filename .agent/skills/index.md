# Skills Index — Agent のスキル集

> このファイルは `.agent/skills/` の**入口**。タスク着手時に本ファイルだけ読み、
> 必要なスキルだけをピンポイントで読み込む（コンテキストの無駄遣いを防ぐ）。
>
> ここにあるのは **Agent 自身のスキル** — 「このプロジェクトで何をどうやるとうまくいくか」
> という実践的なノウハウ・テクニック・手順・パターン・コードベース知識。
> 仕様書（設計の正本）ではない。設計の事実（技術選定・プロトコル）は [`../../docs/arch/`](../../docs/arch/README.md) が正本で、
> スキルはそれを踏まえつつ「実際に手を動かすやり方」を持つ。
> 作業規約（コミット手順・Lint 等）は [`../../AGENTS.md`](../../AGENTS.md)。

## 読み方ガイド（どの状況でどのスキルを使うか）

| 状況 | 使うスキル |
| :--- | :--- |
| 初回 / 全体把握 | [`project-overview/SKILL.md`](./project-overview/SKILL.md) |
| このプロジェクトの技術構成・ライブラリの使いどころを押さえる | [`tech-stack/SKILL.md`](./tech-stack/SKILL.md) |
| 「動かない / テストできない / ネットワーク・WebGL が絡む」環境トラブル | [`sandbox-constraints/SKILL.md`](./sandbox-constraints/SKILL.md) |
| 設計の正本（技術選定・プロトコル・設計ルール）を確認する | 仕様書 [`../../docs/arch/`](../../docs/arch/README.md)（tech-stack / networking / game-engineering-principles） |

## スキル一覧

| スキル | できるようになること（Agent の能力） | 最終更新 |
| :--- | :--- | :--- |
| [project-overview/SKILL.md](./project-overview/SKILL.md) | プロダクトの目標・全体像・フェーズ状況を素早く把握し、何を作っているかを理解する | 2026-09-03 |
| [tech-stack/SKILL.md](./tech-stack/SKILL.md) | 各ライブラリをどこでどう使うか・選定の理由・ハマりどころを押さえて実装できる | 2026-09-03 |
| [sandbox-constraints/SKILL.md](./sandbox-constraints/SKILL.md) | Sandbox/ネットワーク/GitHub App の制約を迂回して検証・実装を進められる（E2E 不可・実結合は実環境確認等） | 2026-09-03 |

## 設計仕様の正本（スキルではなく docs/arch/）

| 仕様書 | 内容 |
| :--- | :--- |
| [docs/arch/tech-stack.md](../../docs/arch/tech-stack.md) | 技術スタック完全ガイド＋設計・実装黄金ルール（WebGPU→WebGL2 フォールバック、可変 FPS 等） |
| [docs/arch/networking.md](../../docs/arch/networking.md) | ネットワーク＆リアルタイム設計（WebTransport 主 / WebSocket フォールバック、シム60Hz・送信30Hz、msgpackr、FX クライアント再生） |
| [docs/arch/game-engineering-principles.md](../../docs/arch/game-engineering-principles.md) | FPS 設計の黄金ルール・実装パターン集 |

> 実装テクニック・ハマりどころ・コードベース知識は **skills** に貯め、設計の事実そのものは **docs/arch** を正本とする。

## 運用ルール

- 新しいノウハウ・テクニック・手順・パターンを得たらスキルとして追加/更新し、必ず本 index の「最終更新」も更新する。
- 新スキル追加時は「読み方ガイド」と「一覧」の両方に追記する。
- スキルは Agent の能力メモなので、実践で使える具体的なやり方・コードパターン・回避策を書く。設計の正本は docs/arch に任せ、重複したらそちらを参照する。
- AGENTS.md と重複する作業規約はスキルに書かず AGENTS.md を正とする。
- スキルのディレクトリ構造は Claude Code 準拠: 各スキルは `<kebab-case>/SKILL.md`（`SKILL.md` 冒頭に `name` / `description` の YAML frontmatter）。新規スキルはフォルダを作り `SKILL.md` を置く。

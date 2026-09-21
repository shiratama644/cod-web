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
| ライブラリの使いどころ・サンドボックスでの bun/Vite/WS ハマり | [`tech-stack/SKILL.md`](./tech-stack/SKILL.md), [`bun-runtime/SKILL.md`](./bun-runtime/SKILL.md) |
| 「動かない / テストできない / ネットワーク・GPU が絡む」環境トラブル | [`sandbox-constraints/SKILL.md`](./sandbox-constraints/SKILL.md) |
| Bun WS / Channel / Input 16B / backpressure / rate limit | [`networking/SKILL.md`](./networking/SKILL.md) |
| SimProfile決定論 / same-input / heavy determinism | [`deterministic-sim/SKILL.md`](./deterministic-sim/SKILL.md) |
| ゼロアロケ / GC削減 / head indexリング / Map再利用 | [`zero-alloc/SKILL.md`](./zero-alloc/SKILL.md) |
| メモリリーク / Room leave時のclear | [`memory-leak/SKILL.md`](./memory-leak/SKILL.md) |
| レイヤー境界 / Biome import制限 / workspace:* | [`import-boundaries/SKILL.md`](./import-boundaries/SKILL.md) |
| Vitest coverage 85% / handlers分離 / babylonDepsファサード | [`testing/SKILL.md`](./testing/SKILL.md) |
| Playwright E2E / webServer配列 / discovery検証 | [`e2e/SKILL.md`](./e2e/SKILL.md) |
| quality-gates.yml / CI / manual dispatch | [`ci-quality-gates/SKILL.md`](./ci-quality-gates/SKILL.md) |
| ドキュメント整理 / URL検証 / proposal削除 / 内部リンク | [`docs-maintenance/SKILL.md`](./docs-maintenance/SKILL.md) |
| Babylon Engine初期化 / R3F排除 / thinEngine.pure | [`babylon-engine/SKILL.md`](./babylon-engine/SKILL.md) |
| Pointer Lock / raw mouse / InputController蓄積 | [`input-accumulation/SKILL.md`](./input-accumulation/SKILL.md) |
| BVH衝突 / kinematic controller / SimProfile分離 | [`physics-collision/SKILL.md`](./physics-collision/SKILL.md) |
| gamemode API / sdk facade / ffa最小 / hybrid async / ctx spawn | [`gamemode-api/SKILL.md`](./gamemode-api/SKILL.md) |
| 設計の正本（プロダクト・プロトコル・ADR・マイルストーン） | [`../../docs/arch/`](../../docs/arch/README.md)（product / protocol / engineering / adr / milestones） |

## スキル一覧

| スキル | できるようになること（Agent の能力） | 最終更新 |
| :--- | :--- | :--- |
| [project-overview/SKILL.md](./project-overview/SKILL.md) | プロダクト目標・現行コード（移行元）と理想フェーズを素早く把握する | 2026-09-20（PH2-E same input + determinism） |
| [tech-stack/SKILL.md](./tech-stack/SKILL.md) | 理想スタックと移行元コードのハマりどころを区別して実装できる | 2026-09-22（URL検証 + coverage 85%） |
| [sandbox-constraints/SKILL.md](./sandbox-constraints/SKILL.md) | Sandbox / ネットワーク / GitHub App の制約を迂回して検証できる | 2026-09-22（bun npm経路 + E2E discovery） |
| [bun-runtime/SKILL.md](./bun-runtime/SKILL.md) | BunをSandboxで確実に導入・復旧し、workspaces/serveを正しく使う | 2026-09-22（adopt-bun + restore-sandbox-env） |
| [networking/SKILL.md](./networking/SKILL.md) | Bun WS権威サーバー、Channel framing、Input 16B、backpressure、rate limitを正しく実装 | 2026-09-22（PH0-A/B/C + PH1-C + EM01 + EM02 handlers） |
| [deterministic-sim/SKILL.md](./deterministic-sim/SKILL.md) | SimProfile.step決定論を守り、same-input + heavy determinismテストを実装 | 2026-09-22（PH2-E 1000x100 0.8s） |
| [zero-alloc/SKILL.md](./zero-alloc/SKILL.md) | ホットパスでゼロアロケを守り、GCを出さない実装パターンを適用 | 2026-09-22（EM01 B4-B13全対応） |
| [memory-leak/SKILL.md](./memory-leak/SKILL.md) | Room leave時のLagCompStore/inputQueues/paused/RateLimiterリークを防ぐ | 2026-09-22（EM01 B1-B3,B14） |
| [import-boundaries/SKILL.md](./import-boundaries/SKILL.md) | Biome import制限でL1/L2/Apps境界を守り、workspace:*を正しく使う | 2026-09-22（PH1-B + PH2-A/B/C/D） |
| [testing/SKILL.md](./testing/SKILL.md) | 意味あるテストでcoverage 85%を達成し、handlers/babylonDeps分離を実装 | 2026-09-22（EM02 95.12%/87.97%/90.7%/96.8%） |
| [e2e/SKILL.md](./e2e/SKILL.md) | PlaywrightをSandboxでも安全に扱い、webServer配列とdiscovery検証を実装 | 2026-09-22（PH1.5-C/D公式URL検証） |
| [ci-quality-gates/SKILL.md](./ci-quality-gates/SKILL.md) | quality-gates.ymlを正本としてCIを運用し、manual dispatchを扱う | 2026-09-22（proposal削除 + inputs.job） |
| [docs-maintenance/SKILL.md](./docs-maintenance/SKILL.md) | ドキュメント整理とURL検証、proposal削除、内部リンク整合性を保つ | 2026-09-22（DOC-4/5/6 + URL全検証） |
| [babylon-engine/SKILL.md](./babylon-engine/SKILL.md) | Babylon Engine初期化とR3F排除、thinEngine.pure型解決、Depsファサード | 2026-09-22（PH1-D + EM02） |
| [input-accumulation/SKILL.md](./input-accumulation/SKILL.md) | Pointer Lock/raw mouse、InputController蓄積/消費、joystick deadzone | 2026-09-22（PH1-E + EM02 95%） |
| [physics-collision/SKILL.md](./physics-collision/SKILL.md) | BVH衝突とkinematic controllerをSimProfileへ分離 | 2026-09-22（PH2-B seam + voxel契約） |
| [gamemode-api/SKILL.md](./gamemode-api/SKILL.md) | gamemode-api core + sdk facade、define検証、RoomCtx、hybrid async、ctx spawn | 2026-09-22（PH3-A L1 core + facade + ffa主pvpエイリアス） |

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

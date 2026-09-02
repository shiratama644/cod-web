# cod-web タスクリスト（唯一の正本）

> **運用ルール** — Qiita「Claude Code／Codex に中〜大規模開発を任せるためのタスク管理」
> (<https://qiita.com/Y-Y-dev/items/d526fb7cdbe35a3f9384>) に基づく運用。
>
> 1. **本ファイルが進捗管理の唯一の正本**。チャット・Issue・AI の完了報告と本ファイルが
>    矛盾する場合は本ファイルを正とする (AGENTS.md §6.8)。
> 2. **進行中タスクは原則 1 件**。複数を同時に進めない（独立性の高い調査・テストを除く）。
> 3. **タスク ID は再利用しない**。中止したタスクは行を消さず「対象外」にして理由を残す。
> 4. **作業中に見つけた新問題は新タスクとして登録**し、現在のタスクへ混ぜない
>    （現在の完了条件に必須の場合のみ例外）。
> 5. 完了は **AI の自己申告ではなく証拠で判定**する（テスト件数 / コミット SHA / PR / 実測値）。
> 6. 個別タスクの詳細（目的・変更範囲・禁止事項・完了条件・テスト方法・停止条件）は
>    `docs/planning/*_PLAN.md`（計画書テンプレート `_TEMPLATE.md` 準拠）に書く。
>
> **状態の定義**: `未着手` / `調査中` / `実装中` / `ローカル検証済み` /
> `実環境検証待ち`（デプロイ先・実機での確認が残る）/ `完了` / `保留`（外部判断待ち）/
> `対象外`（中止・不採用。理由を残す）

---

## プロジェクト概要

[Krunker.io](https://krunker.io) にインスパイアされたブラウザ向け**クロスプラットフォーム・オンラインFPS**（Krunker の完全上位互換が目標）。**最重要目標は「どの端末でも安定 60FPS 以上」**。技術スタック・設計ルールの大本は
[`CONFIG.md`](./CONFIG.md)。開発規約は [`../AGENTS.md`](../AGENTS.md)。

> レンダラーは **WebGPU 最優先 + WebGL2 自動フォールバック**（WebGL2 を全端末 60FPS の基準）。
> **描画 FPS は可変**（rAF = 60〜120Hz+。60 は全端末の下限フロアであり上限ではない）で、ネット tick 30Hz とは独立・delta time ベース。
> ネットワーク方針は確定: **WebTransport（datagrams+streams）主 / WebSocket フォールバック**、サーバー tick・入力 30Hz、シリアライズ msgpackr、FX はアクションフラグ＋トリガーのみ送信でクライアント再生。詳細は [`planning/NETWORK_DESIGN.md`](./planning/NETWORK_DESIGN.md)。

ロードマップの大枠（フェーズ分割は計画書作成時に確定）:

| Phase | テーマ | 状態 |
|---|---|---|
| **0** | プロジェクト基盤（Vite/React/TS/Biome/Vitest、R3F シーン［WebGPU+WebGL2 フォールバック］、ゲームループ骨架） | 計画済み・未着手 |
| 1 以降 | プレイヤー操作 / 物理・当たり判定 / ECS / 武器・射撃 / ネットワーク（権威サーバー・トランスポート確定後）/ ボイス / HUD・UI / モバイル入力 / アセットパイプライン / パフォーマンス（全端末 60FPS 検証） | 未定（Phase 0 完了後に計画） |

---

## Phase 0: プロジェクト基盤構築

> 計画書: [`planning/PHASE00_PLAN.md`](./planning/PHASE00_PLAN.md)（_TEMPLATE.md 準拠）。
> ゴール: ゲームコードを置くための最小動作する土台。**各サブタスク = 1 commit を原則**。
> ネットワーク・本格的なゲームプレイ実装は Phase 1 以降（Phase 0 に含めない）。

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| P0-A | Vite + React + TypeScript プロジェクト初期化（**bun** パッケージ管理・`bun.lock`、strict、`src/` 構成、`.nvmrc`、bun を devDependency 固定） | 未着手 | 0% | - | `bun install` 成功・`bun run dev` / `bun run build` が通り、空画面が表示される | |
| P0-B | Biome 導入（lint + format、テスト overrides）+ `bun run lint` 整備 | 未着手 | 0% | P0-A | `bunx biome lint .` が 0 error | |
| P0-C | Vitest + @testing-library/react 導入（jsdom 環境）+ `bun run test:unit` 整備 | 未着手 | 0% | P0-A | サンプルテストが `vitest run` で green | |
| P0-D | Three.js / @react-three/fiber / @react-three/drei 導入とシーン基盤（Canvas・カメラ・ライト・地面）。**WebGPURenderer を最優先、WebGPU 不在時は WebGL2 へ自動フォールバック**（`navigator.gpu` 判定） | 未着手 | 0% | P0-A | WebGPU 対応環境と非対応環境（WebGL2）の両方で 3D シーンが表示され、フォールバック機構がコード上で明示されている | |
| P0-E | ゲームループ骨架（`useFrame` ベース、ref 直接更新・ゼロアロケーション方針の確立） | 未着手 | 0% | P0-D | 毎フレーム回転するオブジェクト等でループ動作を確認、React State 非依存の更新であること | |
| P0-F | Zustand 導入（ゲーム状態ストアの骨架） | 未着手 | 0% | P0-A | サンプルストアを置き、`getState()`/`subscribe` 利用の方針をコードで提示 | |
| P0-G | 4 検証コマンド整備（typecheck / lint / test:unit / build）+ `.agent/hooks/verify-before-commit.md` の実コマンド整合確認 | 未着手 | 0% | P0-B/C | AGENTS.md §3.1 の 4 コマンドが全て実在し PASS | |
| P0-H | ドキュメント/skills の実態追従（README のセットアップ手順検証、`.agent/skills/tech-stack.md` 等を実装後の実態に更新） | 未着手 | 0% | P0-G | docs・skills と実コードの間に不整合がない | |

※ Playwright（E2E）は CI 基盤タスクとして Phase 1 以降で計画（Sandbox では実行不可、AGENTS.md §6.2）。
※ ゲームサーバー基盤は Phase 1 以降のネットワークフェーズで計画。トランスポートは **WebTransport 主 / WebSocket フォールバック**で確定（[NETWORK_DESIGN](planning/NETWORK_DESIGN.md)）。Phase 0 では NetTransport 抽象境界のインターフェースのみ定義し、実装（WT/WS）は Phase 1。

---

## 検証待ち・将来タスク

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| CI-1 | GitHub Actions CI（typecheck / lint / unit / build / E2E）の `docs/ops/` 提案 → ユーザー配置 | 未着手 | 0% | P0-G | ワークフロー YAML を docs/ops に用意（`.github/workflows/` は書き込み不可、AGENTS.md §6.3） | |
| DEPLOY-1 | 静的ホスティング（Vercel/Netlify 等）へのデプロイ方針確定と手順書 | 未着手 | 0% | Phase 1 以降 | デプロイ手順を docs/ops に整備 | |

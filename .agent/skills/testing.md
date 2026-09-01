# Testing — vitest + msw + Playwright

> テスト・カバレッジ・モック・E2E を触る時に読む。

## コマンド（設定ファイルのスクリプトを正とする）

実装フェーズ確定後に `package.json` のスクリプトをここに記す。標準:

| コマンド | 用途 |
| :--- | :--- |
| `pnpm test:unit` | `vitest run`（**commit 前検証はこれ**, `pnpm test` は watch なので使わない） |
| `pnpm test:coverage` | `vitest run --coverage`（threshold チェック） |
| `pnpm test:e2e` | `playwright test`（環境で実行不可なら CI のみ） |

## スタック（初期想定）

- **Vitest** + jsdom + @testing-library/react + **msw** (Mock Service Worker) + fake-indexeddb。
- クライアント: React + three.js（`@react-three/fiber`）。サーバー: Node（権威サーバー）。
- **shared（決定論的シミュレーション）は単体テストの最重点** — クライアント/サーバー同一結果を固定シード再生で保証する。

## 検証メモ（実装フェーズで追記）

- 描画・入力・ネットワークはブラウザ API 依存のため、jsdom では未実装 API の stub が必要（`matchMedia` / `requestAnimationFrame` / `IntersectionObserver` 等）。
- three.js は WebGL 依存のため、単体テストではロジック層（shared / server）を中心にし、描画は E2E で担保。

## E2E（Playwright）

- クライアント描画・入力・ゲームフローを CI で検証。
- **開発環境で Chromium install 不可の場合は、書けるが実行不可**。CI（GitHub Actions）のみ。
- `webServer` にクライアント・サーバーを起動する設定を置く。

## CI

- 正本を `docs/ops/CI_WORKFLOW.yml` に置き、必要に応じユーザーが `.github/workflows/` へ配置。
- job: static-checks（tsc / lint / vitest+coverage）→ build → e2e（可能なら）。

## 関連

- AGENT.md §3（検証ルール）/ [sandbox-constraints.md](./sandbox-constraints.md)

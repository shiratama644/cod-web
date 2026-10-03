# Next.js フロントエンド採用 + Vite+React クライアント削除（Next 主化）

> Date: 2026-10-03(JST)（採用は 2026-10-02） / Commits: 47d79d3, eb3aa2f, 40b44eb, 2a93a99 / Branch: arena/01a0b161-cod-web

## 1. 指示内容 (Task Summary)

1. (2026-10-02) ユーザー提供の Next.js 製 CoD-Mobile-UI アプリをフロントエンドとして採用する。
2. (2026-10-03) Next.js アプリをメインにし、Vite+React フロントエンド（旧 apps/web）を削除する。

## 2. 実行内容 (Executed Actions)

| # | 対象 | 実装 |
|---|---|---|
| 1 | 採用 | ユーザー zip を取り込み `apps/web-next` としてモノレポ統合（47d79d3, eb3aa2f）。@types/react を root ^19.2.x に揃えて dedupe、allowedDevOrigins（*.e2b.app）、DB 無し環境向け in-memory fallback、`.next/`・`*.tsbuildinfo` ignore（40b44eb） |
| 2 | 削除 | `git rm` で旧 apps/web・`_tests_/apps/web`・`e2e/game-shell.spec.ts` を削除、`apps/web-next` → `apps/web` に rename（2a93a99） |
| 3 | ネットコード保全 | ClientPrediction / Interpolator（純粋コード）を `packages/engine-core/src/client/` へ移設、テストは `_tests_/packages/engine-core/client/` へ。same-input 決定論ゲートの import を更新（テスト削除で逃げない） |
| 4 | 設定整理 | root package.json / tsconfig / tsconfig.base / vitest.config / biome.json（apps/web 除外、overrides 12→8）/ playwright.config（webServer = next build + preview :4173）/ `e2e/main-menu.spec.ts` 新規 |
| 5 | 検証 | `bun run check:all` 7/7 PASS、`cd apps/web && bun run typecheck` PASS、dev サーバー :3000 で 200 + `/api/health` 確認 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- @types/react の二重解決は framer-motion 経由の TS2322（unique symbol Key）で発覚する。lockfile の @types/react エントリ数で検出可能。
- 旧クライアント削除時、same-input テストが削除ファイルを import して typecheck が落ちた。**純粋ネットコードは packages へ移設してテストを維持**するのが正解（AGENTS.md §3.2: テストを通すための削除禁止）。
- ターン開始時に HEAD だけが 198de4e に巻き戻る事象が再発（計4回以上）。ワークツリーが最新の場合は `git reset --soft origin/<branch>` + `git reset -q`。`--hard` は厳禁（完全再構築時のみ）。
- Biome は apps/web を見ない体制に変更（ESLint が正）。root typecheck にも apps/web は含まれないため、web 変更時は app ローカルで typecheck + lint。
- → 再利用知見は `.agent/skills/nextjs-frontend/SKILL.md` に昇格、hooks（pre-task / verify-before-commit / sandbox-rebuild-recovery）を更新（2026-10-03）。

## 4. 次にすべきこと (Next Actions)

1. `packages/engine-core/src/client/` の prediction/interpolation は S フェーズで Next app に再統合予定。ユーザーが不要と判断すれば削除可（打診済み・返答待ち）。
2. AGENTS.md §3.1/§6 の Vite 前提記述（`vite build`、noConsole パス等）が stale。ユーザー確認の上で更新する。
3. R1 リサーチ or S フェーズ設計の GO 待ち。

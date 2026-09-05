# Phase 0: プロジェクト基盤構築

> 対応 task-list ID: `P0-A` 〜 `P0-H`（[docs/task-list.md](../task-list.md)）
> 計画書テンプレート: [docs/planning/_TEMPLATE.md](./_TEMPLATE.md) 準拠

## 1. 開始前確認

- 現在のブランチ / HEAD / `git status` を確認する（未コミット変更があれば停止）
- `docs/task-list.md` で依存タスクの完了を確認する
- 関連仕様（[`../arch/tech-stack.md`](../arch/tech-stack.md) / [`../../AGENTS.md`](../../AGENTS.md) §6 / [`.agent/skills/`](../../.agent/skills)）を読む
- 本計画書の §5（完了条件）と §7（停止条件）を再読する

## 2. 目的 (Why)

ゲームプレイの機能開発に入る前に、**最小限動作する開発基盤**を確立する。

- ツールチェーン（Vite / React / TS / Biome / Vitest）を導入し、AGENTS.md §3.1 の 4 検証コマンドが実在して PASS する状態を作る。
- Three.js / R3F のシーンとゲームループの骨架を置き、arch/tech-stack.md の黄金ルール（**ゲームループと React レンダリングの分離**・**ゼロアロケーション**）を初期コードの段階で体現して、後続フェーズがこのパターンを踏襲できるようにする。
- ネットワーク・本格ゲームプレイは Phase 1 以降に分離し、スコープを肥大化させない。

## 3. 変更範囲 (Scope)

変更対象:
- `package.json` / `bun.lock` / `tsconfig.json` / `tsconfig.node.json` / `vite.config.ts` / `biome.json` / `vitest.config.ts`（新規）
- `.nvmrc` / `index.html` / `src/`（main エントリ・App・R3F シーン・ゲームループ骨架・Zustand ストア骨架）
- `__tests__/`（サンプルユニットテスト）
- `README.md`（セットアップ手順が実態と一致するか検証・必要なら更新）
- `.agent/hooks/verify-before-commit.md`（検証コマンドの実態整合）
- `.agent/skills/tech-stack/SKILL.md` 等（実装後の実態へ追従）
- `docs/task-list.md`（状態・証拠の更新）

変更しない（境界外）:
- ゲームサーバー（Colyseus / geckos.io / socket.io）の導入・実装
- プレイヤー操作・物理・当たり判定・武器・ネットワーク同期などのゲームプレイ機能
- `.github/workflows/`（書き込み不可。CI は `docs/ops/` 提案に留める、AGENTS.md §6.3）
- Playwright E2E の実行（Sandbox 不可。設定は置いても実行は CI のみ）

## 4. 禁止事項

- 推測でライブラリのバージョンや API を決めず、arch/tech-stack.md に記載のない主要ライブラリを導入する場合はユーザーに確認する（§7 停止条件）。
- 無関係なリファクタリング・機能追加をしない（「ついでに」禁止、AGENTS.md §1.1）。
- テストを通すためだけに、テストのスキップ・アサーション緩和・安易な `any`・Lint 無効化をしない（AGENTS.md §3.2）。
- ゲームループ内（`useFrame` 等）で毎フレーム `new THREE.Vector3()` 等のオブジェクトを生成しない（CONFIG 黄金ルール5）。
- 毎フレーム更新する座標等を React State で管理しない（CONFIG 黄金ルール4）。ref / Zustand の `getState()` を使う。
- 不明点は推測で埋めず、§7 の停止条件に従って質問する。

## 5. 完了条件 (DoD)

- [ ] `bun install` が成功する
- [ ] `bun run typecheck`（`tsc --noEmit`）が 0 error
- [ ] `bunx biome lint .` が 0 error / 0 warning
- [ ] `bun run test:unit`（`vitest run`）が green（サンプルテスト最低 1 件）
- [ ] `bun run build`（`vite build`）が成功し、`dist/` に成果物が出力される
- [ ] `bun run dev` / `bun run preview` で R3F シーン（カメラ・ライト・地面・オブジェクト）と、`useFrame` による毎フレーム更新が確認できる（プレビュー URL で HTTP 200）
- [ ] ゲームループが React State 非依存（ref / Zustand 直接更新）で、ループ内に毎フレームのオブジェクト生成がないことをコードレビューで確認
- [ ] `docs/task-list.md` の P0-A〜H の状態・進捗・証拠（コミット SHA / テスト件数 / 実測バンドルサイズ）を更新
- [ ] AGENTS.md §3.1 の 4 検証コマンドが全て実在し、`.agent/hooks/verify-before-commit.md` の記述と一致

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit (vitest) | ✅ | サンプルの純粋関数 / Zustand ストア動作を `vitest run` で検証 |
| Component (testing-library) | ✅ | App / UI コンポーネントのスモークレンダリング（R3F は WebGL 非依存の部分を中心に） |
| E2E (Playwright / CI) | ❌（Phase 0 では設定のみ・実行は CI） | Sandbox では Chromium 不可（AGENTS.md §6.2） |
| 実環境（プレビュー / 実機） | ✅/検証待ち | `bun run dev` / `bun run preview` でシーン表示をライブプレビューで確認。WebGPU の実機差はユーザー環境/実機でも確認（実環境検証待ちとして報告） |

## 7. 停止条件

次の場合は作業を停止し、変更せず報告する:
- 仕様書（arch/tech-stack.md・計画書・AGENTS.md・skills）同士に矛盾がある
- task-list.md 記載の変更範囲を超える変更が必要（例: ゲームサーバー基盤が Phase 0 に必要になった等）
- 破壊的変更（既存データ・公開 API 互換性）が必要
- ユーザー判断が必要な設計論点に到達した（レンダラー方針は「WebGPU 最優先 + WebGL2 自動フォールバック」で確定済み。それ以外に新たな論点、例: ECS を miniplex/bitecs どちらで始めるか、ネットワークのトランスポート等）
- 開始時点で作業ツリーに未確認の変更がある

## 8. 完了時に行うこと

1. 差分を自己レビュー（対象外の変更が混ざっていないか）
2. 4 検証（typecheck / lint / test:unit / build）を実行
3. `docs/task-list.md` の状態・進捗・証拠を更新
4. タスク ID を含むコミット（例: `feat(P0-A): vite react-ts scaffold`）を作成し、`<session-branch>` へ push
5. `.agent/logs/YYYY-MM-DD_*.md` にログを記録し、知見を skills へ同期
6. 証拠中心の完了報告（結果 / テスト件数 / Git SHA / バンドルサイズ / 残事項）

## 9. サブタスク分割

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| P0-A | Vite + React + TS 初期化 | package.json / vite.config.ts / tsconfig / index.html / src 骨架 | - |
| P0-B | Biome 導入 | biome.json / `bun run lint` | P0-A |
| P0-C | Vitest 導入 | vitest.config.ts / サンプルテスト / `bun run test:unit` | P0-A |
| P0-D | R3F シーン基盤 | three / @react-three/fiber / drei、Canvas・カメラ・ライト・地面。WebGPURenderer 最優先 + WebGL2 自動フォールバック（`navigator.gpu` 判定） | P0-A |
| P0-E | ゲームループ骨架 | `useFrame` ベースのループ、ref 直接更新・ゼロアロケーション | P0-D |
| P0-F | Zustand 導入 | ゲーム状態ストア骨架 | P0-A |
| P0-G | 4 検証整備 | typecheck/lint/test:unit/build の全 PASS と hooks 整合 | P0-B/C |
| P0-H | ドキュメント/skills 実態追従 | README・skills・task-list の整合 | P0-G |

## 10. 設計詳細・仕様

<!-- 実装を進めながら、採用したディレクトリ構成・依存バージョン・ゲームループのパターンを記録する。 -->

- ディレクトリ構成（想定）: `src/main.tsx`（エントリ）/ `src/App.tsx` / `src/game/`（R3F シーン・ループ・ECS 等のゲームコード）/ `src/components/`（UI）/ `src/store/`（Zustand）/ `src/lib/`（汎用ユーティリティ）。テストは `__tests__/` または併置。
- ゲームループのパターン（CONFIG 黄金ルール4・5）: 毎フレーム更新は `useFrame` 内で ref の `position`/`rotation` を直接書き換え、一時ベクトルはモジュールスコープにプールして再利用。React State は UI 表示用の値に限定。
- **パッケージ管理/ランタイムは bun**（ユーザー指定 2026-09-03、Sandbox で bun 1.4.0 動作確認済み）:
  - `bun install` / `bun run` / `bunx` を使用、ロックファイルは `bun.lock`。
  - bun は devDependency としてバージョン固定（`1.4.0`）。`package.json` に `packageManager` / `engines` で bun 使用を明示。
  - テストランナーは **Vitest**（`vitest run`）を維持し、`bun test` は使わない（jsdom + @testing-library 互換優先、AGENTS.md §3.1/§6.1）。
  - ビルド/Dev は Vite（bun 経由で起動）。Biome は `bunx biome`。
  - ゲームサーバー（Colyseus 等）も bun ランタイムを想定するが、互換検証はネットワークフェーズ（Phase 1 以降）。
  - Sandbox 再構築時の bun 導入は `.agent/hooks/restore-sandbox-env.sh` が npm 経由で行う（bun.sh は到達不可のため）。

## 11. リスク・Gotchas

- レンダラー方針は確定済み（**WebGPU 最優先 + WebGPU 不在時は WebGL2 へ自動フォールバック**、WebGL2 を全端末 60FPS の基準）。Phase 0 のシーンは WebGL2 でも表示できることを必ず確認し、フォールバック機構を初期からコードに入れる。WebGPU 固有機能（Compute/TSL）は WebGL2 で機能が欠落しない範囲で後続フェーズに段階導入。
- Three.js はバンドルが大きい。`vite build` 後に `dist/assets/` のサイズを計測し、依存の重複がないか確認する（chunk 分割は Phase 1 以降でも可）。
- R3F の Canvas を jsdom ユニットテストでレンダリングすると WebGL 未サポートで失敗しうる。コンポーネントは WebGL 非依存の部分を分離してテストする。

## 12. 実績と証拠（実装後に記入）

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| P0-A | `08c65d7` | — | Vite 8.2.2 + React 19.2.8 + TS 7.0.2（bun 1.4.0 固定）。typecheck 0、build OK（JS gzip 60KB）、dev HTTP 200 |
| P0-B | `85c1a78` | — | @biomejs/biome 2.5.11。`biome lint .` 0 error |
| P0-C | `85c1a78` | 7 passed | vitest 4.1.11 + jsdom 30 + testing-library 16.3.3。clamp 5 + App スモーク 2 |
| P0-D | （Phase0 commit） | — | three 0.185.1 / R3F 9.7.0 / drei 10.7.8。createRenderer が navigator.gpu 判定で WebGPU→WebGL2 フォールバック。build/dev 配信 OK。**実機描画は実環境検証待ち** |
| P0-E | （Phase0 commit） | — | useSpin（useFrame・ref 直接更新・delta クランプ 0.05s・new なし） |
| P0-F | （Phase0 commit） | +4（store） | zustand 5.0.15。gameStore + gameStoreApi（getState/subscribe）。store テスト 4 |
| P0-G | （Phase0 commit） | 11 passed | 4 検証一括 PASS: typecheck 0 / lint 0（22 files）/ test 11 / build OK（JS gzip 453KB）。verify フックと整合 |
| P0-H | （Phase0 commit） | — | README・skills/tech-stack/SKILL.md を実態追従 |

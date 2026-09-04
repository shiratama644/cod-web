# ログ: P0-B（Biome 導入）・ P0-C（Vitest 導入）

- 日時: 2026-09-03
- 種別: chore/test（Phase 0 基盤・サブタスク P0-B / P0-C）
- ブランチ: arena/01a062ac-cod-web
- 前提: P0-A（`08c65d7`）完了済み

## P0-B: Biome（lint + format）

- `bun add -d @biomejs/biome` → **@biomejs/biome 2.5.11**。
- `biome.json` 作成:
  - `vcs.useIgnoreFile: true`（.gitignore を尊重 → dist/node_modules/coverage を自動除外）。
  - linter は `rules: { preset: "recommended" }`（**Biome 2.x では `recommended: true` が deprecated → `preset: "recommended"` に変更**。`biome migrate` で移行）。
  - formatter: space 2・lineWidth 100・single quote・trailing commas・semicolons asNeeded。
- 検証: `bunx biome lint .` → **exit 0（Checked 9 files, no fixes）**。`bun run lint`（package.json script）も同。`biome format` もクリーン。
- スクリプト: `lint` = `biome lint .`、`format` = `biome format --write .`。

### 知見
- **Biome 2.x の設定スキーマ変更**: ① `rules.recommended: true` → `rules.preset: "recommended"`。② `files.includes` のネガティブグロブ構文が変わり、`biome migrate` が生成する `!!**/!**/dist/**` はエラー（`** must be enclosed by /`）。**`vcs.useIgnoreFile: true` を使えば .gitignore で除外されるので `files.includes` は不要**。これが一番シンプル。

## P0-C: Vitest + @testing-library（jsdom）

- `bun add -d vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`
  - **vitest 4.1.11** / jsdom 30.0.1 / @testing-library/react 16.3.3 / @testing-library/jest-dom 7.0.1 / user-event 14.6.7。
- `vitest.config.ts`: jsdom 環境・globals:true・setupFiles `./vitest.setup.ts`・include `src/**/*.{test,spec}.{ts,tsx}`・`@` alias。
- `vitest.setup.ts`: `@testing-library/jest-dom/vitest` を import、afterEach で cleanup。
- サンプルテスト:
  - `src/lib/clamp.ts`（純粋関数）+ `src/lib/clamp.test.ts`（5 tests: 範囲内・下限・上限・小数・min>max で throw）。
  - `src/App.test.tsx`（2 tests: タイトル h1 と説明のスモークレンダリング）。
- 検証: `bun run test:unit`（= `vitest run`）→ **Test Files 2 passed、Tests 7 passed**。watch モードは使用せず `vitest run`（AGENTS.md §3.1）。

### 型解決で踏んだ点
- `expect(...).toBeInTheDocument()` が tsc に「Property does not exist」と言われた → jest-dom の型拡張を tsc に読ませる必要。
- 解決: ① `src/vite-env.d.ts` に `/// <reference types="@testing-library/jest-dom" />` を追加、② `vitest.setup.ts`（jest-dom/vitest を import）を `tsconfig.json` の include に追加。これで `bun run typecheck` が exit 0。

## 4 検証の現状

| コマンド | 状態 |
|---|---|
| `bun run typecheck` | ✅ exit 0 |
| `bun run lint` / `bunx biome lint .` | ✅ exit 0（14 files） |
| `bun run test:unit` | ✅ 7 passed |
| `bun run build` | ✅（P0-A で確認。dist 出力） |

## 次

P0-D: Three.js / @react-three/fiber / @react-three/drei 導入とシーン基盤（WebGPURenderer 最優先 + navigator.gpu 判定で WebGL2 自動フォールバック）。

# 2026-10-03 apps/web をリポジトリ標準構成に統一(Biome + Vitest 5)

## 指示
apps/web/ を既存のパッケージ構成・書き方に合わせる。ESLint ではなく Biome を使用し、
Vitest 5 を使用する。

## 実施内容
### Biome 化(ESLint 廃止)
- root `biome.json` の `files.includes` から `"!apps/web"` を撤廃 → apps/web も root 設定の対象に
- root `biome.json` に `css.parser.tailwindDirectives: true` を追加(Tailwind v4 `@theme` を正しく parse)
- `apps/web/eslint.config.mjs` 削除、devDeps から `eslint`・`eslint-config-next` 削除
- `apps/web` scripts: `lint: biome lint .` / `format: biome format --write .`
- layout.tsx の eslint-disable コメントを全削除(biome-ignore は維持)
- `bunx biome check --write apps/web` で root スタイル(single quote / semicolons asNeeded /
  trailingCommas all / lineWidth 100)へ全 18 ファイル再フォーマット

### Biome lint 新規検出の解消(apps/web が recommended 全ルール対象になったため)
- `noArrayIndexKey`: Background の ember に `id` 付与、Gunsmith のピップを値ベース反復に変更。
  LoadoutPanel クラス一覧(index=スロット番号で恒久 ID)と MainMenu パンくず(表示専用)は理由付き biome-ignore
- `noImgElement` ×3: framer-motion の `motion.img`(mix-blend-screen 合成アニメ)のため
  next/image 不可 → 理由付き biome-ignore

### パッケージ規約の統一
- `apps/web/package.json`: name `web` → **`@cod/web`**(gameserver と同じ `@cod/` 規約。
  root biome.json の restricted-imports は元々 `@cod/web` 前提だった)、`version: 0.0.0`・
  `type: module` 追加(他パッケージと同一)

### Vitest 5
- root `vitest`/`@vitest/coverage-v8` を ^4.1.11 → **^5.0.3** に更新
- 既存 206 テストは v5 で無修正 PASS(vmThreads pool も互換)
- sanitize ロジックを `apps/web/src/lib/loadout.ts` に切り出し(MainMenu から import)
- 既存規約(`_tests_/` に集約・ワークスペース構造ミラー・`// @vitest-environment node`・
  相対 import)どおり新規テスト 23 件追加:
  - `_tests_/apps/web/src/lib/data.test.ts`(10): データ整合性+computeStats(クランプ網羅走査・
    フォールバック・非破壊性)
  - `_tests_/apps/web/src/lib/loadout.test.ts`(13): sanitizeClass/sanitizeSaved 全分岐
- `vitest.config.ts` coverage include に `apps/web/src/lib/**` を追加

## 検証(全 PASS)
- `biome lint .` 0 件(118 ファイル)/ `biome check apps/web` 0 件
- apps/web `tsc --noEmit` 0 / `next build` 成功
- `vitest run` **229 テスト PASS**(206 既存 + 23 新規)
- coverage 93.04% / 87.57% / 87.94% / 94.14%(閾値 85% 維持)
- `check:all` 7/7 PASS(58.3s)/ cspell 0
- ランタイム: / 200、health・loadouts PUT・画像 200

## 知見
- Vitest 4→5 はこのリポジトリの範囲では破壊的変更なし(vmThreads pool・jsdom・coverage-v8 すべて互換)
- `biome check .`(format 検査)は tsconfig/scripts/_tests_ の一部に**既存の** format ドリフトがある
  (リポジトリのゲートは `biome lint .` のみ。一括再フォーマットは bulk-edit 制約もあるため今回触れていない)
- apps テスト(`_tests_/apps/*`)は root typecheck の対象外が既存規約(tsconfig.server.json は
  `_tests_/packages/*` のみ include)。apps/web もそれに合わせた
- Next.js 16 は package.json `type: module` で問題なくビルド・起動する

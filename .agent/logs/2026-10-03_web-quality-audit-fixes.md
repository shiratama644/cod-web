# 2026-10-03 apps/web 品質総点検・全エラー/実バグ修正

## 目的
apps/web/ 限定で (a) TS 型エラー (b) Biome エラー/警告 (c) `bun run build` エラーを全て洗い出して修正し、(d) 実サイトのバグも解消する。

## 初期状態の計測
- `tsc --noEmit`: 0 エラー
- ESLint: 警告 1(layout.tsx `@next/next/google-font-display`)
- `bun run build`: 成功
- Biome(ad hoc recommended 設定): 8 件
  - globals.css:3 parse(`@theme` = Tailwind v4 構文)/ :37 useGenericFontNames / :128 noImportantStyles
  - layout.tsx useGoogleFontDisplay / GunsmithPanel noNonNullAssertion・noSvgWithoutTitle / HomePanel useButtonType ×2
- **実バグ(最重要)**: `public/` ディレクトリ自体が存在せず、参照されている
  `/images/bg.jpg`・`/images/operator.png`・`/images/rifle.png` が全て 404。
  ホームの背景・オペレーター・ロードアウト/ガンスミスの武器画像が全て壊れていた。

## 修正内容
### 実バグ
1. **欠落アセット 3 点を生成し追加**(`apps/web/public/images/`)。
   IP 境界遵守のため公式アートは不使用、完全オリジナルの AI 生成画像。
   operator.png / rifle.png は `mix-blend-screen` 合成前提の純黒背景で生成。
2. **MainMenu: ロードデータ未検証**
   - API から返る classes をフィールド単位で検証し DEFAULT_CLASSES とマージする
     `sanitizeClass`/`sanitizeSaved` を追加。
   - `equipped` を classes の範囲内にクランプ(範囲外だと
     `classes[selected]` が undefined になり GunsmithPanel がクラッシュしていた)。
   - 保険として `cls={classes[selected] ?? classes[0]}`。
3. **MainMenu: 保存失敗でも SAVED 表示** → `r.ok` を確認し `error` 状態
   (`cloud_off`+SYNC FAILED 赤表示)を追加。
4. **MainMenu: ロード直後の無駄な echo PUT** → `lastSaved` スナップショット
   (JSON 文字列)比較で、内容が変わらない限り PUT をスキップ。
5. **HomePanel: マッチメイキング中に LOADOUT/GUNSMITH へ遷移すると検索が黙殺**
   → 他 UI(タブ・モード選択)と同じく `searching` 中はガード。
6. **API /api/loadouts PUT: 不正 JSON ボディで 500** → try/catch 分離で 400 を返す。
7. MainMenu パンくず: `key={h}` → `key={i-h}`(重複 key の潜在リスク除去)。

### Lint/型/スタイル
8. ui.tsx SteelButton/OrangeButton に `type="button"` デフォルト付与
   (`{...rest}` より前なので呼び出し側で上書き可)+ HomePanel の生 button 2 箇所にも付与。
9. GunsmithPanel: 非 null アサーション `find(...)!` → `?? ATTACHMENT_SLOTS[0]`。
10. GunsmithPanel: 装飾用コネクタ SVG に `aria-hidden="true"`。
11. layout.tsx: アイコンフォントの `display=block` は意図的
    (swap だとリガチャ名の生テキストが点滅)→ 理由コメント+
    eslint-disable ブロック+biome-ignore(属性行直上)で明示的に抑制。
12. globals.css: `.material-symbols-rounded` に `sans-serif` フォールバック追加、
    `.landscape-root` の `!important` 除去(競合する display 宣言が無く不要)。

## 検証(全 PASS)
- `tsc --noEmit` 0 / ESLint 0 / Biome ad hoc **0 件**
  (`css.parser.tailwindDirectives: true` で @theme parse エラーも解消 — Biome 側設定の問題であり CSS は正当)
- `bun run build` 成功(/, /_not-found, /api/health, /api/loadouts)
- ランタイム(next start, port 3000): / 200、画像 3 点 200、health 200、
  loadouts GET/PUT roundtrip OK、不正 JSON PUT=400、data 欠落 PUT=400、
  equipped 範囲外データはフロントの sanitize でクランプされることを確認
- リポジトリ全体 `bun run check:all` 7/7 PASS(45.8s)

## 知見
- **Biome 2.x の JSX 内 biome-ignore は要素直上では効かないことがある**。
  JSX 属性に対する診断(useGoogleFontDisplay は href 属性に出る)は、
  開きタグ内の **属性行直上に `//` コメント**で置くと抑制できる。
- eslint-disable-next-line と biome-ignore を同一ノードに併用すると互いの
  コメント行が「次の行」を消費して壊れる → ESLint 側を disable/enable
  ブロック形式にすると共存できる。
- Biome の `@theme`(Tailwind v4)parse エラーは
  `css.parser.tailwindDirectives: true` で解消(コード側の問題ではない)。
- `mix-blend-screen` 用のゲームアセットは「純黒背景」で画像生成すれば
  透過 PNG なしで綺麗に合成できる。

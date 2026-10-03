# 2026-10-03 Biome フォーマット規則の整備(全体フォーマット実行の準備)

## 指示
1. Biome をフォーマッターとして全ファイルをフォーマットできるよう規則を設定(b54d742)
2. さらにプロジェクト全体へ適用範囲を広げ、ドキュメントのコーディングルールに沿って設定
3. **フォーマットの実行はまだしない**(ユーザー Go 待ち)

## 設定内容(biome.json)
- formatter 明示化: lf / formatWithErrors=false / space 2 / lineWidth 100
- javascript: single quote / JSX double / semi asNeeded / trailingCommas all /
  quoteProperties asNeeded / arrowParentheses always / bracketSpacing true /
  bracketSameLine false / attributePosition auto
- json: formatter 有効 + trailingCommas none。tsconfig*.json は override で
  JSONC(allowComments/allowTrailingCommas)
- css: formatter 有効 + quoteStyle double(parser.tailwindDirectives は設定済み)
- assist.organizeImports: on(明示)
- **AGENTS.md §6.5 の documented ルールを反映**: `suspicious/noConsole: error` を全体に設定し、
  override で許容を限定 — apps/gameserver/src(運用ログ・§6.5 明記)、scripts(CLI 出力が本務)、
  テスト(`console.log = vi.fn()` モック)
- 除外: `!.agent`(エージェント基盤。workflows/*.js はトップレベル return を使う
  Claude ワークフロー DSL で JS として parse 不能・ログは追記専用)、
  `!.archive`(旧仕様・AGENTS で lint/build/test 対象外)、`!logs`(check:all 機械生成)、`!bun.lock`

## 試行錯誤
- `!.agent` → `!.agent/logs` に狭めて「全体」適用を試みたが、
  `.agent/workflows/implement-task.js` が parse エラー(トップレベル return)+ lint 4 エラーに
  なるため `.agent` 全体除外へ戻した。.agent 配下で Biome 整形可能な実ファイルは
  settings.json 1 件のみで実益なし。

## ドライラン実測(--write なし・ファイル無変更)
- `biome lint .`: 0 件(117 files)— noConsole 追加後もゲート green
- format 差分: **20 ファイル**(_tests_ 6 / packages 7 / scripts 4 / tsconfig 3)
  すべて apps/web 外の既存ドリフト。apps/web は差分 0
- assist(organizeImports)差分: 0

## 次アクション(Go 待ち)
`bunx biome check --write .` → check:all 検証 → commit。

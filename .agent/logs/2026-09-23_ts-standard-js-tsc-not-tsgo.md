# TypeScript: 標準の JS tsc に固定（Go製 tsgo 排除）

> Date: 2026-09-23(JST) / Branch: arena/01a0b161-cod-web / Base: b4a940f
> 対象: package.json, bun.lock, .agent/skills/tech-stack/SKILL.md

## 1. 指示内容

- ユーザー: 「Goツールチェーンではなく標準のTypeScriptを使用すること。公式のTypeScriptをプロジェクトの開発依存関係に `bun add -d typescript` でインストール。これにより Bun は tsgo バイナリではなく標準の JS tsc を使用し、proot パスのバグを回避する」
- 前提: ユーザー環境は proot-distro の Ubuntu。tsgo（Goバイナリ）はパスバグで失敗する

## 2. 調査結果（重要）

| 項目 | 事実 | 証拠 |
|---|---|---|
| `typescript@latest` | **7.0.2 = Go製 tsgo（ネイティブ）** | `npm view typescript dist-tags` → latest=7.0.2 |
| typescript@7.0.2 の配布形態 | `@typescript/typescript-{linux-arm64,linux-x64,...}` の**プラットフォーム別プレビルドバイナリ**を optionalDependencies で同梱 | `npm view typescript@7.0.2` / b4a940f の bun.lock L522（`optionalDependencies: @typescript/typescript-*` 20件） |
| 標準の JS 実装 | **typescript@6.x**（6.0.2 / 6.0.3 のみ）。`bin: {tsc, tsserver}` 純JS、プラットフォームバイナリなし | `npm view typescript@">=6.0.0 <7.0.0" version` / bun.lock L482 |
| b4a940f の対応 | `typescript@^7.0.0` を「standard JS tsc」として導入していたが、lockfile の証拠上 **7.0.2 = Goバイナリ**であり前提誤り（sandbox 通常Linuxでは動作・高速 3003ms だったため検知できず） | `git show b4a940f -- bun.lock` |

**結論**: 素の `bun add -d typescript` は `typescript@latest`=7.0.2（Go）をインストールするため、ユーザーの意図（JS tsc）と逆向きになる。JS 実体の 6.x にピン留めする。

## 3. 実施

1. `bun add -d typescript@^6.0.3`（ユーザー指示の `bun add -d typescript` を JS major に固定して実行）
2. 検証:
   - `node_modules/.bin/tsc --version` → **Version 6.0.3**
   - `node_modules/@typescript` ディレクトリ**なし**（Go プラットフォームバイナリ未インストール）
   - `bun.lock` に `@typescript/typescript-*` エントリ **0件**
   - `bun run typecheck` pass（tsc は `node_modules/.bin/tsc` = JS 6.0.3 に解決。`bun run` は `node_modules/.bin` を PATH 先頭に付与し、グローバルの tsgo を shadow）
3. `.agent/skills/tech-stack/SKILL.md` 更新:
   - 「TypeScript 7」記述を「標準 JS tsc のみ（`typescript@^6.0.3`）」に改訂
   - tsgo 禁止の根拠（optionalDependencies のプラットフォームバイナリ = Go）+ 検出方法（lockfile に `@typescript/typescript-*` が増えたら 7.x 誤入）+ 「素の `bun add -d typescript` 禁止」を明記
4. `bun run check:all` 全 7 タスク pass（install 先行 + fast-first 並列、前回実装そのまま）

## 4. 検知手順（今後）

- lockfile 検査: `grep -c '@typescript/typescript-linux' bun.lock` → **0** で正常。>0 なら 7.x（Go）が混入 → `bun add -d typescript@^6.0.3` で引き戻す
- 型検査の実体確認: `node_modules/.bin/tsc --version` が `Version 6.x.x` であること（Go 版はバイナリ実行で挙動が違う）

## 5. 非変更

- `typecheck` スクリプト（`tsc --noEmit && tsc --noEmit -p tsconfig.server.json`）は変更なし（devDependency 化により `bun run` の PATH 解決で自動的にローカル JS tsc が使われる）
- `tsconfig*.json` は `baseUrl` 不使用のため 6.x への引き下げで影響なし
- bunfig.toml（hoisted linker）/ vitest.config.ts（vmThreads）は維持（Termux 対応、別スレッド）

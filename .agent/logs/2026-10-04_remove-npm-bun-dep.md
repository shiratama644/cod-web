# 2026-10-04 npm パッケージ `bun` を devDependencies から除去

## 事象(ユーザー実機)

node_modules を削除して `bun install` し直したところ:

```
error: failed to enqueue lifecycle scripts for bun: ENOENT
$ husky
/usr/bin/bash: line 1: husky: command not found
error: prepare script from "cod-web" exited with 127
```

## 原因

- devDependencies に **npm パッケージの `bun`(1.4.0)** が入っていた。これは
  postinstall(lifecycle スクリプト)でプラットフォーム別バイナリ(@oven/bun-*)を
  展開するパッケージで、「failed to enqueue lifecycle scripts for bun: ENOENT」は
  この lifecycle の登録に失敗したもの(キャッシュ破損や arm64/proot 環境で発生しやすい)。
- bun ランタイム自体はシステムにインストール済みなので、この devDep は**不要**
  (バージョン要求は engines の "bun": ">=1.4.0" が担っており、そちらは残置)。
- 二次被害: install が途中で落ちたため husky 未配置 → prepare("husky")が 127 で
  失敗し、エラーが分かりにくくなっていた。

## 対策

- `bun remove bun`(558 packages に減少。@oven/* バイナリ群も消滅)
- prepare を `husky || true` に変更(インストール途中失敗時に prepare が二次爆発
  しない。hooks は setup.ts の「git hooks」ステップが .husky/_/husky.sh を確認して
  必要なら bunx husky で再導入するため、取りこぼしなし)

## 検証

- bun install / biome / check:all 7/7 PASS
- scripts/.husky に node_modules/bun 参照が無いことを確認

## ユーザー向け復旧手順

```bash
git pull origin arena/01a0b161-cod-web
bun pm cache rm        # 破損キャッシュを掃除
rm -rf node_modules
bun install
bun run start
```

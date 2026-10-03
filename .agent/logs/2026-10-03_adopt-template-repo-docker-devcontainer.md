# 2026-10-03 TEMPLATE_REPO 追加資産の採用(第3弾: Docker / devcontainer / commitlint)

## 目的
ユーザー指示「TEMPLATE_REPO にあるスクリプトやファイルなどで使えるものがあれば導入。
Docker Compose etc..」を受け、第2弾で不採用だった Docker 系資産を採用へ転換し、
bun + 本モノレポ(Next.js web + Bun gameserver)向けに全面書き直して導入する。

## 実施内容

| # | 対象 | 内容 |
|---|---|---|
| 1 | Dockerfile | 新規(bun 版 multi-stage)。base = node:22-alpine + npm 経由 bun(next CLI に node、WS 実行に bun の両方が必要)。targets: deps(manifest のみ copy で install キャッシュ)/ development / build / web(:3000)/ gameserver(:8080、TS 直実行) |
| 2 | compose.yaml | 既存(postgres)に web / gameserver を **profile `app`** で追加。`db:up` の挙動は不変。web の DATABASE_URL はサービス名 `postgres` で注入 |
| 3 | .dockerignore | 新規(node_modules/.next/.git/.agent/docs/logs 等を除外) |
| 4 | .devcontainer/devcontainer.json | 新規(development ターゲット、bun install、ポート 3000/4173/8080/5432、Biome/cspell/tailwind 拡張、docker-in-docker feature) |
| 5 | commitlint | commitlint.config.js + .husky/commit-msg(`bunx commitlint --edit`)。devDeps @commitlint/cli + config-conventional。日本語 subject 許可(subject-case off)、body/footer 長は warning |
| 6 | package.json | scripts 追加: app:up / app:down / app:logs / docker:build:web / docker:build:gameserver |
| 7 | ドキュメント | README「Docker」節、AGENTS.md §4.2 に commitlint 強制を明記、.agent/README.md に第3弾採用表 |

## 不採用(理由)
- CONTRIBUTING.md: AGENTS.md と重複(規約正本の一本化)
- .gitleaks.toml: check-security.ts のシークレットスキャンで代替済み
- scripts/dev.ts / build.ts / check.ts / lib/: フレームワーク自動検出基盤は構成固定の本リポジトリに不要(check.ts は本リポジトリの check-all.ts 由来)
- .changeset / renovate / knip / stryker 等: 第2弾の判断を維持

## 検証(Sandbox に docker なし → 可能な範囲で実測)
- compose.yaml: YAML パース OK(services: postgres/web/gameserver、profiles 確認)
- commitlint: 正常形式 PASS / type 欠落 FAIL(exit 1)を実測。commit-msg hook は本コミット自身で実証
- Dockerfile: COPY 対象の全パス実在を確認。docker build は実環境検証待ち
- bun run check:all 7/7 PASS、cspell / verify:docs / check:env / security:check PASS

## 知見
- oven/bun イメージには node が無く、next CLI(node shebang)が動かないため
  node:22-alpine + npm i -g bun の合成 base が本リポジトリの正解(Sandbox 復旧手順と同型)。
- compose の `profiles` を使うと、既存の `docker compose up -d postgres`(db:up)の
  挙動を変えずに同一ファイルへフルスタック構成を同居できる。

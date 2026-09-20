# Quality Gates（EM01 完了・Phase 3 準備）

> 対応タスク: `EM1-F`（EM01 完了）  
> 目的: Phase 2 の Sim Profile 分離と EM01 完全バグ修正後の品質ゲートを明確化する。  
> 更新: 2026-09-19 に `.github/workflows/` への直接書き込みが許可。2026-09-20 EM01 で memory leak / zero-alloc / GC / shift 改善を追加。提案: [`github-actions-proposal.yml`](./github-actions-proposal.yml)、本番: `.github/workflows/quality-gates.yml`。

## 1. 公式確認した根拠

| 領域 | 確認内容 | URL |
|---|---|---|
| Playwright CI | CI agent は browser 実行環境が必要。Linux では Docker image または `playwright install --with-deps` を使う。CI では workers=1 が安定性優先として推奨される。 | <https://playwright.dev/docs/ci> |
| Playwright webServer | `webServer.command` / `url` / `reuseExistingServer` / `timeout` / `gracefulShutdown` があり、`use.baseURL` と組み合わせると相対 `page.goto('/')` を使える。 | <https://playwright.dev/docs/test-webserver> |
| Bun CI install | 再現性のため `bun ci` または `bun install --frozen-lockfile` を使う。`bun ci` は `bun install --frozen-lockfile` 相当。 | <https://bun.com/docs/pm/cli/install> |
| GitHub Actions workflow | workflow は YAML で、公式配置先は `.github/workflows`。`on` / `jobs` / `runs-on` / `steps` / `uses` / `run` で構成する。 | <https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax> |
| setup-bun | GitHub Actions では `oven-sh/setup-bun@v2` で Bun をセットアップできる。 | <https://github.com/oven-sh/setup-bun> |

## 2. Local gate

各実装タスクの commit 前に、原則として次を実行する。

```bash
bun run typecheck
bunx biome lint .
bun run check:determinism
bun run test:unit
bun run build
```

Phase 1.5 以降は coverage も品質ゲートとして扱う。

```bash
bun run test:coverage
```

Phase 2 以降は determinism heavy も品質ゲートとして扱う（0.8s）。

```bash
bun run scripts/determinism-heavy.ts  # 1000 ticks x100 scenarios determinism
```

E2E の spec discovery は browser binary 不要なので、Playwright 設定変更時に確認する。

```bash
bun run test:e2e -- --list
```

Husky pre-commit（`add-husky` 選択）で typecheck / lint / determinism / test:unit を自動実行する。`.husky/pre-commit` 参照。build は重いため CI で実行。

```bash
bun run check:determinism            # SimProfile.step の Math.random/Date.now禁止、L1のif(type)禁止を検出
bun run scripts/determinism-heavy.ts # 1000x100 determinism（PH2-E追加、0.8s）
```

## 3. Coverage gate

PH1.5-B で測定した after coverage を下限として、`vitest.config.ts` に threshold を設定済み。

| Metric | PH1.5-A baseline | PH1.5-B after | Current threshold |
|---|---:|---:|---:|
| Statements | 66.82% (725/1085) | 79.17% (859/1085) | 79 |
| Branches | 57.10% (225/394) | 73.85% (291/394) | 73 |
| Functions | 64.43% (125/194) | 79.38% (154/194) | 79 |
| Lines | 68.97% (696/1009) | 80.77% (815/1009) | 80 |

運用ルール:

- threshold を下げる場合は、削除理由・代替テスト・未カバー範囲を docs に記録する。
- threshold を上げる場合は、数字稼ぎではなく重要経路の assertion 追加後に行う。
- `coverage/` は artifact であり Git に入れない。必要な数値だけ docs に残す。
- coverage 対象から production code を外す場合は、entrypoint / type-only / generated など明確な理由を config コメントか計画書に残す。

## 4. E2E gate

PH1.5-C で Playwright の入口を追加済み。

| 項目 | 値 |
|---|---|
| script | `bun run test:e2e` |
| config | [`../../playwright.config.ts`](../../playwright.config.ts) |
| specs | [`../../e2e/game-shell.spec.ts`](../../e2e/game-shell.spec.ts) |
| local baseURL | `http://127.0.0.1:4173` |
| local server | `webServer.command: bun run preview` (軽量化。旧 `bun run start` は install+build+server+preview で重い) |
| full E2E (server+preview) | `bun run start` を別ターミナルで起動してから `bun run test:e2e` または `PLAYWRIGHT_BASE_URL` 使用 |
| preview / CI override | `PLAYWRIGHT_BASE_URL=<url> bun run test:e2e` |
| current project | Desktop Chrome / Chromium |

Sandbox 方針:

- Arena Sandbox では Chromium browser install / 実行が不可または不安定なため、`bun run test:e2e` の browser 実行を pass と主張しない。
- Sandbox で確認するのは `bun run test:e2e -- --list` による spec discovery まで。
- 実行結果は CI または実機で記録する。

CI / 実環境での実行例:

```bash
bun ci
bunx playwright install --with-deps chromium
bun run test:e2e
```

デプロイ済み preview に向ける場合:

```bash
PLAYWRIGHT_BASE_URL=https://example-preview.example.com bun run test:e2e
```

## 5. CI 本番配置（2026-09-19 許可）

旧ルールでは提案 YAML を `docs/ops/` に置き、人間が `.github/workflows/` へコピーする運用だったが、2026-09-19 に `.github/workflows/` への直接書き込みが許可されたため、Agent が直接配置する。

- 提案元: [`github-actions-proposal.yml`](./github-actions-proposal.yml)
- 本番: `.github/workflows/quality-gates.yml`（GitHub Actions が実行）

提案の構成:

| Job | 内容 | 備考 |
|---|---|---|
| `quality` | `bun ci` → typecheck → lint → determinism → unit → coverage → build → E2E discovery | PR の基本 gate |
| `e2e` | Playwright browser install → `bun run test:e2e` → report artifact upload | Browser 実行可能な runner 用 |

Husky はローカル強制、CI は `quality` job で determinism も含めて強制する。

## 6. EM01 完了確認と Phase 3 へ進む前の確認

Phase 2（Sim Profile 分離）は PH2-E で完了。EM01（完全バグ修正）は EM1-F で完了。Phase 3 へ進む前に最低限確認すること。

- `bun run test:unit` 24 files / 142 tests pass（determinism 100x10 smoke + same-input 120ticks + per-tick 0.35m + EM1 回帰 15 tests 含む）
- `bun run test:coverage` が thresholds（79/73/79/80）を満たす。EM01後: 81.22%/76.02%/81.9%/82.8%
- `bun run check:determinism` pass（SimProfile 禁止API / L1 type分岐 0）
- `bun run scripts/determinism-heavy.ts` pass（1000 ticks x100 scenarios 0.9s）
- `bun run test:e2e -- --list` で spec discovery が通る（3 tests）
- import boundary audit: `engine-core` → `profile-fps` 0 violations、`profile-voxel` 未追加
- `grep console.log` client 0件、server 3件（運用ログ許容）
- `grep getPlayers()` hot path 0件（getPlayersIterable へ移行）
- `grep shift()` hot path 0件（head index へ移行）
- `grep \.slice(` hot path 0件（LagCompStore互換 slice 1件のみ許容）
- memory leak: `Simulation.removePlayer` / `SnapshotBroadcaster.removePlayer` / `LagCompStore.clear` が leave 時に呼ばれる
- zero-alloc: Room.getPlayersIterable + Snapshot encode once + GameClient remotes reuse + prediction in-place
- CI または実環境で `bun run test:e2e` を一度実行し、結果を `docs/task-list.md` か後続ログに記録する
- E2E browser 実行が未完了の場合、Phase 3 は着手できるが、リリース判定では「実環境検証待ち」と明記する

### EM01 追加ゲート

| 項目 | 検証 | 証拠 |
|---|---|---|
| Memory leak B1-B3 | `removePlayer` / `clear` が leave 時に呼ばれる | unit 7 tests + gameserver close ハンドラ |
| Zero alloc B4-B5 | `getPlayers()` hot path 0, encode 1回 | Room iterable 2 tests + snapshot encode once 2 tests |
| Console B7 | client console.log 0 | biome noConsole error + grep 0 |
| Client GC B11-B13 | remotes Map reuse, pending in-place | GameClient reuse 1 test + prediction 1 test + interpolator reuse 2 tests |
| Shift/splice B6,B9,B10 | head index | Simulation head + LagCompStore head + Interpolator head |
| Coverage | thresholds維持 | 81.22%/76.02%/81.9%/82.8% |

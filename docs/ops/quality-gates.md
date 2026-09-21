# Quality Gates（Phase 3 完了・Phase 4 準備）

> 対応タスク: `PH3-D`（Phase 3 完了）  
> 目的: Phase 3 gamemode API第1版 + fps-ffa最小完了後の品質ゲートを明確化する。  
> 更新: 2026-09-19 に `.github/workflows/` への直接書き込みが許可。2026-09-20 EM01 で memory leak / zero-alloc / GC / shift 改善を追加。2026-09-21 EM02 で coverage 85%達成 + Playwright フルE2E複数webServer。2026-09-22 ドキュメント整理で `docs/ops/github-actions-proposal.yml` 重複提案を削除し、正本は `.github/workflows/quality-gates.yml` のみに統一。2026-09-22 Phase 3完了で gamemode-api/sdk + GameModeRuntime + fps-ffa + gameserver統合。

## 1. 公式確認した根拠

| 領域 | 確認内容 | URL |
|---|---|---:|
| Playwright CI | CI agent は browser 実行環境が必要。Linux では Docker image または `playwright install --with-deps` を使う。CI では workers=1 が安定性優先として推奨される。 | <https://playwright.dev/docs/ci> |
| Playwright webServer | `webServer.command` / `url` / `reuseExistingServer` / `timeout` / `gracefulShutdown` があり、`use.baseURL` と組み合わせると相対 `page.goto('/')` を使える。`webServer` は配列を取れ、複数サーバー（gameserver + preview）を同時に起動できる。 | <https://playwright.dev/docs/test-webserver> |
| Playwright WebSocket | `page.on('websocket')` で WS 接続を監視、フレーム送受信を検証できる。公式 API は `WebSocket` / `WebSocketRoute`。補助資料として実践記事も参照。 | <https://playwright.dev/docs/api/class-websocket> / <https://playwright.dev/docs/mock#mock-websockets> / <https://dzone.com/articles/playwright-for-real-time-applications-testing-webs> |
| Vitest coverage thresholds | `thresholds.lines/statements/branches/functions` で閾値設定、perFileやglobで個別設定も可能。 | <https://vitest.dev/config/coverage> |
| Bun CI install | 再現性のため `bun ci` または `bun install --frozen-lockfile` を使う。 | <https://bun.com/docs/pm/cli/install> |
| GitHub Actions workflow | workflow は YAML で、公式配置先は `.github/workflows`。 | <https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax> |
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
bun run scripts/determinism-heavy.ts
```

E2E の spec discovery は browser binary 不要なので、Playwright 設定変更時に確認する。

```bash
bun run test:e2e -- --list
```

## 3. Coverage gate

EM02 で thresholds を 85% に引き上げ、意味あるテストで達成。

| Metric | PH1.5-A baseline | PH1.5-B after | EM01 after | EM02 after | PH3-D after | Current threshold |
|---|---:|---:|---:|---:|---:|---:|
| Statements | 66.82% (725/1085) | 79.17% (859/1085) | 81.22% (965/1188) | 95.12% (1151/1210) | 93.34% (1486/1592) | 85 |
| Branches | 57.10% (225/394) | 73.85% (291/394) | 76.02% (333/438) | 87.97% (395/449) | 86.82% (547/630) | 85 |
| Functions | 64.43% (125/194) | 79.38% (154/194) | 81.9% (172/210) | 90.7% (205/226) | 86.72% (281/324) | 85 |
| Lines | 68.97% (696/1009) | 80.77% (815/1009) | 82.8% (915/1105) | 96.8% (1091/1127) | 94.83% (1413/1490) | 85 |

運用ルール:

- threshold を下げる場合は、削除理由・代替テスト・未カバー範囲を docs に記録する。
- threshold を上げる場合は、数字稼ぎではなく重要経路の assertion 追加後に行う。
- `coverage/` は artifact であり Git に入れない。必要な数値だけ docs に残す。
- coverage 対象から production code を外す場合は、entrypoint / type-only / generated など明確な理由を config コメントか計画書に残す。
- EM02 方針: `include-all`（gameserver/index.ts, BabylonGame.ts, App.tsx も含めて85%）。テスト可能にリファクタ（handlers.ts分離、babylonDeps.ts分離）し、モックで意味あるテストを書く。

低カバレッジファイルの改善（EM02）:

| File | Before | After | 改善方法 |
|---|---|---|---|
| `gameserver/index.ts` | 0% (19-126) | ~80% | `handlers.ts` に分離 + `index.test.ts` で Bun.serve モック + ws handlers 呼び出し + setInterval loop |
| `handlers.ts` | 新規 | 97.29% stmts, 91.66% branch | 純粋ハンドラを分離、open/message/drain/close/fetch を unit でテスト |
| `BabylonGame.ts` | 2.06% (39-186) | 96.9% stmts, 90% branch | `babylonDeps.ts` ファサード分離 + `vi.mock` で WebGL 非依存モック + lifecycle/remote mesh/grace/camera/resize テスト |
| `App.tsx` | 0% (11-13) | 100% | `App2.test.tsx` で GameCanvas/HUD/TouchControls/StartOverlay をモックして App 統合テスト |
| `InputController.ts` | 72.02% | ~95% | WASD/矢印、Space/jump、joystick deadzone/normalize、pitch clamp、touch-ui target、pointer up、PointerLock、attach/detach |
| `types.ts` | 50% | 100% | `createSimWorld` テスト追加 |
| `quantize.ts` | 100% stmts, 66% branch | 100% | clamp 分岐をテスト |
| `packer.ts` | 98.94% | 98.94% | readMessageType empty branch |

## 4. E2E gate

PH1.5-C で Playwright の入口を追加、EM02 でフルE2E（複数 webServer）へ拡張。

| 項目 | 値 |
|---|---:|
| script | `bun run test:e2e` |
| config | [`../../playwright.config.ts`](../../playwright.config.ts) |
| specs | [`../../e2e/game-shell.spec.ts`](../../e2e/game-shell.spec.ts) |
| local baseURL | `http://127.0.0.1:4173` |
| gameserver URL | `http://127.0.0.1:8080` (health check 200) |
| local servers | `webServer: [{command: bun run server, url: 8080}, {command: bun run preview, url: 4173}]` 配列化 |
| preview / CI override | `PLAYWRIGHT_BASE_URL=<url> bun run test:e2e` |
| current project | Desktop Chrome / Chromium |
| tests | 11 tests (EM02): shell smoke 3 + HUD 3 + TouchControls 2 + WebSocket full-e2e 3 |

追加E2Eシナリオ（EM02）:

- HUD の初期表示、renderer/connection status 遷移
- StartOverlay のクリックで非表示、gameStore 状態変化
- TouchControls の表示（mobile viewport 375x667）
- Canvas リサイズ時の可視性
- WebSocket 接続の監視（`page.on('websocket')` で /ws proxy 確認）
- 2つの browser contexts で同時接続（multi-tab）
- 切断・再接続の挙動（reload で再接続）

Sandbox 方針:

- Arena Sandbox では Chromium browser install / 実行が不可または不安定なため、`bun run test:e2e` の browser 実行を pass と主張しない。
- Sandbox で確認するのは `bun run test:e2e -- --list` による spec discovery まで。
- 実行結果は CI または実機で記録する。

## 5. CI 本番配置（2026-09-19 許可 / 2026-09-22 整理）

- 本番: `.github/workflows/quality-gates.yml`（正本、Agent が直接配置）
- 旧提案: `docs/ops/github-actions-proposal.yml` は 2026-09-22 に削除。正本は `.github/workflows/` のみ。

| Job | 内容 | 備考 |
|---|---|---|
| `quality` | `bun ci` → typecheck → lint → determinism → unit → coverage → build → E2E discovery | PR の基本 gate |
| `e2e` | Playwright browser install → `bun run test:e2e` → report artifact upload | Browser 実行可能な runner 用 |

### 手動実行（2026-09-21 追加）

`workflow_dispatch` に `inputs.job` を追加し、GitHub Actions UI から2ジョブを個別に手動実行可能にしました。

```yaml
on:
  workflow_dispatch:
    inputs:
      job:
        description: 'Select job to run manually (all/quality/e2e)'
        type: choice
        default: 'all'
        options: [all, quality, e2e]
```

- `quality` job: `if: ${{ github.event_name != 'workflow_dispatch' || inputs.job == 'all' || inputs.job == 'quality' }}`
- `e2e` job: `if: ${{ always() && (github.event_name != 'workflow_dispatch' || inputs.job == 'all' || inputs.job == 'e2e') && (needs.quality.result == 'success' || needs.quality.result == 'skipped' || github.event_name == 'workflow_dispatch') }}`
  - `job=all` (default): quality → e2e の順に2ジョブ実行
  - `job=quality`: qualityのみ
  - `job=e2e`: e2eのみ（qualityがskippedでも `always()` で実行）

GitHub UIでの操作:
1. Actions → Quality Gates → Run workflow → `Select job to run manually` で選択 → Run workflow
2. ログは Actions の各 run で確認、artifacts に `playwright-report` / `test-results` が保存される

ローカル同等:
```bash
# quality
bun run typecheck && bunx biome lint . && bun run check:determinism && bun run test:unit && bun run test:coverage && bun run build && bun run test:e2e -- --list
# e2e
bunx playwright install --with-deps chromium && bun run test:e2e
```

## 6. Phase 3 完了確認と Phase 4 へ進む前の確認

- `bun run test:unit` 37 files / 255 tests pass (PH3-C 36/242 → PH3-D 37/255)
- `bun run test:coverage` が thresholds（85/85/85/85）を満たす。PH3-D後: 93.34%/86.82%/86.72%/94.83%
- `bun run check:determinism` pass (no forbidden patterns)
- `bun run test:e2e -- --list` で 11 tests discovered
- import boundary audit: 0 violations (engine-core→profile-*, gamemodes→sdkのみ)
- `grep console.log` client 0件、server 3件（運用ログ許容）
- `grep getPlayers()` hot path 0件
- `grep shift()` hot path 0件
- `grep setTimeout` in gamemode 0件 (tick基準)
- memory leak: 0件 (removePlayer/clear + rateLimiter remove)
- zero-alloc: 0件 hot path
- gamemode exception safety: roomが落ちない (GameModeRuntime safeCall + timer try/catch + runtime-gamemode.test.ts)
- CI または実環境で `bun run test:e2e` を一度実行し、結果を記録する

### Phase 3 追加ゲート

| 項目 | 検証 | 証拠 |
|---|---|---:|
| Coverage 85% | 全メトリクス85%以上 | 93.34%/86.82%/86.72%/94.83% (PH3-D) |
| gamemode-api | L1 core, protocolのみ依存 | defineGameMode 10 tests + ctx 5 tests |
| GameModeRuntime | 例外安全, tick基準timer, rate limit 40/s burst20 | Timer 8 + RateLimiter 8 + Runtime 11 tests |
| fps-ffa | waiting→countdown→playing→ended, spawn, score, respawn 3s, chat 200 | 11 tests + runtime-gamemode統合 |
| gameserver統合 | profile+gamemode注入, FpsCtx実装, RoomState管理, 例外安全 | runtime.ts 77% + handlers.ts 98% + runtime-gamemode 13 tests |
| Room | sendTo/sendBinaryTo/broadcastExcept public | runtime-gamemode.test.ts |
| Playwright full-e2e | 複数webServer + 11 tests | webServer配列化 + game-shell.spec.ts |
| Import boundary | engine-core→profile-* 0, gamemodes→sdkのみ 0 | Biome + check-determinism |

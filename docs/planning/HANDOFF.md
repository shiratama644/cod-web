# 次セッションへの橋渡し（Phase 3 完了・Phase 4 計画作成中 PLAT-4）

> 対象: 新しいセッションの AI。人間ではない。
> 進捗の正本: [`docs/task-list.md`](../task-list.md)
> 作業規約: [`AGENTS.md`](../../AGENTS.md)
> 仕様正本: [`docs/arch/`](../arch/README.md)（2026-09-22理想反映: product.md/editor.md/types.md/matchmaker.md/client.md/architecture.md）
> Phase 3 計画: [`docs/planning/PHASE03_PLAN.md`](./PHASE03_PLAN.md)
> Phase 4 計画: [`docs/planning/PHASE04_PLAN.md`](./PHASE04_PLAN.md)（新規）
> Sandbox 理想整理: [`docs/planning/SANDBOX_SPEC整理.md`](./SANDBOX_SPEC整理.md) / [`SANDBOX_FILTER_DISCUSSION.md`](./SANDBOX_FILTER_DISCUSSION.md) / [`SANDBOX_FINAL_AGREED.md`](./SANDBOX_FINAL_AGREED.md)
> Quality gate: [`docs/ops/quality-gates.md`](../ops/quality-gates.md)
> 調査の入口: [`docs/research/DEEP_RESEARCH_SYNTHESIS.md`](../research/DEEP_RESEARCH_SYNTHESIS.md)

このファイルは計画の代替ではない。**Phase 3（ゲームモード API 第1版 + fps-ffa 最小）は PLAT-3〜PH3-D までローカル検証済みで完了（37 files/255 tests, coverage 93.34%/86.82%/86.72%/94.83%, thresholds 85/85/85/85, determinism pass, E2E 11 discovered）。Playwright E2E browser 実行のみ Sandbox Chromium 制約により実環境検証待ちは継続。2026-09-22 ユーザー理想「FPS/Voxel/Sandbox 3カテゴリ、Header FPS/Voxelタブ、Left Sidebar Sandboxボタン、Sandboxモーダル カード/フィルタ/ソート、詳細ページ Play Now/Room Selection、メインFPS投票」を arch に反映済み。現在 PLAT-4 実装中（80%）。次は PH4-A〜F 実装。**

## 0. 最初にやること（これ以外から始めない）

1. `git status` / `git branch --show-current` / `git log -5 --oneline`
2. ブランチ名は **毎回コマンドで確認**する。文書に書いてある過去ブランチ名を fetch/push しない（AGENTS.md §4.4）。
3. `git log` が起点 1 件だけ / status が大量削除+未追跡 / `bun` なし / `node_modules` なし → Sandbox 再構築。`.agent/hooks/sandbox-rebuild-recovery.md` どおり `git fetch origin <現在ブランチ>` → `git reset --hard origin/<現在ブランチ>` → `bash .agent/hooks/restore-sandbox-env.sh`。
4. 未コミット変更を勝手に捨てない（再構築復旧の `reset --hard` だけ例外）。
5. **進行中は 1 件。** 現在は Phase 3 完了、PLAT-4 実装中。次は `PH4-A`〜`PH4-F`。
6. PLAT-4 着手前に [`../task-list.md`](../task-list.md)、[`./PHASE04_PLAN.md`](./PHASE04_PLAN.md)、[`../arch/architecture.md`](../arch/architecture.md)、[`../arch/types.md`](../arch/types.md)、[`../arch/product.md`](../arch/product.md)、[`../arch/editor.md`](../arch/editor.md)、[`../arch/matchmaker.md`](../arch/matchmaker.md)、[`../arch/client.md`](../arch/client.md)、[`../ops/quality-gates.md`](../ops/quality-gates.md) を再読する。

## 1. いま決まっていること（覆さない）

| ID | 決定 | 意味 |
|---|---|---:|
| D1 | Phase 2 は **fps 先行＋voxel は契約だけ** | 2026-09-15 の人間回答。`profile-voxel` package / voxel terrain / voxel physics 本実装は Phase 2/3 に含めない。Phase 4でも契約のみ継続 |
| D2 | `engine-core` は L1、type 非依存 | `@cod/profile-fps` / `@cod/profile-voxel` import 禁止。`if (type === 'fps' \| 'voxel')` 禁止。Phase 3でも維持 |
| D3 | `profile-fps` は L2 実装 | PH2-Bでfactory、PH2-Cでgameserver、PH2-Dでweb注入、PH2-Eでdeterminism検証済み |
| D4 | `TYPE_SPECS` は fps 実使用 + voxel 将来枠 | fps: sim 60 / input 60 / snapshot 30。voxel: sim 30 / input 30 / snapshot 15 は spec のみ |
| D5 | 現行 Input は payload 16B / socket frame 17B | Channel 1B + Input 16B を維持。Snapshot `0x11` 化はPhase 3ではしない |
| D6 | fps Snapshot は現行 layout を維持し `vy` を含める | Phase 3 は gamemode 分離であり wire format 改定ではない |
| D7 | トランスポートは WebSocket のみ | WT / geckos / 生 UDP / WebRTC DataChannel は実装しない |
| D8 | Quality gate を維持し 85%へ | typecheck / lint / unit / coverage 85% / build / E2E discovery 11 / determinism を維持。browser E2E は実環境検証待ち |
| D9 | `.github/workflows/` は直接作成可 (2026-09-19許可) | Agent が直接 `.github/workflows/quality-gates.yml` を作成・更新可 |
| D10 | Game Type と Content Source を混同しない | `fps` / `voxel` が type。`official` / `ugc` は type ではない |
| D11 | PH2-E determinism 方針 | 軽量 smoke 100ticks x10 を unit に、heavy 1000x100 を `scripts/determinism-heavy.ts` に分離。0.8s pass。same-input 120ticks exact + 100ticks <0.35m |
| D12 | Import boundary | `engine-core` → `profile-*` 禁止を Biome + `check-determinism.ts` で二重監査。`gamemodes/*` → `gamemode-sdk` のみ |
| D13 | gamemode-api は L1 core、gamemode-sdk は facade | 2026-09-22 ユーザー確認 both。apiはprotocolのみ依存、sdkはapi re-export。gamemodes/*はsdkのみimport |
| D14 | ffa_id は集約 ID fps-official-ffa 主、pvpはエイリアス | 2026-09-22 ユーザー確認。URL /fps/official/ffa 主、/fps/official/pvp は同じモードが動くエイリアス |
| D15 | async_hooks は hybrid | 2026-09-22 ユーザー確認。onRoomCreate/Destroy/event async、onTick/onPlayer* sync void only、after/every tick-based |
| D16 | world_spec は map名のみ、spawnPointsはFpsCtx経由 | 2026-09-22 ユーザー確認。world specはmap名のみ、spawnPointsはFpsCtx.getSpawnPoints()でprofile-fpsから取得 |
| D17 | FPS/Voxel/Sandbox 3カテゴリ構成 | 2026-09-22 ユーザー理想確定。FPS公式 FFA/TDM/DOM、Voxel公式 Survival、Sandbox UGC Bedwars/Zombie/Athletic。L1 type分岐は fps|voxelの2つのまま、Sandboxは source=ugc表示集約 |
| D18 | Header FPS/Voxelタブ + Left Sidebar Sandboxボタン | 2026-09-22 理想。Header [FPS][Voxel]切替、Left Sidebar Krunker風 + Sandboxボタンでモーダル |
| D19 | メイン画面デフォルト FPS + 投票システム | 2026-09-22 理想。初期表示FPS、1マッチ終了時全プレイヤー投票で次モード決定 |
| D20 | Sandboxモーダル カード/フィルタ/ソート | 2026-09-22 理想。カード thumbnail/title/creator/plays/desc、フィルタ Bedwars/Zombie/Athletic (genres)、ソート plays/active/views (totalPlays/activePlayers/detailViews) |
| D21 | 詳細ページ Play Now/Room Selection | 2026-09-22 理想。カードクリックで詳細ページ、Play Now空きルーム自動マッチ、ルーム選択モーダル手動選択 |
| D22 | boxel は voxel typoエイリアス | 2026-09-22 ユーザー確認。boxel=voxel typo、UI表示エイリアスとしてvoxelに正規化、内部GameTypeはvoxelのみ |
| D23 | genres/tags/display/stats optional拡張 | 2026-09-22 設計。GameModeDefinitionにgenres/tags/display/stats optional追加、後方互換維持、Sandboxフィルタ/ソート/カード表示用 |
| D24 | matchmakerはPhase 4 mock、本実装は後続 | Phase 4では mock API (matchmaker-mock.ts)、本実装 Redis/HMACはPhase 5以降 |

## 2. 事実確認（2026-09-22 PH3-D完了後）

| 項目 | 結果 | 証拠 |
|---|---|---:|
| `bun run typecheck` | pass | 0 error |
| `bun run lint` | pass | 117 files checked, 0 warnings, noConsole for babylon/net |
| `bun run test:unit` | pass | 37 files / 255 tests (PH3-C 36/242 → PH3-D 37/255, +1 file +13 tests) |
| `bun run test:coverage` | pass | Statements 93.34% (1486/1592), Branches 86.82% (547/630), Functions 86.72% (281/324), Lines 94.83% (1413/1490). thresholds 85/85/85/85 |
| `bun run build` | pass | 1.00s, Vite chunk-size warningのみ既知 |
| `bun run check:determinism` | pass | no forbidden patterns in SimProfile / L1 |
| `bun run test:e2e -- --list` | pass | 11 tests discovered |
| `gh issue list` / `gh pr list` | 0件 | GitHub Issues/PRなし |
| `grep console.log` | 3件 | gameserver 3件（許容）、client 0件 |
| `grep \.slice(` | 1件 | LagCompStore.getHistory の互換 slice 1件のみ（hot path外） |
| `grep getPlayers()` hot path | 0件 | getPlayersIterable へ移行済み |
| `grep Math.random/Date.now` in sim | 0件 | 決定論維持、gamemodeはLCG seed 0x12345678 |
| `grep setTimeout` in gamemode | 0件 | tick基準 after/every |
| `grep profile-fps` in engine-core | 0件 | L1純度維持 |
| `grep gamemode` in gamemodes (except sdk) | 0件 | sdkのみimport |
| `profile-voxel` 存在 | なし | 契約のみ |
| `shift()` in hot path | 0件 | head index へ移行 |
| `BabylonGame.ts` | 96.9% stmts | babylonDeps.ts 分離 |
| `App.tsx` | 100% | App2.test.tsx |
| `gameserver/runtime.ts` | 77% stmts, 64% branch | PH3-D統合、13 testsでカバー |
| `handlers.ts` | 98% stmts, 89% branch | gamemode統合、例外安全 |
| `gamemodes/fps/official/ffa` | 100% id/type/source/slug/map | 11 tests + runtime統合 |
| `GameModeRuntime` | exception safety | 11 tests + runtime-gamemode 1 test |

**Phase 3 で gamemode-api (L1 core) + gamemode-sdk (facade) + GameModeRuntime/Timer/RateLimiter (L1) + fps-ffa最小 + pvpエイリアス + gameserver統合 (profile+gamemode注入、RoomState管理、FpsCtx実装、例外安全) を実現。coverage 93%/86%/86%/94%で85%閾値維持。**

## 3. Phase 3 完了サマリ

Phase 3 計画書は [`PHASE03_PLAN.md`](./PHASE03_PLAN.md)。PLAT-3〜PH3-D 完了。

| Subtask | 目的 | 主な成果物 | 状態 |
|---|---|---|---:|
| `PLAT-3` | Phase 3計画作成（gamemode API第1版 + fps-ffa最小） | `PHASE03_PLAN.md`、task-listにPLAT-3/PH3-A〜D追加、fps先行＋voxel契約のみ継続明記 | ローカル検証済み 100% |
| `PH3-A` | `gamemode-api` package作成（L1 contract） | `packages/gamemode-api/` + `gamemode-sdk/` facade、define validation 10 tests + ctx 5 tests、L1 type非依存 | ローカル検証済み 100% |
| `PH3-B` | `GameModeRuntime` + Tick timer + RateLimiter | `GameModeTimer.ts` + `GameModeRuntime.ts` + `rate-limit.ts` MODE 40/s burst20 + `Room.ts` binding、Timer 8 tests + RateLimiter 8 tests + Runtime 11 tests (exception safety) | ローカル検証済み 100% |
| `PH3-C` | `fps-ffa` 最小モード | `gamemodes/fps/official/ffa/index.ts` fps-official-ffa + pvp alias、11 tests (spawn/score/round lifecycle) | ローカル検証済み 100% |
| `PH3-D` | 統合 + docs + import境界 + quality gate | `apps/gameserver/src/runtime.ts` profile+gamemode注入 FpsCtx実装 + `handlers.ts` gamemode統合例外安全 + `index.ts` tick統合 + `Room.ts` public sendTo/broadcastExcept + `runtime-gamemode.test.ts` 13 tests (統合+例外安全+coverage) | ローカル検証済み 100% |

## 4. 次の 1 件: PLAT-4（Phase 4 計画作成）→ PH4-A〜F 実装

### 目的

ハブ + Sandboxモーダル + 投票システム + マッチメイカー骨組みの計画を作成し、実装する。ユーザー理想の 3カテゴリプラットフォーム (FPS公式 FFA/TDM/DOM、Voxel公式 Survival、Sandbox UGC Bedwars/Zombie/Athletic) を実現する。Header FPS/Voxelタブ、Left Sidebar Sandboxボタン、Sandboxモーダル (カード thumbnail/title/creator/plays/desc、フィルタ Bedwars/Zombie/Athletic、ソート plays/active/views)、詳細ページ Play Now/Room Selection、メインFPS投票システム。L1 type分岐は fps|voxelの2つのまま、Sandboxは source=ugc表示集約、boxelはvoxelエイリアス。

### PLAT-4 でやること（完了 80%）

- [x] `docs/planning/PHASE04_PLAN.md` を `_TEMPLATE.md` 準拠で作成（FPS/Voxel/Sandbox 3カテゴリ、Header/Sidebar、Sandboxモーダル、詳細ページ、投票、boxelエイリアス、genre/tag拡張）
- [x] `docs/arch/product.md`, `editor.md`, `types.md`, `matchmaker.md`, `client.md`, `architecture.md` を 2026-09-22理想に更新
- [x] `docs/task-list.md` に PLAT-4 / PH4-A〜F を追加、Phase 4テーマを「ハブ+Sandboxモーダル+投票+マッチメイカー骨組み」に更新
- [x] `docs/planning/SANDBOX_SPEC整理.md` / `SANDBOX_FILTER_DISCUSSION.md` / `SANDBOX_FINAL_AGREED.md` を参照し、Sandbox表示マッピングを明確化
- [ ] link check / `git diff --check` / typecheck/lint/unit/build/determinism pass（PLAT-4完了時）
- [ ] commit / push

### PH4-A〜F でやること（次）

- PH4-A: `GameModeDefinition` genres/tags/display/stats拡張 + boxelエイリアス `normalizeGameType`、ffa拡張、後方互換
- PH4-B: Header FPS/Voxelタブ切替コンポーネント
- PH4-C: Left Sidebar Krunker風 + Sandboxボタン
- PH4-D: Sandboxモーダル カード一覧+フィルタ+ソート (mockデータ)
- PH4-E: 詳細ページ + Play Now / Room Selectionモーダル (mock)
- PH4-F: 投票システム入口 (mock) + quality gate + docs更新

### PLAT-4 / PH4-A〜F でやらないこと

- `profile-voxel` 本実装、voxel terrain/physics 本実装（Phase 5以降）
- `apps/matchmaker/` 本実装 Redis/HMAC本実装（Phase 4はmockのみ）
- Snapshot `0x11` 新ヘッダ化、AOI、delta snapshot 本実装
- FireAction / HitConfirm / 巻き戻しヒットスキャン本実装
- UGC / QuickJS / GLBエディタ本実装、RDB永続化本実装（Phase 6以降）
- WebTransport
- Playwright browser 実行を Sandbox で pass と主張

## 5. Quality gate の現状（PH3-D完了後）

品質ゲート手順の正本は [`docs/ops/quality-gates.md`](../ops/quality-gates.md)。

```bash
bun run typecheck
bun run lint
bun run test:unit
bun run test:coverage
bun run build
bun run test:e2e -- --list
bun run check:determinism
bun run check:determinism:heavy
```

| Gate | 現状 | 証拠 |
|---|---|---:|
| Unit | 37 files / 255 tests | PH3-D pass (+1 file +13 tests) |
| Coverage | 93.34%/86.82%/86.72%/94.83% | thresholds 85/85/85/85 pass |
| Determinism | lightweight + heavy | pass |
| Same-input | server vs client | 120ticks exact + 100ticks <0.35m |
| E2E discovery | 11 tests discovered | `bun run test:e2e -- --list` pass |
| Browser E2E | 実環境検証待ち | Sandbox Chromium 制約 |
| Import boundary | 0 violations | Biome + check-determinism (engine-core→profile-*, gamemodes→sdkのみ) |
| Console.log | 3件（serverのみ） | client 0件 |
| Zero alloc | 0件 hot path | getPlayersIterable + encode once + head index |
| Memory leak | 0件 | removePlayer/clear + rateLimiter remove |
| Gamemode exception safety | roomが落ちない | GameModeRuntime safeCall + timer try/catch + runtime-gamemode.test.ts |

## 6. やってはいけない

- Phase 3計画を読まずにPhase 4を開始する。
- `engine-core` に `if (type === 'fps' | 'voxel')` を入れる。
- `engine-core` から `@cod/profile-fps` / `@cod/profile-voxel` を import する。
- `profile-voxel` / voxel terrain / voxel physics 本実装を混ぜる（Phase 4は方針のみ）。
- gamemode API の破壊的変更を計画なしで混ぜる。
- Playwright browser 実行を Sandbox で pass と主張する。
- `bun test` を使う。
- `.agent/logs/` の過去ログを一括置換で書き換える。

## 7. 読み順（次セッション）

1. 本ファイル
2. `AGENTS.md`
3. `.agent/skills/index.md` → 必要なスキルだけ
4. `docs/task-list.md`
5. `docs/planning/PHASE04_PLAN.md`
6. `docs/ops/quality-gates.md`
7. `docs/arch/architecture.md` / `types.md` / `product.md` / `editor.md` / `matchmaker.md` / `client.md` / `adr.md`
8. 必要に応じて `docs/research/DEEP_RESEARCH_SYNTHESIS.md`

旧仕様は `.archive/docs/`。正本にしない。

## 8. 人間への話し方

日本語。敬体。絵文字は報告の最小限。表で状態を出す。タスク完了後は Go 待ちで止める。推測と事実を分ける。

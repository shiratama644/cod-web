# 次セッションへの橋渡し（Phase 4 完了・Phase 5 計画作成待ち）

> 対象: 新しいセッションの AI。人間ではない。
> 進捗の正本: [`docs/task-list.md`](../task-list.md)
> 作業規約: [`AGENTS.md`](../../AGENTS.md)
> 仕様正本: [`docs/arch/`](../arch/README.md)（2026-09-22改訂版: Official FPS 1ゲーム複数モード [FFA,TDM,DOM]投票 + Voxel 1モード [Survival]永続、Sandboxは標準FPS/Voxel以外の公式ゲーム + UGC、親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic）
> Phase 3 計画: [`docs/planning/PHASE03_PLAN.md`](./PHASE03_PLAN.md)
> Phase 4 計画: [`docs/planning/PHASE04_PLAN.md`](./PHASE04_PLAN.md)（改訂版）
> Sandbox 理想整理: [`docs/planning/SANDBOX_SPEC整理.md`](./SANDBOX_SPEC整理.md) / [`SANDBOX_FILTER_DISCUSSION.md`](./SANDBOX_FILTER_DISCUSSION.md) / [`SANDBOX_FINAL_AGREED.md`](./SANDBOX_FINAL_AGREED.md)（改訂版）
> Quality gate: [`docs/ops/quality-gates.md`](../ops/quality-gates.md)
> 調査の入口: [`docs/research/DEEP_RESEARCH_SYNTHESIS.md`](../research/DEEP_RESEARCH_SYNTHESIS.md)

このファイルは計画の代替ではない。**Phase 4（ハブ + Sandboxモーダル + 投票システム + マッチメイカー骨組み）は PLAT-4〜PH4-F までローカル検証済みで完了（44 files/311 tests, coverage 93.51%/85.8%/88.48%/94.76%, thresholds 85/85/85/85, determinism + heavy pass, E2E 11 discovered, build pass）。Playwright E2E browser 実行のみ Sandbox Chromium 制約により実環境検証待ちは継続。2026-09-22改訂版「OfficialはFPS 1ゲーム複数モード + Voxel 1モード永続、Sandboxは標準FPS/Voxel以外の公式ゲーム + UGC、親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic、Header [FPS][Voxel]はOfficial切替、Left Sidebar [Sandbox]は公式拡張+UGC、Sandboxモーダル カード/親ジャンル+サブタグフィルタ/ソート、詳細ページ Play Now/Room Selection、投票入口」を実装済み。次は Phase 5 計画作成。**

## 0. 最初にやること（これ以外から始めない）

1. `git status` / `git branch --show-current` / `git log -5 --oneline`
2. ブランチ名は **毎回コマンドで確認**する。文書に書いてある過去ブランチ名を fetch/push しない（AGENTS.md §4.4）。
3. `git log` が起点 1 件だけ / status が大量削除+未追跡 / `bun` なし / `node_modules` なし → Sandbox 再構築。`.claude/hooks/sandbox-rebuild-recovery.md` どおり `git fetch origin <現在ブランチ>` → `git reset --hard origin/<現在ブランチ>` → `bash .claude/hooks/restore-sandbox-env.sh`。
4. 未コミット変更を勝手に捨てない（再構築復旧の `reset --hard` だけ例外）。
5. **進行中は 1 件。** 現在は Phase 4 完了、次は Phase 5 計画作成 PLAT-5。
6. PLAT-5 着手前に [`../task-list.md`](../task-list.md)、[`./PHASE04_PLAN.md`](./PHASE04_PLAN.md)、[`../arch/architecture.md`](../arch/architecture.md)、[`../arch/types.md`](../arch/types.md)、[`../arch/product.md`](../arch/product.md)、[`../arch/editor.md`](../arch/editor.md)、[`../arch/matchmaker.md`](../arch/matchmaker.md)、[`../arch/client.md`](../arch/client.md)、[`../ops/quality-gates.md`](../ops/quality-gates.md) を再読する。

## 1. いま決まっていること（覆さない）

| ID | 決定 | 意味 |
|---|---|---:|
| D1 | Phase 2 は **fps 先行＋voxel は契約だけ** | 2026-09-15 の人間回答。`profile-voxel` package / voxel terrain / voxel physics 本実装は Phase 2/3 に含めない。Phase 4でも契約のみ継続、Phase 5で本実装 |
| D2 | `engine-core` は L1、type 非依存 | `@cod/profile-fps` / `@cod/profile-voxel` import 禁止。`if (type === 'fps' \| 'voxel')` 禁止。Phase 4でも維持 |
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
| D17 | Official FPSは1ゲーム複数モード + Voxelは1モード永続 | 2026-09-22改訂版確定。FPS公式は1つのゲームに複数モード [FFA,TDM,DOM,etc.] voting_system試合終了時全プレイヤー投票で次ルール決定、Voxel公式はモード1つのみ [Survival] finish_game永遠続く死んだらリスポーン可能 |
| D18 | Sandboxは標準FPS/Voxel以外の公式ゲーム + UGC | 2026-09-22改訂版。SandboxはUGCだけでなく標準で付いているFPS,Voxel以外の公式が作成したゲームも含む、Official以外の公式拡張+UGCの集合、親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athleticでフィルタ |
| D19 | Header [FPS][Voxel]はOfficial切替、Left Sidebar [Sandbox] | 2026-09-22改訂版。HeaderはOfficialゲーム切替 [FPS][Voxel]、SandboxはSidebarから。メイン初期Official FPS |
| D20 | Sandboxモーダル カード/親ジャンル+サブタグフィルタ/ソート | 2026-09-22改訂版。カード thumbnail/title/creator/plays/desc (creator Official含む)、親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic、ソート plays/active/views (totalPlays/activePlayers/detailViews) |
| D21 | 詳細ページ Play Now/Room Selection | 2026-09-22改訂版。カードクリックで詳細ページ /sandbox/{id}、Play Now空きルーム自動マッチ、ルーム選択モーダル手動選択。公式拡張+UGC両方 |
| D22 | boxel は voxel のタイポ | 2026-09-22 ユーザー確認。`boxel` は `voxel` のタイポで `voxel` に訂正。エイリアス機能としては扱わない |
| D23 | parentGenre/subTag/subModes/display/stats/category拡張 | 2026-09-22改訂版。GameModeDefinitionにparentGenre/genres(サブタグ)/tags/display/stats/subModes/currentSubMode/category optional追加、後方互換維持、Sandbox親ジャンル+サブタグフィルタ/ソート/カード表示用 |
| D24 | matchmakerはPhase 4 mock、本実装は後続 | Phase 4では mock API (matchmaker-mock.ts)、本実装 Redis/HMACはPhase 5以降。Sandboxは公式拡張+UGC |

## 2. 事実確認（2026-09-22 Phase 4完了後）

| 項目 | 結果 | 証拠 |
|---|---|---:|
| `bun run typecheck` | pass | 0 error |
| `bun run lint` | pass | 132 files checked, 0 warnings, noConsole for babylon/net |
| `bun run test:unit` | pass | 44 files / 311 tests (PH3-D 37/255 → PH4-F 44/311, +7 files +56 tests) |
| `bun run test:coverage` | pass | Statements 93.51% (1702/1820), Branches 85.8% (653/761), Functions 88.48% (361/408), Lines 94.76% (1594/1682). thresholds 85/85/85/85 |
| `bun run build` | pass | 1.22s, Vite chunk-size warningのみ既知 |
| `bun run check:determinism` | pass | no forbidden patterns in SimProfile / L1 |
| `bun run check:determinism:heavy` | pass | 100 scenarios x 1000 ticks identical within 1e-10, 0.7s |
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
| `App.tsx` | Header+LeftSidebar+SandboxModal+Detail+Room+Vote統合 | App2.test.tsx mock |
| `gameserver/runtime.ts` | 77% stmts, 64% branch | PH3-D統合、13 testsでカバー |
| `handlers.ts` | 98% stmts, 89% branch | gamemode統合、例外安全 |
| `gamemodes/fps/official/ffa` | parentGenre fps, genres [ffa], subModes [ffa,tdm,dom], category Official | 11 tests + runtime統合 + PH4-A拡張 |
| `GameModeRuntime` | exception safety | 11 tests + runtime-gamemode 1 test |
| `Header` | Official FPS/Voxel切替 | 5 tests |
| `LeftSidebar` | Krunker風 Sandboxボタン 公式拡張+UGC | 5 tests |
| `sandbox.ts` | parentGenre+subTag filter/sort 公式拡張+UGC | 7 tests |
| `SandboxModal` | カード一覧 親ジャンル+サブタグフィルタ+ソート | 8 tests |
| `SandboxDetailPage` | 詳細 Play Now/Room Selection | 7 tests |
| `RoomSelectionModal` | ルーム一覧手動選択 | 6 tests |
| `VoteOverlay` | Official FPS FFA/TDM/DOM投票 Voxel対象外 | 8 tests |

**Phase 4 で Official FPS 1ゲーム複数モード [FFA,TDM,DOM]投票 + Official Voxel 1モード [Survival]永続 + Sandbox公式拡張+UGC (親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic) のハブUI骨組み (Header [FPS][Voxel] Official切替、Left Sidebar [Sandbox] 公式拡張+UGC、Sandboxモーダル カード/親ジャンル+サブタグフィルタ/ソート、詳細ページ Play Now/Room Selection、投票入口 Official FPS FFA/TDM/DOM) を実現。coverage 93%/85%/88%/94%で85%閾値維持。**

## 3. Phase 4 完了サマリ

Phase 4 計画書は [`PHASE04_PLAN.md`](./PHASE04_PLAN.md)。PLAT-4〜PH4-F 完了。

| Subtask | 目的 | 主な成果物 | 状態 |
|---|---|---|---:|
| `PLAT-4` | Phase 4計画作成（ハブ+Sandboxモーダル骨組み+投票入口）改訂版 | `PHASE04_PLAN.md`改訂版、task-listにPLAT-4/PH4-A〜F追加、Official FPS 1ゲーム複数モード + Voxel 1モード永続 + Sandbox公式拡張+UGC + 親ジャンル+サブタグ明記 | ローカル検証済み 100% |
| `PH4-A` | `GameModeDefinition` 親ジャンル+サブタグ+subModes+表示/統計拡張 | `packages/gamemode-api/src/types.ts`拡張 (parentGenre, genres=サブタグ, subModes, category)、`defineGameMode.ts`拡張、`gamemodes/fps/official/ffa`拡張 Official FPSのFFAサブモード、後方互換維持 | ローカル検証済み 100% |
| `PH4-B` | ハブUI Header Official FPS/Voxelタブ切替 | `apps/web/src/components/Header.tsx`新規 Official FPS/Voxel切替、`store/gameStore.ts` activeTab追加、`App.tsx`統合 | ローカル検証済み 100% |
| `PH4-C` | Left Sidebar Krunker風 + Sandboxボタン (公式拡張+UGC) | `apps/web/src/components/LeftSidebar.tsx`新規、Sandboxボタンでモーダルopen 公式拡張+UGC、GameStore sandboxOpen | ローカル検証済み 100% |
| `PH4-D` | Sandboxモーダル 親ジャンル+サブタグフィルタ+ソート (mock 公式拡張+UGC) | `lib/sandbox.ts`新規 parentGenre+subTag filter/sort、`lib/matchmaker-mock.ts`新規 mockGameModes 公式拡張+UGC、`components/SandboxModal.tsx`新規 カード Official含む | ローカル検証済み 100% |
| `PH4-E` | 詳細ページ + Play Now / Room Selectionモーダル (mock) | `components/SandboxDetailPage.tsx`新規、`components/RoomSelectionModal.tsx`新規、Play Now auto-match mock、Room Selection manual mock | ローカル検証済み 100% |
| `PH4-F` | 投票システム入口 Official FPS 1ゲーム複数モード (mock) + quality gate | `components/VoteOverlay.tsx`新規 Official FPS FFA/TDM/DOM投票 Voxel投票対象外、`store/gameStore.ts` voteSession追加、最終quality gate、task-list/HANDOFF/quality-gates更新 | ローカル検証済み 100% |

## 4. 次の 1 件: PLAT-5（Phase 5 計画作成）

### 目的

Phase 5 は voxel本実装 + fps追加モード (TDM/DOM) + Official FPSサブモード本実装 + Official Voxel Survival永続本実装のフェーズ。Phase 4のmockハブUIを本実装へ接続。

### PLAT-5 でやること

- `docs/planning/PHASE05_PLAN.md` を `_TEMPLATE.md` 準拠で作成
- `profile-voxel` 本実装 (noa-engine, voxel-physics-engine)
- Official FPSのTDM/DOMサブモード本実装 (ffaは既存FFAサブモード)
- Official Voxel Survival永続本実装 (finish_game無し、リスポーン)
- `apps/matchmaker/` 本実装開始 (Redis, HMAC ticket) または継続mock
- task-listにPLAT-5/PH5-A〜F追加

### PLAT-5 でやらないこと

- Snapshot `0x11` 新ヘッダ化、AOI、delta snapshot本実装はPhase 7以降検討
- UGC / QuickJS / GLBエディタ本実装はPhase 8
- WebTransportはPhase 9条件付き

## 5. Quality gate の現状（PH4-F完了後）

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
| Unit | 44 files / 311 tests | PH4-F pass (+7 files +56 tests from PH3-D) |
| Coverage | 93.51%/85.8%/88.48%/94.76% | thresholds 85/85/85/85 pass |
| Determinism | lightweight + heavy | pass (heavy 100x1000 0.7s) |
| Same-input | server vs client | 120ticks exact + 100ticks <0.35m |
| E2E discovery | 11 tests discovered | `bun run test:e2e -- --list` pass |
| Browser E2E | 実環境検証待ち | Sandbox Chromium 制約 |
| Import boundary | 0 violations | Biome + check-determinism (engine-core→profile-*, gamemodes→sdkのみ) |
| Console.log | 3件（serverのみ） | client 0件 |
| Zero alloc | 0件 hot path | getPlayersIterable + encode once + head index |
| Memory leak | 0件 | removePlayer/clear + rateLimiter remove |
| Gamemode exception safety | roomが落ちない | GameModeRuntime safeCall + timer try/catch + runtime-gamemode.test.ts |
| Header/Sidebar/Modal | Official切替/Sandbox公式拡張+UGC | Header 5 tests, LeftSidebar 5 tests, SandboxModal 8 tests, Detail 7 tests, Room 6 tests, Vote 8 tests |

## 6. やってはいけない

- Phase 4計画を読まずにPhase 5を開始する。
- `engine-core` に `if (type === 'fps' | 'voxel')` を入れる。
- `engine-core` から `@cod/profile-fps` / `@cod/profile-voxel` を import する。
- `profile-voxel` / voxel terrain / voxel physics 本実装をPH4-Fで混ぜる（Phase 5以降）。
- gamemode API の破壊的変更を計画なしで混ぜる。
- Playwright browser 実行を Sandbox で pass と主張する。
- `bun test` を使う。
- `.agent/logs/` の過去ログを一括置換で書き換える。

## 7. 読み順（次セッション）

1. 本ファイル
2. `AGENTS.md`
3. `.claude/skills/index.md` → 必要なスキルだけ
4. `docs/task-list.md`
5. `docs/planning/PHASE04_PLAN.md`（改訂版）
6. `docs/ops/quality-gates.md`
7. `docs/arch/architecture.md` / `types.md` / `product.md` / `editor.md` / `matchmaker.md` / `client.md` / `adr.md`
8. 必要に応じて `docs/research/DEEP_RESEARCH_SYNTHESIS.md`

旧仕様は `.archive/docs/`。正本にしない。

## 8. 人間への話し方

日本語。敬体。絵文字は報告の最小限。表で状態を出す。タスク完了後は Go 待ちで止める。推測と事実を分ける。

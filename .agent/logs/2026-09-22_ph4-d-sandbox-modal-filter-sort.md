# PH4-D Sandboxモーダル 親ジャンル+サブタグフィルタ+ソート

> Date: 2026-09-22(JST) / Commit: 461fb2a / Branch: arena/01a0b161-cod-web

## 1. 指示内容 (Task Summary)
Phase 4改訂版 PH4-D: Sandboxモーダル 親ジャンル+サブタグフィルタ+ソート (mock 公式拡張+UGC)。カード thumbnail/title/creator/plays/desc、親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic、ソート plays/active/views。

## 2. 実行内容 (Executed Actions)
| Action | File | Detail |
|---|---|---|
| sandbox.ts | `apps/web/src/lib/sandbox.ts` | MOCK_CARDS 6件 公式拡張+UGC含む、filterByParentGenre/SubTag/Search/sortByKey/applySandboxFilters、SandboxQuery型 |
| matchmaker-mock.ts | `apps/web/src/lib/matchmaker-mock.ts` | mockGameModes 6件 公式拡張+UGC、mockRooms 4件、fetchGameModes/fetchGameList/seekGame mock |
| gameStore拡張 | `apps/web/src/store/gameStore.ts` | sandboxParentGenre, sandboxSubTag, sandboxSort, sandboxSearch, selectedSandboxCardId + setters |
| SandboxModal | `apps/web/src/components/SandboxModal.tsx` | 親ジャンルフィルタ [All,FPS,Voxel] + サブタグ [All,Bedwars,Zombie,Athletic,TDM,DOM,FFA] + ソート [plays,active,views]、カードグリッド Official含む、data-testid sandbox-modal/filter-parent-*/filter-subtag-*/card-* |
| CSS | `apps/web/src/index.css` | sandbox-modalスタイル |
| Tests | `_tests_/apps/web/src/lib/sandbox.test.ts` 7 tests + `SandboxModal.test.tsx` 8 tests | filter/sort/search/empty、render/filter/sort/card click/close |
| Quality | typecheck 0, lint 0, unit 41 files 289 tests, build pass, E2E 11, determinism pass |  |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)
- SandboxはOfficial以外の公式拡張+UGCの集合という2026-09-22改訂版を忠実に実装。MOCK_CARDSにOfficial creatorも含む。
- parentGenreはFPS/Voxelの2つのみ、subTagはBedwars/Zombie/Athletic/TDM/DOM/FFA等、product.mdのSandbox親ジャンル+サブタグ仕様準拠。
- ソートはplays/active/views = totalPlays/activePlayers/detailViewsのエイリアス、GameModeStats拡張に対応。
- filterByParentGenre/SubTag/Search/sortByKeyは純粋関数でunitテスト容易、applySandboxFiltersで合成。
- matchmaker-mockはPhase 4ではmockのみ、本実装Redis/HMACはPhase 5以降。

## 4. 次にすべきこと (Next Actions)
- PH4-E 詳細ページ + Play Now/Room Selectionモーダル mock
- PH4-F 投票システム入口 Official FPS 1ゲーム複数モード mock

# PH4-B Header Official FPS/Voxel切替

> Date: 2026-09-22(JST) / Commit: 8a162dc / Branch: arena/01a0b161-cod-web

## 1. 指示内容 (Task Summary)
Phase 4改訂版 PH4-B: ハブUI Header [FPS][Voxel] Official切替実装。Official FPSは1ゲーム複数モード [FFA,TDM,DOM]投票、Official Voxelは1モード [Survival]永続。HeaderはOfficialゲーム切替。

## 2. 実行内容 (Executed Actions)
| Action | File | Detail |
|---|---|---|
| Header component | `apps/web/src/components/Header.tsx` | Official FPS/Voxel切替タブ、activeTab store、controlled props、data-testid header/official-fps-tab/official-voxel-tab |
| store拡張 | `apps/web/src/store/gameStore.ts` | activeTab: 'fps'|'voxel' default 'fps', setActiveTab |
| App統合 | `apps/web/src/App.tsx` | app-game-area内にHeader配置 |
| CSS | `apps/web/src/index.css` | hub-headerスタイル |
| Test | `_tests_/apps/web/src/components/Header.test.tsx` | 5 tests: render tabs, active state, switch, controlled, Voxel note |
| Quality | bun run typecheck/lint/unit/build/E2E list/determinism | 38 files 269 tests pass |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)
- HeaderはOfficialゲーム切替のみ、SandboxはSidebarからという2026-09-22改訂版仕様を忠実に実装。L1 typeはfps|voxelの2つのまま。
- activeTabはstoreで管理、Headerはcontrolledでも動作するようにpropsで上書き可能。
- Official FPSは1ゲーム複数モードという概念をUIではタブ切替で表現、実際のサブモード投票はPH4-Fで実装。
- Boxel typoはvoxelに訂正済み、Headerではfps/voxelのみ扱う。

## 4. 次にすべきこと (Next Actions)
- PH4-C Left Sidebar Krunker風 + Sandboxボタン
- PH4-D Sandboxモーダル 親ジャンル+サブタグフィルタ
- PH4-E 詳細ページ + Play Now/Room Selection
- PH4-F 投票システム入口

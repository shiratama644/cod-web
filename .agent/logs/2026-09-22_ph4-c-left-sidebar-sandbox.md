# PH4-C Left Sidebar Krunker風 + Sandboxボタン

> Date: 2026-09-22(JST) / Commit: 9e5fb13 / Branch: arena/01a0b161-cod-web

## 1. 指示内容 (Task Summary)
Phase 4改訂版 PH4-C: Left Sidebar Krunker風 + Sandboxボタン。Sandboxは公式拡張+UGCの集合、Sidebarからモーダルopen。

## 2. 実行内容 (Executed Actions)
| Action | File | Detail |
|---|---|---|
| LeftSidebar | `apps/web/src/components/LeftSidebar.tsx` | Play/Sandbox/Settings/Shop、SandboxボタンでsetSandboxOpen(true)、公式拡張+UGC note、data-testid left-sidebar/sandbox-btn/play-btn |
| store拡張 | `apps/web/src/store/gameStore.ts` | sandboxOpen boolean default false, setSandboxOpen |
| App統合 | `apps/web/src/App.tsx` | app-body flex内にLeftSidebar配置、Headerと分離 |
| CSS | `apps/web/src/index.css` | left-sidebarスタイル |
| Test | `_tests_/apps/web/src/components/LeftSidebar.test.tsx` | 5 tests: render, Sandbox open, Play, Settings, controlled |
| Quality | typecheck/lint/unit 39 files 274 tests/build/E2E 11/determinism | pass |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)
- SidebarはKrunker.io風の縦ナビ、メインゲームはOfficial FPS/Voxel、Sandboxは拡張+UGCという位置づけ。
- sandboxOpenはstoreで管理、Header activeTabと独立。
- Appレイアウトはapp-game-area + app-body flex、Header上、Sidebar左、GameCanvas中央という構成。
- 公式拡張+UGCという概念をSandboxボタンに明記、ユーザーに分かりやすく。

## 4. 次にすべきこと (Next Actions)
- PH4-D Sandboxモーダル 親ジャンル+サブタグフィルタ+ソート mock 公式拡張+UGC
- PH4-E 詳細ページ + Play Now/Room Selection
- PH4-F 投票システム入口

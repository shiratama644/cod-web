# PH4-E 詳細ページ + Play Now/Room Selectionモーダル

> Date: 2026-09-22(JST) / Commit: 19ef829 / Branch: arena/01a0b161-cod-web

## 1. 指示内容 (Task Summary)
Phase 4改訂版 PH4-E: 詳細ページ + Play Now/Room Selectionモーダル (mock)。カードクリックで詳細 /sandbox/{id}、Play Now空きルーム自動マッチ、ルーム選択モーダル手動選択。

## 2. 実行内容 (Executed Actions)
| Action | File | Detail |
|---|---|---|
| SandboxDetailPage | `apps/web/src/components/SandboxDetailPage.tsx` | selectedSandboxCardIdからカード取得、内部パス /{type}/{source}/{slug}→/sandbox/{id}、Play Now seekGame auto-match、Room Selection setRoomSelectionOpen、data-testid sandbox-detail/detail-actions/play-now-btn/room-selection-btn |
| RoomSelectionModal | `apps/web/src/components/RoomSelectionModal.tsx` | mockRooms/fetchGameListフィルタ、Join seekGameでモーダルclose、data-testid room-selection-modal/room-list/room-item-*/join-* |
| store拡張 | `apps/web/src/store/gameStore.ts` | roomSelectionOpen boolean + setter、duplicate sandboxOpen修正 |
| App統合 | `apps/web/src/App.tsx` | Detail/Roomモーダル統合 |
| CSS | `apps/web/src/index.css` | sandbox-detail/room-selection-modalスタイル |
| Tests | `SandboxDetailPage.test.tsx` 7 tests + `RoomSelectionModal.test.tsx` 6 tests | detail render, Play Now/Room Selection buttons, onPlayNow close, store open, close, controlled, null / rooms render, closed null, Join onJoin closes, close button, empty, all rooms |
| Quality | typecheck 0 after duplicate fix, lint 0, unit 43 files 302 tests, build pass, E2E 11, determinism pass | |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)
- 詳細ページ内部パスは /{type}/{source}/{slug} を /sandbox/{id} にマッピング、将来のルーティング拡張に備えつつmockで実装。
- Play NowはseekGame auto-match mock、Room Selectionはmanual mock、どちらも公式拡張+UGC両対応。
- RoomSelectionModalはselectedSandboxCardIdでfetchGameListフィルタ、空ルーム自動マッチの代替として手動選択を提供。
- store拡張時にduplicate identifier sandboxOpenが発生、old_text/new_textのfuzzy matchで重複生成された。edit_file後はtypecheckで必ず確認。
- App2.test.tsxはstore拡張時にvoteSession等の新フィールドをsetStateに追加する必要あり、拡張忘れでtest失敗。

## 4. 次にすべきこと (Next Actions)
- PH4-F 投票システム入口 Official FPS 1ゲーム複数モード mock + quality gate + docs更新

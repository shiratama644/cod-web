# Phase 4: ハブ + Sandbox モーダル + 投票システム + マッチメイカー骨組み

> 対応 task-list ID: `PLAT-4`, `PH4-A`〜`PH4-F` (docs/task-list.md)  
> 計画書テンプレート: docs/planning/_TEMPLATE.md 準拠  
> 範囲決定: 2026-09-22 ユーザー提供「ゲームプラットフォーム 仕様定義書」理想確定、FPS/Voxel/Sandbox 3カテゴリ、Header FPS/Voxelタブ、Left Sidebar Krunker風 Sandboxボタン、Sandboxモーダル (カード: thumbnail/title/creator/plays/desc、フィルタ Bedwars/Zombie/Athletic、ソート plays/active/views)、詳細ページ Play Now/Room Selection、メインFPS投票システム。L1 type分岐は fps|voxel の2つのまま、Sandboxは source=ugc 表示集約。過去の `boxel` 表記は `voxel` のタイポで訂正済み。

## 1. 開始前確認

- 現在のブランチ / HEAD / `git status` を確認する（未コミット変更があれば停止）
- `docs/task-list.md` で PH3-D がローカル検証済み/完了であることを確認する
- 関連仕様を読む
  - `AGENTS.md` §6（L1にtype分岐を書かない、決定論、ゼロアロケ、Sandbox制約、Biome境界、.agent正本）
  - `.agent/skills/index.md` から `project-overview` / `tech-stack` / `import-boundaries` / `deterministic-sim` / `zero-alloc` / `networking` / `babylon-integration`
  - `docs/arch/product.md`（2026-09-22更新: FPS/Voxel/Sandbox 3カテゴリ、Header/Sidebar、Sandboxモーダル、投票）
  - `docs/arch/editor.md`（genre/tag拡張、Sandbox表示マッピング）
  - `docs/arch/types.md`（GameModeDefinition拡張 genres/tags/display/stats、SandboxCard/Filter/Sort、Voting、Boxel正規化）
  - `docs/arch/architecture.md`（L3表示集約、SandboxはL1分岐増やさない）
  - `docs/arch/matchmaker.md`（genre/tagフィルタ、ソート、Play Now/Room Selectionフロー）
  - `docs/arch/client.md`（Header/Sidebar/Sandboxモーダル/詳細ページ/投票UI）
  - `docs/arch/milestones.md`（Phase 4 DoD: ハブUI、Sandboxモーダル骨組み、投票入口）
  - `docs/planning/SANDBOX_SPEC整理.md` / `SANDBOX_FILTER_DISCUSSION.md`（ユーザー理想整理）
  - `apps/web/src/App.tsx` / `components/*`（現行HUD/StartOverlay構成）
  - `packages/gamemode-api/src/`（現行GameModeDefinition）
  - `gamemodes/fps/official/ffa/index.ts`（現行fps-official-ffa）
- 本計画書の §5（完了条件）と §7（停止条件）を再読する
- Phase 4 実装へ入る前に、`PLAT-4` の計画 commit が push 済みであることを確認する

## 2. 目的 (Why)

Phase 4 の目的は、**Phase 3で分離した gamemode API の上に、ユーザー理想の 3カテゴリプラットフォームのハブUI骨組みを実装し、Sandbox UGCハブのフィルタ/ソート/参加フローとFPS投票システムの入口を作ること**。

現状（PH3-D）は:

- `fps-official-ffa` が gameserverで動き、webは単一GameCanvas + HUD + StartOverlay
- ハブUI (Header FPS/Voxelタブ、Left Sidebar Sandboxボタン) が無い
- Sandboxモーダル (カード一覧、フィルタ Bedwars/Zombie/Athletic、ソート plays/active/views) が無い
- 詳細ページ Play Now (auto-match) / Room Selection (manual) フローが無い
- 投票システム (onRoundEndで次モード投票) が無い
- `GameModeDefinition` に genres/tags/display/stats が無い
- matchmakerは未実装 (apps/matchmaker無し)

Phase 4 完了時点では:

- `GameModeDefinition` に `genres?`, `tags?`, `display?`, `stats?` が optional追加され、既存 ffa は後方互換で動く
- `apps/web` に Header (FPS/Voxelタブ切替)、Left Sidebar (Krunker風、Sandboxボタン)、Sandboxモーダル (カード: thumbnail/title/creator/plays/desc、フィルタ genre、ソート plays/active/views、mockデータ)、詳細ページ (Play Now / Room Selection モーダル mock)、投票UI (mock) が実装され、既存GameCanvas経路を壊さない
- `packages/gamemode-api` に `SandboxCard`, `SandboxFilterCategory`, `SandboxSortKey`, `VoteOption` 等の型が追加（または `shared-types` 的な web用型として `apps/web/src/lib/sandbox.ts` に分離）
- matchmakerは依然mockだが、web側で `GET /v1/gamemodes` / `game-list` / `seek-game` 相当のmock APIを `apps/web/src/lib/matchmaker-mock.ts` として提供
- 既存 quality gate維持: typecheck/lint 0 warnings/unit 37 files 255 tests+/coverage 85%/build/E2E discovery 11+/determinism
- `profile-voxel` 本実装、voxel terrain、AOI、delta snapshot本実装、QuickJS、GLBエディタ本実装は含めない

## 3. 変更範囲 (Scope)

変更対象:

- `packages/gamemode-api/src/types.ts` 拡張
  - `Genre`, `Tag`, `PlatformCategory` 型追加
  - `GameModeDefinition` に `genres?: Genre[]`, `tags?: Tag[]`, `display?: { title, description, thumbnail, creator, creatorId }`, `stats?: { totalPlays, activePlayers, detailViews }` optional追加
  - `SandboxCard`, `SandboxFilterCategory`, `SandboxSortKey`, `SandboxQuery`, `RoomSummary`, `VoteOption`, `VoteSession`, `VoteEvent` 型追加
  - 後方互換: 既存 `defineGameMode` 検証は genres/tags/display/stats を無視、既存 ffa テストが壊れない
- `packages/gamemode-api/src/defineGameMode.ts` 拡張
  - genres/tags が配列なら要素が string であることを検証（空配列許容）、display/stats は optional object 検証（不正なら無視 or throw せず後方互換）
- `gamemodes/fps/official/ffa/index.ts` 拡張
  - `genres: ['ffa','fps']`, `tags: ['official','pvp','fps']`, `display: { title: 'FFA', description: 'Free For All', creator: 'Official' }`, `stats: { totalPlays: 0, activePlayers: 0, detailViews: 0 }` を追加（mock値）
  - 既存 hooks維持
- `apps/web/src/` 新規/拡張
  - `lib/sandbox.ts` 新規: `Genre`, `Tag`, `SandboxCard`, `SandboxFilterCategory`, `SandboxSortKey`, `SORT_FUNCS`, `FILTER_FUNCS`、mockデータ生成
  - `lib/matchmaker-mock.ts` 新規: `mockGameModes: SandboxCard[]`, `mockRooms: RoomSummary[]`, `fetchGameModes(query): SandboxCard[]`, `fetchGameList(modeId): RoomSummary[]`, `seekGame(modeId|roomId): ticket mock`
  - `components/Header.tsx` 新規: `[Logo] [FPS] [Voxel] [Search] [User]`、FPS/Voxelタブ切替、active state、onTabChange callback
  - `components/LeftSidebar.tsx` 新規: Krunker風縦ボタン群、`[Play] [Sandbox] [Settings] [Shop]`、SandboxボタンでonOpenSandbox
  - `components/SandboxModal.tsx` 新規: モーダル、カード一覧 (thumbnail/title/creator/plays/desc)、フィルタ [All][Bedwars][Zombie][Athletic]、ソート [Plays][Active][Views]、mockデータ、クリックでonSelectCard
  - `components/SandboxDetailPage.tsx` 新規: `/sandbox/{id}` 詳細、thumbnail/title/creator/plays/active/desc、[Play Now] (auto-match mock)、[ルーム選択] (RoomSelectionModalを開く)
  - `components/RoomSelectionModal.tsx` 新規: ルーム一覧モーダル、mock rooms、[Join]ボタン
  - `components/VoteOverlay.tsx` 新規: 投票UI、onRoundEnd mockで表示、候補 FFA/TDM/DOM、多数決表示、タイマー
  - `components/GameShell.tsx` 新規 or `App.tsx` 拡張: Header + LeftSidebar + GameCanvas + SandboxModal + DetailPage + VoteOverlay のレイアウト統合、state管理 (activeTab: 'fps'|'voxel', sandboxOpen, selectedCard, voteSession)
  - `App.tsx` 拡張: GameShellを導入、既存 GameCanvas/HUD/TouchControls/StartOverlayを維持、Header/Sidebar追加で既存描画経路を壊さない
  - `index.css` 拡張: Header/Sidebar/Modal/Card/Vote の最小スタイル（Krunker風は後続、まずは機能骨組み）
- `apps/web/src/store/gameStore.ts` 拡張
  - `activeTab: 'fps'|'voxel'`, `sandboxOpen: boolean`, `selectedSandboxCard: SandboxCard | null`, `sandboxFilter: SandboxFilterCategory`, `sandboxSort: SandboxSortKey`, `voteSession: VoteSession | null` 等を追加
  - 既存 state維持
- `_tests_/apps/web/` 新規/拡張
  - `sandbox.test.ts`: filter/sort関数、mockデータ生成
  - `Header.test.tsx` or `LeftSidebar.test.tsx`: タブ切替、Sandboxボタン押下でモーダルopen
  - `SandboxModal.test.tsx`: フィルタ Bedwars/Zombie/Athletic、ソート plays/active/views、カード表示 thumbnail/title/creator/plays/desc
  - 既存 unit tests維持
- `docs/` / `biome.json` / `docs/task-list.md` / `docs/planning/HANDOFF.md`
  - `biome.json` 変更無し（webは既存制限のみ）
  - task-listに PLAT-4 / PH4-A〜F追加
  - HANDOFF更新（Phase 4準備）
  - quality-gates更新（新規コンポーネント coverage）

変更しない（境界外）:

- `packages/profile-voxel` 本実装、voxel terrain / chunk / block action / block delta本実装
- `voxel-physics-engine` / `noa-engine` dependency追加
- AOI、delta snapshot、Snapshot 0x11新ヘッダ化、1200B分割本実装
- `apps/matchmaker/` 本実装 (HTTP server, Redis, HMAC ticket本実装) — Phase 4では mockのみ、本実装はPH4以降 or Phase 5
- FireAction / HitConfirm / 巻き戻しヒットスキャン本実装
- UGC / QuickJS / glTF pipeline / editor本実装
- WebTransport
- RDB / ランキング永続化本実装（Phase 6以降）
- Playwright browser実行をSandboxでpassと主張
- 既存 fps-ffaのsimulation / snapshot経路破壊

## 4. 禁止事項

- 不明点は推測で埋めず、§7 の停止条件に従って質問する
- `docs/arch/adr.md` に反する実装をしない（権威サーバー、WSのみ、ReactはHUD/ハブのみ、3DはBabylon）
- L1 `engine-core` / `gamemode-api` に `if (type === 'fps' | 'voxel')` 分岐を増やさない（Sandboxは表示集約、L1分岐増やさない）
- `gamemode-api` に `three` / `three-mesh-bvh` / `@babylonjs/*` / `profile-*` を入れない（L1純度）
- `gamemodes/*` から `@cod/gamemode-sdk` 以外をimportしない（Biome維持）
- Game TypeとContent Sourceを混同しない（official/ugcはtypeではない、Sandboxはsource=ugc表示集約）
- `profile-voxel` / voxel terrain / AOI / delta snapshotを「ついで」に作らない
- existing fps-ffa behaviorを壊してからまとめて直す進め方をしない。各subtaskは小さく、検証してcommit
- `SimProfile.step` / `GameModeRuntime` 配下に `Math.random` / `Date.now` / `setTimeout` を入れない（決定論、tick基準）
- hot pathで `new` / `.slice()` / `[]` / `{}` / `.map` / クロージャ生成を増やさない（zero-alloc）
- `bun test` を使わない。Vitestは `bun run test:unit` / `bun run test:coverage`
- `ws.send()` 戻り値分岐無視しない
- Snapshot wire format改定をPhase 4で混ぜない
- Sandboxモーダルの実装で外部UIライブラリ (MUI, AntD等) を新規追加しない（現行は素のReact+CSS、追加依存は要議論）
- Playwright browser実行をSandboxでpassと主張しない

## 5. 完了条件 (DoD)

### PLAT-4（本計画）の DoD

- [ ] `docs/planning/PHASE04_PLAN.md` が `_TEMPLATE.md` 準拠で作成される
- [ ] `docs/task-list.md` に `PLAT-4` と `PH4-A`〜`PH4-F` が追加され、Phase 4が「ハブ+Sandboxモーダル骨組み+投票入口」であることが明記される
- [ ] FPS/Voxel/Sandbox 3カテゴリ構成、Header FPS/Voxelタブ、Left Sidebar Sandboxボタン、Sandboxモーダル (カード thumbnail/title/creator/plays/desc、フィルタ Bedwars/Zombie/Athletic、ソート plays/active/views)、詳細ページ Play Now/Room Selection、投票システム入口が計画書・arch・task-listに明記される
- [ ] L1 type分岐は fps|voxelの2つのまま、Sandboxは source=ugc表示集約であることが明記される
- [ ] docs-onlyの整合確認（リンクチェック / `git diff --check`）がpassする
- [ ] commit / push 済み

### Phase 4 全体の DoD

- [ ] `packages/gamemode-api` に `genres?`, `tags?`, `display?`, `stats?` が optional追加され、既存 `fps-official-ffa` が後方互換で動く（既存 tests 255 pass維持）
- [ ] `gamemodes/fps/official/ffa` に `genres`, `tags`, `display`, `stats` が追加され、mock値でSandboxカード表示可能
- [ ] `apps/web` に Header (FPS/Voxelタブ切替)、LeftSidebar (Krunker風、Sandboxボタン)、SandboxModal (カード一覧、フィルタ、ソート、mock)、SandboxDetailPage (Play Now auto-match mock、Room Selection modal)、VoteOverlay (投票UI mock) が実装され、既存 GameCanvas経路を壊さない
- [ ] `apps/web/src/lib/sandbox.ts` に filter/sort関数があり、Bedwars/Zombie/Athleticフィルタ、plays/active/viewsソートのunit testがある
- [ ] `apps/web/src/lib/matchmaker-mock.ts` に mock APIがあり、Play Now / Room Selectionフローがmockで動く
- [ ] `apps/web/src/store/gameStore.ts` に activeTab/sandboxOpen/selectedCard/filter/sort/voteSession stateが追加
- [ ] 既存 quality gate維持: `typecheck` / `lint` 0 warnings / `test:unit` 37 files 255 tests以上 (新規追加で+5 files +20 tests目安) / `test:coverage` 85/85/85/85以上 / `build` / `test:e2e -- --list` 11以上 / `check:determinism` / `check:determinism:heavy` pass
- [ ] `engine-core` から `profile-fps` / `profile-voxel` へのimportがBiomeで引き続き禁止 (0 violations)
- [ ] `gamemodes/*` → `@cod/gamemode-sdk` のみ制限が維持される
- [ ] `docs/arch/product.md`, `editor.md`, `types.md`, `matchmaker.md`, `client.md`, `architecture.md` が本計画と整合（2026-09-22理想反映済み）
- [ ] `docs/task-list.md` / `docs/planning/HANDOFF.md` / `docs/ops/quality-gates.md` が更新される
- [ ] `.agent/logs/` に Phase 4ログが追加される

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit (vitest) | `bun run test:unit` | 既存255 tests維持 + filter Bedwars/Zombie/Athletic / sort plays/active/views / mockデータ生成 / Header tab切替 / Sidebar Sandboxボタン / SandboxModal card表示 / GameStore state |
| Coverage | `bun run test:coverage` | thresholds 85/85/85/85を下回らない。sandbox.ts / matchmaker-mock.ts / Header / Sidebar / Modal の重要branchをassertion。include-all維持 |
| Typecheck | `bun run typecheck` | client/server TS strict + workspace exports（gamemode-api拡張含む）が通る |
| Lint | `bunx biome lint .` | engine-core→profile-*禁止、gamemodes/*→gamemode-sdkのみ、WebSocket global禁止、Biome warnings 0 |
| Build | `bun run build` | packages（gamemode-api拡張含む）とappsがproduction build。Vite chunk-size warningは既知 |
| E2E discovery | `bun run test:e2e -- --list` | 11 tests以上 discovery。browser実行はSandboxでは行わない |
| Determinism | `bun run check:determinism` + `scripts/determinism-heavy.ts` | SimProfile.step + GameModeRuntimeに禁止API混入なし、heavy pass |
| 構造監査 | `grep -R "profile-fps\\|profile-voxel" packages/engine-core --include="*.ts"` 0件 / `grep -R "from '@cod/profile" packages/gamemode-api --include="*.ts"` 0件 / `grep -R "from.*gamemode" gamemodes --include="*.ts" \\| grep -v "gamemode-sdk"` 0件 |
| 実環境 | CIまたは実機で `bun run test:e2e` | Browser E2Eは実環境検証待ち。Sandboxモーダル/投票UIの手動確認は実環境で |

## 7. 停止条件

次の場合は作業を停止し、変更せず報告する:

- 仕様書（計画書・arch・AGENTS.md・skills）同士に矛盾がある（特に product.md / editor.md / types.md の FPS/Voxel/Sandbox 3カテゴリ定義と本計画の実装範囲が衝突）
- L1 `engine-core` / `gamemode-api` に type分岐 `if (type === 'fps' | 'voxel')` を書かないと進められない設計になった
- `gamemode-api` が `profile-fps` / `three` / `three-mesh-bvh` / `@babylonjs/*` に依存しないと進められない設計になった（L1純度違反）
- Snapshot wire format改定、AOI、delta snapshot、1200B分割、巻き戻しヒットスキャン本実装が必要になる
- matchmaker本実装 (HTTP server, Redis, HMAC ticket本実装) が必要になる（Phase 4ではmockのみ）
- `profile-voxel` / voxel terrain本実装が必要になる
- 既存 coverage threshold 85%を下げないと進められない（数字稼ぎではなく重要経路assertion追加で対応）
- `defineGameMode` の genres/tags/display/stats 追加が後方互換を壊し、既存 ffa testsが大量に落ちる
- `GameType` を `fps|voxel` 以外に増やす必要が生じた（Sandboxは表示集約、L1分岐増やさない方針違反）
- Sandbox制約により検証不能な項目を完了扱いにしそうになった
- 開始時点で作業ツリーに未確認の変更がある

## 8. 完了時に行うこと

1. 差分を自己レビューする（`git diff`で意図しない変更がないか）
2. 実装タスクでは 4+3検証を実行する
   - `bun run typecheck`
   - `bunx biome lint .`
   - `bun run test:unit`
   - `bun run test:coverage`
   - `bun run build`
   - `bun run test:e2e -- --list`
   - `bun run check:determinism`
   - `bun run scripts/determinism-heavy.ts`
3. docs-onlyの `PLAT-4` ではリンク整合と `git diff --check` を実行する
4. `docs/task-list.md` の状態・進捗・証拠を更新する（PLAT-4 / PH4-A〜F）
5. `docs/planning/HANDOFF.md` を更新する（Phase 4完了、次はPhase 5計画）
6. `.agent/logs/YYYY-MM-DD_<summary>.md` を追加する（4セクション）
7. 必要な知見を `.agent/skills/` に同期する（sandbox hub / voting）
8. タスクIDを含むConventional Commitでcommitする
9. `git push origin <session-branch>` でセッション固定ブランチへpushする
10. 完了報告では、Playwright browser実行はSandbox未実行であることを明記し、Sandboxモーダル/投票UIのmock性質を明示する

## 9. サブタスク分割

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| `PLAT-4` | Phase 4計画作成（ハブ+Sandboxモーダル骨組み+投票入口） | `docs/planning/PHASE04_PLAN.md`、task-listにPLAT-4/PH4-A〜F追加、FPS/Voxel/Sandbox 3カテゴリ・Sandboxモーダル・投票明記 | `PH3-D` |
| `PH4-A` | `GameModeDefinition` genres/tags/display/stats拡張 | `packages/gamemode-api/src/types.ts`拡張、`defineGameMode.ts`拡張、`gamemodes/fps/official/ffa`拡張、後方互換維持 | `PLAT-4` |
| `PH4-B` | ハブUI Header FPS/Voxelタブ切替 | `apps/web/src/components/Header.tsx`新規、`store/gameStore.ts` activeTab追加、`App.tsx`統合、unit tests | `PH4-A` |
| `PH4-C` | Left Sidebar Krunker風 + Sandboxボタン | `apps/web/src/components/LeftSidebar.tsx`新規、Sandboxボタンでモーダルopen、GameStore sandboxOpen、App統合、unit tests | `PH4-B` |
| `PH4-D` | Sandboxモーダル カード一覧+フィルタ+ソート (mock) | `lib/sandbox.ts`新規 (filter/sort)、`lib/matchmaker-mock.ts`新規 (mockGameModes)、`components/SandboxModal.tsx`新規 (カード thumbnail/title/creator/plays/desc、フィルタ Bedwars/Zombie/Athletic、ソート plays/active/views)、GameStore filter/sort、unit tests | `PH4-C` |
| `PH4-E` | 詳細ページ + Play Now / Room Selectionモーダル (mock) | `components/SandboxDetailPage.tsx`新規、 `components/RoomSelectionModal.tsx`新規、 `lib/matchmaker-mock.ts`拡張 (mockRooms, fetchGameList, seekGame)、Play Now auto-match mock、Room Selection manual mock、unit tests | `PH4-D` |
| `PH4-F` | 投票システム入口 (mock) | `components/VoteOverlay.tsx`新規、 `store/gameStore.ts` voteSession追加、 `lib/sandbox.ts` Vote型、onRoundEnd mockで投票UI表示、FFA/TDM/DOM候補、多数決、tick基準タイマー、unit tests、最終quality gate、task-list/HANDOFF/quality-gates更新 | `PH4-E` |

## 10. 設計詳細・仕様

### 10.1 `gamemode-api` 拡張

```ts
// packages/gamemode-api/src/types.ts 拡張
export type PlatformCategory = 'fps' | 'voxel' | 'sandbox';
export type Genre = 'fps' | 'ffa' | 'pvp' | 'tdm' | 'dom' | 'zombie' | 'athletic' | 'bedwars' | 'survival' | string;
export type Tag = 'official' | 'ugc' | 'fps' | 'voxel' | 'pvp' | 'pve' | string;

export interface GameModeDefinition {
  // 既存
  id: string; type: GameType; source: ContentSource; slug: string; minPlayers: number; maxPlayers: number; world: ...
  // 追加 optional
  genres?: Genre[];
  tags?: Tag[];
  display?: { title?: string; description?: string; thumbnail?: string; creator?: string; creatorId?: string; };
  stats?: { totalPlays?: number; activePlayers?: number; detailViews?: number; };
  // hooks既存維持
}

export interface SandboxCard {
  id: string; type: GameType; source: ContentSource; slug: string;
  genres: Genre[]; tags: Tag[];
  title: string; creator: string; thumbnail: string;
  totalPlays: number; activePlayers: number; detailViews: number; description: string;
}

export type SandboxFilterCategory = 'all' | Genre;
export type SandboxSortKey = 'totalPlays' | 'activePlayers' | 'detailViews';
```

- 後方互換: genres/tags/display/stats は optional、defineGameMode検証では不正でもthrowせず無視 or 軽量検証（配列要素がstringか）
### 10.2 `gamemodes/fps/official/ffa` 拡張

```ts
export default defineGameMode({
  id: 'fps-official-ffa',
  type: 'fps',
  source: 'official',
  slug: 'ffa',
  minPlayers: 2,
  maxPlayers: 16,
  world: { map: 'static-arena' },
  genres: ['ffa','fps'],
  tags: ['official','pvp','fps'],
  display: { title: 'FFA', description: 'Free For All - Official', thumbnail: '/thumbnails/ffa.png', creator: 'Official' },
  stats: { totalPlays: 1234, activePlayers: 12, detailViews: 567 },
  // hooks既存
});
```

### 10.3 `apps/web` ハブUI

#### Header

```tsx
// components/Header.tsx
export function Header({ activeTab, onTabChange }: { activeTab: 'fps'|'voxel', onTabChange: (t: 'fps'|'voxel')=>void }) {
  return (
    <header className="hub-header">
      <div className="logo">COD-WEB</div>
      <nav>
        <button className={activeTab==='fps'?'active':''} onClick={()=>onTabChange('fps')}>FPS</button>
        <button className={activeTab==='voxel'?'active':''} onClick={()=>onTabChange('voxel')}>Voxel</button>
      </nav>
      <div className="user">[User]</div>
    </header>
  );
}
```

#### LeftSidebar

```tsx
// components/LeftSidebar.tsx
export function LeftSidebar({ onOpenSandbox }: { onOpenSandbox: ()=>void }) {
  return (
    <aside className="left-sidebar krunker-style">
      <button>Play</button>
      <button onClick={onOpenSandbox}>Sandbox</button>
      <button>Settings</button>
      <button>Shop</button>
    </aside>
  );
}
```

#### Sandbox lib

```ts
// lib/sandbox.ts
export function filterByGenre(cards: SandboxCard[], genre: SandboxFilterCategory): SandboxCard[] {
  if (genre==='all') return cards;
  const g = genre.toLowerCase();
  return cards.filter(c => c.genres.includes(g));
}

export function sortByKey(cards: SandboxCard[], key: SandboxSortKey, order: 'desc'|'asc'='desc'): SandboxCard[] {
  return [...cards].sort((a,b) => order==='desc' ? b[key]-a[key] : a[key]-b[key]);
}

export function normalizeGenre(input: string): string {
  const lower = input.toLowerCase();
  return lower;
}

export const MOCK_CARDS: SandboxCard[] = [
  { id: 'voxel-ugc-bedwars-1', type: 'voxel', source: 'ugc', slug: 'bedwars', genres: ['bedwars'], tags: ['ugc','bedwars','pvp'], title: 'Bedwars Pro', creator: 'User123', thumbnail: '/thumb/bedwars.png', totalPlays: 10234, activePlayers: 12, detailViews: 3456, description: 'Ultimate bedwars...' },
  { id: 'fps-ugc-zombie-1', type: 'fps', source: 'ugc', slug: 'zombie', genres: ['zombie'], tags: ['ugc','zombie','pve'], title: 'Zombie Survival', creator: 'Zombiemaster', thumbnail: '/thumb/zombie.png', totalPlays: 5432, activePlayers: 8, detailViews: 1234, description: 'Survive zombies...' },
  { id: 'voxel-ugc-athletic-1', type: 'voxel', source: 'ugc', slug: 'athletic', genres: ['athletic'], tags: ['ugc','athletic','parkour'], title: 'Athletic Parkour', creator: 'ParkourKing', thumbnail: '/thumb/athletic.png', totalPlays: 3210, activePlayers: 5, detailViews: 890, description: 'Jump and run...' },
];
```

#### SandboxModal

```tsx
// components/SandboxModal.tsx
export function SandboxModal({ open, cards, filter, sort, onFilterChange, onSortChange, onSelectCard, onClose }: Props) {
  const filtered = filterByGenre(cards, filter);
  const sorted = sortByKey(filtered, sort, 'desc');
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="sandbox-modal">
        <header>Sandbox (UGC) <button onClick={onClose}>X</button></header>
        <div className="filters">
          {['all','bedwars','zombie','athletic'].map(g => <button key={g} className={filter===g?'active':''} onClick={()=>onFilterChange(g)}>{g}</button>)}
        </div>
        <div className="sort">
          <select value={sort} onChange={e=>onSortChange(e.target.value)}>
            <option value="totalPlays">Plays</option>
            <option value="activePlayers">Active</option>
            <option value="detailViews">Views</option>
          </select>
        </div>
        <div className="card-grid">
          {sorted.map(card => (
            <div key={card.id} className="sandbox-card" onClick={()=>onSelectCard(card)}>
              <img src={card.thumbnail} alt={card.title} />
              <h3>{card.title}</h3>
              <p>Creator: {card.creator}</p>
              <p>Plays: {card.totalPlays}</p>
              <p>{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

#### DetailPage + RoomSelection

```tsx
// components/SandboxDetailPage.tsx
export function SandboxDetailPage({ card, onPlayNow, onOpenRoomSelection, onBack }: Props) {
  return (
    <div className="detail-page">
      <button onClick={onBack}>Back</button>
      <img src={card.thumbnail} />
      <h1>{card.title}</h1>
      <p>Creator: {card.creator} | Plays: {card.totalPlays} | Active: {card.activePlayers}</p>
      <p>{card.description}</p>
      <button onClick={()=>onPlayNow(card)}>Play Now</button>
      <button onClick={()=>onOpenRoomSelection(card)}>ルーム選択</button>
    </div>
  );
}

// components/RoomSelectionModal.tsx
export function RoomSelectionModal({ open, rooms, onJoin, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="room-list-modal">
        <header>Room Selection <button onClick={onClose}>X</button></header>
        {rooms.map(r => <div key={r.roomId}>{r.roomId}: {r.playerCount}/{r.maxPlayers} <button onClick={()=>onJoin(r)}>Join</button></div>)}
      </div>
    </div>
  );
}
```

#### VoteOverlay

```tsx
// components/VoteOverlay.tsx
export function VoteOverlay({ session, onVote }: { session: VoteSession | null, onVote: (modeId:string)=>void }) {
  if (!session) return null;
  return (
    <div className="vote-overlay">
      <h2>次のモードを投票</h2>
      {session.options.map(opt => <button key={opt.modeId} onClick={()=>onVote(opt.modeId)}>{opt.label} ({opt.votes})</button>)}
      <p>終了まで: {Math.max(0, session.endsAtMs - Date.now())}ms</p>
    </div>
  );
}
```

#### App統合

```tsx
// App.tsx
export function App() {
  const input = useMemo(() => new InputController(), []);
  const [activeTab, setActiveTab] = useState<'fps'|'voxel'>('fps');
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<SandboxCard|null>(null);
  const [filter, setFilter] = useState<SandboxFilterCategory>('all');
  const [sort, setSort] = useState<SandboxSortKey>('totalPlays');
  const [roomSelectionOpen, setRoomSelectionOpen] = useState(false);
  const [voteSession, setVoteSession] = useState<VoteSession|null>(null);

  return (
    <main className="app">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <LeftSidebar onOpenSandbox={()=>setSandboxOpen(true)} />
      <GameCanvas input={input} />
      <RendererHud />
      <TouchControls input={input} />
      <StartOverlay />
      <SandboxModal open={sandboxOpen} cards={MOCK_CARDS} filter={filter} sort={sort} onFilterChange={setFilter} onSortChange={setSort} onSelectCard={(c)=>{setSelectedCard(c); setSandboxOpen(false);}} onClose={()=>setSandboxOpen(false)} />
      {selectedCard && <SandboxDetailPage card={selectedCard} onPlayNow={(c)=>{/* mock seek-game */}} onOpenRoomSelection={()=>setRoomSelectionOpen(true)} onBack={()=>setSelectedCard(null)} />}
      <RoomSelectionModal open={roomSelectionOpen} rooms={MOCK_ROOMS} onJoin={(r)=>{/* mock join */}} onClose={()=>setRoomSelectionOpen(false)} />
      <VoteOverlay session={voteSession} onVote={(modeId)=>{/* mock vote */}} />
    </main>
  );
}
```

### 10.4 matchmaker mock

```ts
// lib/matchmaker-mock.ts
export const MOCK_ROOMS: RoomSummary[] = [
  { roomId: 'room-1', modeId: 'voxel-ugc-bedwars-1', playerCount: 4, maxPlayers: 16, hasSpace: true },
  { roomId: 'room-2', modeId: 'voxel-ugc-bedwars-1', playerCount: 8, maxPlayers: 16, hasSpace: true },
];

export function fetchGameModes(query: SandboxQuery): SandboxCard[] {
  let result = MOCK_CARDS;
  result = filterByGenre(result, query.filter);
  result = sortByKey(result, query.sort, query.order);
  if (query.search) {
    const s = query.search.toLowerCase();
    result = result.filter(c => c.title.toLowerCase().includes(s) || c.creator.toLowerCase().includes(s));
  }
  return result;
}

export function fetchGameList(modeId: string): RoomSummary[] {
  return MOCK_ROOMS.filter(r => r.modeId===modeId && r.hasSpace);
}

export function seekGame(params: { modeId?: string; roomId?: string }): { ticket: string; url: string } {
  // mock ticket
  return { ticket: 'mock-ticket', url: 'ws://localhost:3000/ws' };
}
```

### 10.5 投票入口

- `onRoundEnd` 後に `VoteOverlay` 表示（Phase 4では手動トリガー or タイマー mock）
- 候補: `type=fps, source=official` の一覧から FFA/TDM/DOM（現行はFFAのみだが、mockでTDM/DOMも表示）
- 多数決: `VoteSession` の votesを集計、タイマー終了で winner決定
- 実装: `store/gameStore.ts` に `voteSession`、 `after`/`every` は使わず React側で `setTimeout` ではなく `requestAnimationFrame` + tick模倣 or 単純な `setInterval` mock（ゲームロジックではないので許容、将来は GameModeRuntimeの timerへ移行）

## 11. リスク・Gotchas

| リスク | 対応 |
|---|---|
| `GameModeDefinition` 拡張が後方互換を壊す | optional追加、defineGameModeではgenres/tags/display/statsが不正でもthrowせず軽量検証 or 無視、既存 tests 255 passをCIで確認 |
| GameTypeを3つに増やしたくなる | 禁止、L1分岐はfps|voxelの2つのまま |
| Header/Sidebar/Modal追加で既存 GameCanvas描画経路を壊す | App.tsxでGameCanvasを維持、Header/SidebarはDOM overlay、z-index管理、Babylon canvasのpointer eventsを邪魔しないよう CSS `pointer-events` 制御 |
| Sandboxモーダルのカード画像が無い | mockでは `/thumb/*.png` は存在しないので `onError` fallback or placeholder div、Phase 6でCDN本番化 |
| matchmaker本実装を混ぜたくなる | Phase 4ではmockのみ、本実装はPH4以降、Redis/HMACは含めない |
| 投票UIで `setTimeout` をゲームロジックに混ぜる | ゲームロジック (GameModeRuntime) では tick基準、React UI (VoteOverlay) では `setTimeout` / `setInterval` 許容（HUDなので）、将来GameMode側へ移行 |
| 外部UIライブラリを追加したくなる | 禁止、素のReact+CSSで骨組み、MUI/AntD等は要議論 |
| Coverage 85%が下がる | include-all維持、sandbox.ts / matchmaker-mock.ts / Header / Sidebar / Modal の重要branchをassertion、shallow test禁止 |
| Snapshot wire format改定を混ぜたくなる | 禁止、Phase 4では現行16B維持 |

## 12. 実績と証拠（実装後に記入）

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| `PLAT-4` | 本コミット | docs-only link check / `git diff --check` | Phase 4計画。ハブ+Sandboxモーダル骨組み+投票入口、FPS/Voxel/Sandbox 3カテゴリ、genre/tag拡張 |
| `PH4-A` | | | GameModeDefinition genres/tags/display/stats拡張 |
| `PH4-B` | | | Header FPS/Voxelタブ |
| `PH4-C` | | | Left Sidebar + Sandboxボタン |
| `PH4-D` | | | Sandboxモーダル カード+フィルタ+ソート mock |
| `PH4-E` | | | 詳細ページ + Play Now/Room Selection mock |
| `PH4-F` | | | 投票入口 + quality gate + docs更新 |


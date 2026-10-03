# Phase 4: ハブ + Sandbox モーダル + 投票システム + マッチメイカー骨組み — 改訂版

> 対応 task-list ID: `PLAT-4`, `PH4-A`〜`PH4-F` (docs/task-list.md)
> 計画書テンプレート: docs/planning/_TEMPLATE.md 準拠
> 範囲決定: 2026-09-22 改訂版「ゲームプラットフォーム 仕様定義書 (改訂版)」確定。OfficialはFPS 1ゲーム複数モード [FFA,TDM,DOM]投票 + Voxel 1モード [Survival]永続、Sandboxは標準FPS/Voxel以外の公式ゲーム + UGC、親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic。Header [FPS][Voxel]はOfficial切替、Left Sidebar [Sandbox]は公式拡張+UGC。L1 type分岐は fps|voxel の2つのまま。

## 0. Phase 4は何のフェーズですか？

**Phase 4は「ハブUI + Sandboxモーダル + 投票システム + マッチメイカー骨組み」のフェーズ**です。

- **目的**: Phase 3で分離した `gamemode-api` + `fps-ffa` 最小実装の上に、ユーザー理想のプラットフォームUI骨組みを実装する。
- **位置づけ**:
  - Phase 0: 現行コードの穴埋め (Input 16B, rate limit, backpressure等) — 完了
  - Phase 1: モノレポ + Babylon移行 — 完了
  - Phase 1.5: coverage + E2E品質ゲート — 完了
  - Phase 2: SimProfile分離 (fps先行+voxel契約だけ) — 完了
  - EM: バグ修正 + coverage 85% — 完了
  - Phase 3: gamemode API第1版 + fps-ffa最小 — 完了
  - **Phase 4: ハブ + Sandboxモーダル + 投票 + マッチメイカー骨組み (mock) — 本フェーズ**
  - Phase 5: voxel本実装 + fps追加モード (TDM/DOM) + Official FPSサブモード本実装
  - Phase 6: API再設計 + RDB永続化 (ランキング、totalPlays/activePlayers/detailViews)
  - Phase 7: チャンク本同期・AOI・スケール
  - Phase 8: UGC本実装 (QuickJS sandbox, GLBエディタ, 投稿/承認/配信)
  - Phase 9: WebTransport (条件付き)

- **Phase 4でやること (改訂版)**:
  - OfficialはFPS 1ゲーム複数モード [FFA,TDM,DOM] (投票で次決定) + Voxel 1モード [Survival]永続 (死んだらリスポーン) をハブUIで切替可能に
  - Header [FPS][Voxel]タブ: Officialゲームの切替。デフォルト Official FPS。
  - Left Sidebar [Sandbox]ボタン: Krunker風UI、押下でSandboxモーダル (公式拡張+UGC)
  - Sandboxモーダル: カード一覧 (thumbnail/title/creator/plays/desc)、親ジャンルフィルタ FPS/Voxel、サブタグフィルタ Bedwars/Zombie/Athletic、ソート totalPlays/activePlayers/detailViews (mock)
  - 詳細ページ: カードクリックで `/sandbox/{id}` 詳細、Play Now (auto-match mock)、Room Selection (manual mock)
  - 投票システム入口: Official FPSで1マッチ終了時に全プレイヤー投票で次サブモード決定 (FFA/TDM/DOM)、mock UI
  - GameModeDefinition拡張: parentGenre, genres(サブタグ), tags, display, stats, subModes, category (Official|Sandbox)
  - matchmakerはmockのみ (`lib/matchmaker-mock.ts`)、本実装 Redis/HMACはPhase 5以降

- **Phase 4でやらないこと**:
  - profile-voxel本実装、voxel terrain/physics本実装 (Phase 5以降)
  - Official FPSのTDM/DOMサブモード本実装 (Phase 5以降、Phase 4はFFAのみ + mock投票)
  - Official Voxel Survival永続の本実装 (Phase 5以降)
  - matchmaker本実装 (HTTP server, Redis, HMAC ticket本実装) — Phase 4はmockのみ
  - RDB永続化本実装 (Phase 6以降)
  - UGC/QuickJS/GLBエディタ本実装 (Phase 8)
  - Snapshot wire format改定、AOI、delta本実装

## 1. 開始前確認

- 現在のブランチ / HEAD / `git status` を確認する（未コミット変更があれば停止）
- `docs/task-list.md` で PH3-D がローカル検証済み/完了であることを確認する
- 関連仕様を読む — 改訂版
  - `AGENTS.md` §6（L1にtype分岐を書かない、決定論、ゼロアロケ、Sandbox制約、Biome境界、.agent正本）
  - `.agent/skills/index.md` から `project-overview` / `tech-stack` / `import-boundaries` / `deterministic-sim` / `zero-alloc` / `networking` / `babylon-integration`
  - `docs/arch/product.md`（2026-09-22改訂版: Official FPS 1ゲーム複数モード + Voxel 1モード永続、Sandboxは公式拡張+UGC、親ジャンル+サブタグ）
  - `docs/arch/editor.md`（改訂版: Official 1ゲーム複数モード、Sandbox公式拡張+UGC、親ジャンル+サブタグ）
  - `docs/arch/types.md`（改訂版: subModes, parentGenre, genres=サブタグ, VoteはsubMode、Voxel永続）
  - `docs/arch/architecture.md`（改訂版: Official FPS 1ゲーム複数モード + 投票、Official Voxel永続、Sandbox公式拡張+UGC）
  - `docs/arch/matchmaker.md`（改訂版: parentGenre+subTagフィルタ、Official FPS投票、Sandbox公式拡張+UGC）
  - `docs/arch/client.md`（改訂版: Header [FPS][Voxel]はOfficial切替、Sidebar [Sandbox]は公式拡張+UGC、親ジャンル+サブタグ）
  - `docs/arch/milestones.md`（Phase 4 DoD: ハブUI、Sandboxモーダル骨組み、投票入口）
  - `docs/planning/SANDBOX_FINAL_AGREED.md`（改訂版反映予定）
  - `apps/web/src/App.tsx` / `components/*`（現行HUD/StartOverlay構成）
  - `packages/gamemode-api/src/`（現行GameModeDefinition）
  - `gamemodes/fps/official/ffa/index.ts`（現行fps-official-ffa — Official FPSのFFAサブモード）
- 本計画書の §5（完了条件）と §7（停止条件）を再読する
- Phase 4 実装へ入る前に、`PLAT-4` の計画 commit が push 済みであることを確認する

## 2. 目的 (Why) — 改訂版

Phase 4 の目的は、**Phase 3で分離した gamemode API の上に、改訂版のゲーム種別・階層構造 (Official FPS 1ゲーム複数モード + Voxel 1モード永続、Sandboxは公式拡張+UGC) のハブUI骨組みを実装し、Sandboxの親ジャンル+サブタグフィルタ/ソート/参加フローとOfficial FPS投票システムの入口を作ること**。

現状（PH3-D）は:

- `fps-official-ffa` が gameserverで動き、webは単一GameCanvas + HUD + StartOverlay。Official FPSはFFAサブモードのみ、TDM/DOMは未実装、投票無し
- Official Voxel Survival永続は未実装
- ハブUI (Header [FPS][Voxel]タブ Official切替、Left Sidebar [Sandbox]ボタン 公式拡張+UGC) が無い
- Sandboxモーダル (カード一覧、親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic、ソート plays/active/views) が無い。SandboxはUGCだけでなく公式拡張も含む
- 詳細ページ Play Now (auto-match) / Room Selection (manual) フローが無い
- 投票システム (Official FPSで1マッチ終了時に全プレイヤー投票で次サブモード FFA/TDM/DOM決定) が無い
- `GameModeDefinition` に parentGenre/genres(サブタグ)/tags/display/stats/subModes/category が無い
- matchmakerは未実装 (apps/matchmaker無し)

Phase 4 完了時点では:

- `GameModeDefinition` に `parentGenre?`, `genres?` (サブタグ), `tags?`, `display?`, `stats?`, `subModes?`, `category?` (Official|Sandbox) が optional追加され、既存 ffa は後方互換で動く。Official FPSは1ゲーム複数モード、Official Voxelは1モード永続として型で表現
- `apps/web` に Header (Official FPS/Voxelタブ切替)、Left Sidebar (Krunker風、Sandboxボタン 公式拡張+UGC)、Sandboxモーダル (カード: thumbnail/title/creator/plays/desc、親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic、ソート plays/active/views、mockデータ 公式拡張+UGC)、詳細ページ (Play Now / Room Selection モーダル mock)、投票UI (Official FPSのFFA/TDM/DOM投票 mock) が実装され、既存GameCanvas経路を壊さない
- `packages/gamemode-api` に `SandboxCard`, `ParentGenre`, `SubTag`, `SandboxSortKey`, `VoteOption` (subMode) 等の型が追加
- matchmakerは依然mockだが、web側で `GET /v1/gamemodes` (category=Official|Sandbox, parentGenre, subTag) / `game-list` / `seek-game` / `official/fps/submodes` / `official/fps/vote` 相当のmock APIを `apps/web/src/lib/matchmaker-mock.ts` として提供
- 既存 quality gate維持: typecheck/lint 0 warnings/unit 37 files 255 tests+/coverage 85%/build/E2E discovery 11+/determinism
- `profile-voxel` 本実装、Official FPSのTDM/DOMサブモード本実装、Official Voxel Survival永続本実装、QuickJS、GLBエディタ本実装は含めない

## 3. 変更範囲 (Scope) — 改訂版

変更対象:

- `packages/gamemode-api/src/types.ts` 拡張 — 改訂版
  - `ParentGenre`, `SubTag`, `PlatformCategory`, `GameCategory` 型追加
  - `GameModeDefinition` に `parentGenre?: ParentGenre`, `genres?: SubTag[]` (サブタグ), `tags?: Tag[]`, `display?`, `stats?`, `subModes?: SubTag[]` (Official FPS用), `currentSubMode?: SubTag`, `category?: GameCategory` (Official|Sandbox) optional追加
  - `SandboxCard` は `parentGenre`, `genres` (サブタグ), `source` が official|ugc (公式拡張+UGC), `category=Sandbox`
  - `SandboxQuery` は `parentGenre: ParentGenreFilter`, `subTag: SubTagFilter`, `sort`, `order`, `search`
  - `VoteOption` は `subMode: SubTag` (FFA/TDM/DOM)、`VoteSession` は `gameId=fps-official`, `subMode` 投票
  - `VoxelSurvivalSpec` は `finish_game=false`, `respawn=true` 永続サバイバル
  - 後方互換: 既存 `defineGameMode` 検証は新フィールドを無視、既存 ffa テストが壊れない
- `packages/gamemode-api/src/defineGameMode.ts` 拡張
  - parentGenre/genres/tags/display/stats/subModes/category が配列/objectなら軽量検証（空配列許容、不正なら無視 or throwせず後方互換）
- `gamemodes/fps/official/ffa/index.ts` 拡張 — 改訂版
  - `parentGenre: 'fps'`, `genres: ['ffa']` (サブタグ), `tags: ['official','pvp','fps']`, `subModes: ['ffa','tdm','dom']`, `currentSubMode: 'ffa'`, `category: 'Official'`, `display: { title: 'FFA', description: 'Free For All - Official FPS subMode', creator: 'Official' }`, `stats` mock追加
  - 既存 hooks維持。Official FPSは1ゲーム複数モードで、FFAはその中の1サブモード。
- `gamemodes/fps/official/zombie/index.ts` 新規検討 (公式拡張、Sandbox表示) — Phase 4ではmock扱い、実ファイルはPhase 5以降でも可。PH4-Aでは型のみでmockデータに含める
- `gamemodes/voxel/official/survival/index.ts` 新規検討 (Official Voxel 1モード永続) — Phase 4ではmock扱い、実ファイルはPhase 5以降でも可。PH4-Aでは型のみでmockデータに含める
- `gamemodes/voxel/official/bedwars/index.ts` 新規検討 (公式拡張、Sandbox表示) — Phase 4ではmock扱い
- `apps/web/src/` 新規/拡張 — 改訂版 (親ジャンル+サブタグ、公式拡張+UGC)
  - `lib/sandbox.ts` 新規: `ParentGenre`, `SubTag`, `SandboxCard`, `ParentGenreFilter`, `SubTagFilter`, `SandboxSortKey`, `SORT_FUNCS`, `FILTER_FUNCS` (parentGenre + subTag)、mockデータ生成 (公式拡張+UGC)
  - `lib/matchmaker-mock.ts` 新規: `mockOfficialFpsSubModes: ['ffa','tdm','dom']`, `mockGameModes: SandboxCard[]` (公式拡張+UGC), `mockRooms: RoomSummary[]`, `fetchGameModes(query: category, parentGenre, subTag)`, `fetchGameList(modeId)`, `seekGame(modeId|roomId)`, `fetchOfficialFpsSubModes()`, `voteOfficialFps(subMode)`
  - `components/Header.tsx` 新規: `[Logo] [FPS] [Voxel] [Search] [User]`、[FPS]タブ 公式FPS画面、[Voxel]タブ 公式Voxel画面、active state、onTabChange
  - `components/LeftSidebar.tsx` 新規: Krunker風縦ボタン群、`[Play] [Sandbox] [Settings] [Shop]`、SandboxボタンでonOpenSandbox (公式拡張+UGC)
  - `components/SandboxModal.tsx` 新規: モーダル、カード一覧 (thumbnail/title/creator/plays/desc、creatorは Official または ユーザー名)、親ジャンルフィルタ [All][FPS][Voxel]、サブタグフィルタ [All][Bedwars][Zombie][Athletic][TDM][DOM]、ソート [Plays][Active][Views]、mockデータ 公式拡張+UGC、クリックでonSelectCard
  - `components/SandboxDetailPage.tsx` 新規: `/sandbox/{id}` 詳細、thumbnail/title/creator/plays/active/desc、[Play Now] (auto-match mock)、[ルーム選択] (RoomSelectionModalを開く)
  - `components/RoomSelectionModal.tsx` 新規: ルーム一覧モーダル、mock rooms、[Join]ボタン
  - `components/VoteOverlay.tsx` 新規: 投票UI、Official FPSで1マッチ終了時に全プレイヤー投票で次サブモード決定 (FFA/TDM/DOM)、多数決表示、タイマー、Official Voxelは投票対象外
  - `components/GameShell.tsx` 新規 or `App.tsx` 拡張: Header + LeftSidebar + GameCanvas + SandboxModal + DetailPage + VoteOverlay のレイアウト統合、state管理 (activeTab: 'fps'|'voxel' Official切替, sandboxOpen, selectedCard, voteSession subMode)
  - `App.tsx` 拡張: GameShellを導入、既存 GameCanvas/HUD/TouchControls/StartOverlayを維持、Header/Sidebar追加で既存描画経路を壊さない
  - `index.css` 拡張: Header/Sidebar/Modal/Card/Vote の最小スタイル
- `apps/web/src/store/gameStore.ts` 拡張 — 改訂版
  - `activeTab: 'fps'|'voxel'` (Official FPS/Voxel切替), `sandboxOpen: boolean`, `selectedSandboxCard: SandboxCard | null`, `sandboxParentGenre: ParentGenreFilter`, `sandboxSubTag: SubTagFilter`, `sandboxSort: SandboxSortKey`, `voteSession: VoteSession | null` (subMode投票) 等を追加
  - 既存 state維持
- `_tests_/apps/web/` 新規/拡張 — 改訂版
  - `sandbox.test.ts`: parentGenre + subTag filter/sort関数、mockデータ生成 (公式拡張+UGC)
  - `Header.test.tsx` or `LeftSidebar.test.tsx`: タブ切替 Official FPS/Voxel、Sandboxボタン押下でモーダルopen (公式拡張+UGC)
  - `SandboxModal.test.tsx`: 親ジャンル FPS/Voxelフィルタ、サブタグ Bedwars/Zombie/Athleticフィルタ、ソート plays/active/views、カード表示 thumbnail/title/creator/plays/desc (creator Official含む)
  - 既存 unit tests維持
- `docs/` / `biome.json` / `docs/task-list.md` / `docs/planning/HANDOFF.md`
  - task-listに PLAT-4 / PH4-A〜F追加 (改訂版反映)
  - HANDOFF更新（Phase 4改訂版準備、Official 1ゲーム複数モード + Voxel永続、Sandbox公式拡張+UGC、親ジャンル+サブタグ）
  - quality-gates更新

変更しない（境界外）:

- `packages/profile-voxel` 本実装、voxel terrain / chunk / block action / block delta本実装、Survival永続本実装
- `voxel-physics-engine` / `noa-engine` dependency追加
- Official FPSのTDM/DOMサブモード本実装 (Phase 5以降、Phase 4はFFAのみ + mock投票)
- Official Voxel Survival永続本実装 (Phase 5以降)
- AOI、delta snapshot、Snapshot 0x11新ヘッダ化、1200B分割本実装
- `apps/matchmaker/` 本実装 (HTTP server, Redis, HMAC ticket本実装) — Phase 4では mockのみ、本実装はPH4以降 or Phase 5
- FireAction / HitConfirm / 巻き戻しヒットスキャン本実装
- UGC / QuickJS / glTF pipeline / editor本実装、RDB永続化本実装（Phase 6以降）
- WebTransport
- Playwright browser実行をSandboxでpassと主張
- 既存 fps-ffaのsimulation / snapshot経路破壊

## 4. 禁止事項 — 改訂版

- 不明点は推測で埋めず、§7 の停止条件に従って質問する
- `docs/arch/adr.md` に反する実装をしない（権威サーバー、WSのみ、ReactはHUD/ハブのみ、3DはBabylon）
- L1 `engine-core` / `gamemode-api` に `if (type === 'fps' | 'voxel')` 分岐を増やさない（Sandboxは表示集約、L1分岐増やさない。Official FPSは1ゲーム複数モードだがL1分岐ではない）
- `gamemode-api` に `three` / `three-mesh-bvh` / `@babylonjs/*` / `profile-*` を入れない（L1純度）
- `gamemodes/*` から `@cod/gamemode-sdk` 以外をimportしない（Biome維持）
- Game TypeとContent SourceとGame Categoryを混同しない（Official/Sandboxはtypeではない、FPS 1ゲーム複数モード、Voxel 1モード永続、Sandboxは公式拡張+UGC）
- `profile-voxel` / voxel terrain / AOI / delta snapshotを「ついで」に作らない
- existing fps-ffa behaviorを壊してからまとめて直す進め方をしない。各subtaskは小さく、検証してcommit
- `SimProfile.step` / `GameModeRuntime` 配下に `Math.random` / `Date.now` / `setTimeout` を入れない（決定論、tick基準）
- hot pathで `new` / `.slice()` / `[]` / `{}` / `.map` / クロージャ生成を増やさない（zero-alloc）
- `bun test` を使わない。Vitestは `bun run test:unit` / `bun run test:coverage`
- `ws.send()` 戻り値分岐無視しない
- Snapshot wire format改定をPhase 4で混ぜない
- Sandboxモーダルの実装で外部UIライブラリ (MUI, AntD等) を新規追加しない
- Playwright browser実行をSandboxでpassと主張しない

## 5. 完了条件 (DoD) — 改訂版

### PLAT-4（本計画）の DoD

- [ ] `docs/planning/PHASE04_PLAN.md` が `_TEMPLATE.md` 準拠で作成される (改訂版反映)
- [ ] `docs/task-list.md` に `PLAT-4` と `PH4-A`〜`PH4-F` が追加され、Phase 4が「ハブ+Sandboxモーダル骨組み+投票入口 (Official FPS 1ゲーム複数モード + Voxel 1モード永続、Sandbox公式拡張+UGC、親ジャンル+サブタグ)」であることが明記される
- [ ] Official FPS 1ゲーム複数モード [FFA,TDM,DOM]投票、Official Voxel 1モード [Survival]永続、Sandboxは標準以外の公式ゲーム + UGC、親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic、Header [FPS][Voxel]はOfficial切替、Left Sidebar [Sandbox]は公式拡張+UGC、Sandboxモーダル カード/親ジャンル+サブタグフィルタ/ソート、詳細ページ Play Now/Room Selection、投票システム入口が計画書・arch・task-listに明記される
- [ ] L1 type分岐は fps|voxelの2つのまま、Sandboxは公式拡張+UGC表示集約であることが明記される
- [ ] docs-onlyの整合確認（リンクチェック / `git diff --check`）がpassする
- [ ] commit / push 済み

### Phase 4 全体の DoD — 改訂版

- [ ] `packages/gamemode-api` に `parentGenre?`, `genres?` (サブタグ), `tags?`, `display?`, `stats?`, `subModes?`, `category?` が optional追加され、既存 `fps-official-ffa` が後方互換で動く（既存 tests 255 pass維持）。Official FPSは1ゲーム複数モード、Official Voxelは1モード永続として型で表現
- [ ] `gamemodes/fps/official/ffa` に `parentGenre`, `genres` (サブタグ), `tags`, `subModes`, `category` が追加され、mock値でSandboxカード表示可能。Official FPS 1ゲーム複数モードのFFAサブモードとして
- [ ] `apps/web` に Header (Official FPS/Voxelタブ切替)、LeftSidebar (Krunker風、Sandboxボタン 公式拡張+UGC)、SandboxModal (カード一覧、親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic、ソート plays/active/views、mock 公式拡張+UGC)、SandboxDetailPage (Play Now auto-match mock、Room Selection modal)、VoteOverlay (Official FPSのFFA/TDM/DOM投票 mock、Voxelは投票対象外) が実装され、既存 GameCanvas経路を壊さない
- [ ] `apps/web/src/lib/sandbox.ts` に parentGenre + subTag filter/sort関数があり、Bedwars/Zombie/Athleticフィルタ、plays/active/viewsソートのunit testがある。Sandboxは公式拡張+UGCの両方を含む
- [ ] `apps/web/src/lib/matchmaker-mock.ts` に mock APIがあり、Official FPSサブモード投票、Play Now / Room Selectionフローがmockで動く
- [ ] `apps/web/src/store/gameStore.ts` に activeTab (Official FPS/Voxel切替)、sandboxOpen、selectedCard、parentGenre/subTag filter/sort、voteSession (subMode投票) stateが追加
- [ ] 既存 quality gate維持: `typecheck` / `lint` 0 warnings / `test:unit` 37 files 255 tests以上 / `test:coverage` 85/85/85/85以上 / `build` / `test:e2e -- --list` 11以上 / `check:determinism` / `check:determinism:heavy` pass
- [ ] `engine-core` から `profile-fps` / `profile-voxel` へのimportがBiomeで引き続き禁止 (0 violations)
- [ ] `gamemodes/*` → `@cod/gamemode-sdk` のみ制限が維持される
- [ ] `docs/arch/product.md`, `editor.md`, `types.md`, `matchmaker.md`, `client.md`, `architecture.md` が本計画改訂版と整合
- [ ] `docs/task-list.md` / `docs/planning/HANDOFF.md` / `docs/ops/quality-gates.md` が更新される
- [ ] `.agent/logs/` に Phase 4ログが追加される

## 6. テスト方法 — 改訂版

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit (vitest) | `bun run test:unit` | 既存255 tests維持 + Official FPS 1ゲーム複数モード subModes [FFA,TDM,DOM] / Official Voxel 1モード Survival永続 / parentGenre FPS/Voxel filter + subTag Bedwars/Zombie/Athletic filter / sort plays/active/views / mockデータ生成 公式拡張+UGC / Header Official FPS/Voxel tab切替 / Sidebar Sandboxボタン 公式拡張+UGC / SandboxModal card表示 Official含む / VoteOverlay subMode投票 / GameStore state |
| Coverage | `bun run test:coverage` | thresholds 85/85/85/85を下回らない。sandbox.ts / matchmaker-mock.ts / Header / Sidebar / Modal の重要branchをassertion。include-all維持 |
| Typecheck | `bun run typecheck` | client/server TS strict + workspace exports（gamemode-api拡張含む）が通る |
| Lint | `bunx biome lint .` | engine-core→profile-*禁止、gamemodes/*→gamemode-sdkのみ、WebSocket global禁止、Biome warnings 0 |
| Build | `bun run build` | packages（gamemode-api拡張含む）とappsがproduction build。Vite chunk-size warningは既知 |
| E2E discovery | `bun run test:e2e -- --list` | 11 tests以上 discovery。browser実行はSandboxでは行わない |
| Determinism | `bun run check:determinism` + `scripts/determinism-heavy.ts` | SimProfile.step + GameModeRuntimeに禁止API混入なし、heavy pass |
| 構造監査 | `grep -R "profile-fps\\|profile-voxel" packages/engine-core --include="*.ts"` 0件 / `grep -R "from '@cod/profile" packages/gamemode-api --include="*.ts"` 0件 / `grep -R "from.*gamemode" gamemodes --include="*.ts" \\| grep -v "gamemode-sdk"` 0件 | L1純度維持 |
| 実環境 | CIまたは実機で `bun run test:e2e` | Browser E2Eは実環境検証待ち。Sandboxモーダル/投票UIの手動確認は実環境で |

## 7. 停止条件 — 改訂版

次の場合は作業を停止し、変更せず報告する:

- 仕様書（計画書・arch・AGENTS.md・skills）同士に矛盾がある（特に product.md / editor.md / types.md の Official FPS 1ゲーム複数モード + Voxel 1モード永続 + Sandbox公式拡張+UGC 定義と本計画の実装範囲が衝突）
- L1 `engine-core` / `gamemode-api` に type分岐 `if (type === 'fps' | 'voxel')` を書かないと進められない設計になった
- `gamemode-api` が `profile-fps` / `three` / `three-mesh-bvh` / `@babylonjs/*` に依存しないと進められない設計になった（L1純度違反）
- Snapshot wire format改定、AOI、delta snapshot、1200B分割、巻き戻しヒットスキャン本実装が必要になる
- matchmaker本実装 (HTTP server, Redis, HMAC ticket本実装) が必要になる（Phase 4ではmockのみ）
- `profile-voxel` / voxel terrain本実装、Survival永続本実装が必要になる（Phase 5以降）
- Official FPSのTDM/DOMサブモード本実装が必要になる（Phase 5以降）
- 既存 coverage threshold 85%を下げないと進められない
- `defineGameMode` の parentGenre/genres/tags/display/stats/subModes/category 追加が後方互換を壊し、既存 ffa testsが大量に落ちる
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
7. 必要な知見を `.agent/skills/` に同期する（sandbox hub / voting / Official 1ゲーム複数モード + Voxel永続 + Sandbox公式拡張+UGC）
8. タスクIDを含むConventional Commitでcommitする
9. `git push origin <session-branch>` でセッション固定ブランチへpushする
10. 完了報告では、Playwright browser実行はSandbox未実行であることを明記し、Sandboxモーダル/投票UIのmock性質を明示する

## 9. サブタスク分割 — 改訂版

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| `PLAT-4` | Phase 4計画作成（ハブ+Sandboxモーダル骨組み+投票入口）改訂版 | `docs/planning/PHASE04_PLAN.md` 改訂版、task-listにPLAT-4/PH4-A〜F追加、Official FPS 1ゲーム複数モード + Voxel 1モード永続 + Sandbox公式拡張+UGC + 親ジャンル+サブタグ明記 | `PH3-D` |
| `PH4-A` | `GameModeDefinition` 親ジャンル+サブタグ+表示/統計+subModes拡張 | `packages/gamemode-api/src/types.ts`拡張 (parentGenre, genres=サブタグ, subModes, category)、`defineGameMode.ts`拡張、`gamemodes/fps/official/ffa`拡張 (Official FPSのFFAサブモード)、後方互換維持 | `PLAT-4` |
| `PH4-B` | ハブUI Header Official FPS/Voxelタブ切替 | `apps/web/src/components/Header.tsx`新規 (Official FPS/Voxel切替)、`store/gameStore.ts` activeTab追加、`App.tsx`統合、unit tests | `PH4-A` |
| `PH4-C` | Left Sidebar Krunker風 + Sandboxボタン (公式拡張+UGC) | `apps/web/src/components/LeftSidebar.tsx`新規、Sandboxボタンでモーダルopen (公式拡張+UGC)、GameStore sandboxOpen、App統合、unit tests | `PH4-B` |
| `PH4-D` | Sandboxモーダル 親ジャンル+サブタグフィルタ+ソート (mock 公式拡張+UGC) | `lib/sandbox.ts`新規 (parentGenre+subTag filter/sort)、`lib/matchmaker-mock.ts`新規 (mockGameModes 公式拡張+UGC)、`components/SandboxModal.tsx`新規 (カード thumbnail/title/creator/plays/desc、親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic、ソート plays/active/views)、GameStore filter/sort、unit tests | `PH4-C` |
| `PH4-E` | 詳細ページ + Play Now / Room Selectionモーダル (mock) | `components/SandboxDetailPage.tsx`新規、 `components/RoomSelectionModal.tsx`新規、 `lib/matchmaker-mock.ts`拡張 (mockRooms, fetchGameList, seekGame)、Play Now auto-match mock、Room Selection manual mock、unit tests | `PH4-D` |
| `PH4-F` | 投票システム入口 (Official FPS 1ゲーム複数モード mock) | `components/VoteOverlay.tsx`新規 (Official FPSのFFA/TDM/DOM投票、Voxelは投票対象外)、`store/gameStore.ts` voteSession追加 (subMode投票)、`lib/sandbox.ts` Vote型 (subMode)、onRoundEnd mockで投票UI表示、FFA/TDM/DOM候補、多数決、tick基準タイマー、unit tests、最終quality gate、task-list/HANDOFF/quality-gates更新 | `PH4-E` |

## 10. 設計詳細・仕様 — 改訂版

### 10.1 ゲーム種別・階層構造 — 改訂版

```
Official (公式ゲーム) — 運営が公式に提供するゲーム群
  FPS: 1つのゲームに複数モード [FFA,TDM,DOM,etc.] — 投票で次ルール決定
    /fps/official (1ゲーム) subModes: ffa, tdm, dom
    RoomState: waiting -> countdown -> playing(ffa) -> ended -> voting -> playing(tdm)
  Voxel: 1モードのみ [Survival] — 永続サバイバル、死んだらリスポーン
    /voxel/official/survival (1モード永続) finish_game無し

Sandbox — 標準FPS/Voxel以外の公式ゲーム + UGC (親ジャンル FPS/Voxel + サブタグ)
  FPS: examples [TDM,DOM,Zombie,etc.] (公式拡張 + UGC)
  Voxel: examples [Bedwars,Athletic,etc.] (公式拡張 + UGC)
```

- Official FPSは1ゲーム複数モード、Official Voxelは1モード永続、Sandboxは標準以外の公式+UGC。
- L1 type分岐は fps|voxel の2つのまま。Official/Sandboxは表示上の種別。

### 10.2 `gamemode-api` 拡張 — 改訂版

```ts
export type ParentGenre = 'fps' | 'voxel'; // 親ジャンル: FPS / Voxel
export type SubTag = 'ffa' | 'tdm' | 'dom' | 'zombie' | 'bedwars' | 'athletic' | 'survival' | string;
export type Tag = 'official' | 'ugc' | 'fps' | 'voxel' | 'pvp' | 'pve' | string;
export type GameCategory = 'Official' | 'Sandbox'; // OfficialはFPS 1ゲーム複数モード + Voxel 1モード永続、Sandboxは公式拡張+UGC

export interface GameModeDefinition {
  id: string; // fps-official (本体), fps-official-ffa (FFAサブモード), voxel-official-survival
  type: GameType; // fps | voxel
  source: ContentSource; // official | ugc。Sandboxは両方含む
  slug: string;
  minPlayers: number; maxPlayers: number; world: ...
  subModes?: SubTag[]; // Official FPSのみ: [FFA,TDM,DOM]
  currentSubMode?: SubTag;
  parentGenre?: ParentGenre; // 親ジャンル: FPS / Voxel
  genres?: SubTag[]; // サブタグ: Bedwars/Zombie/Athletic等
  tags?: Tag[];
  display?: { title, description, thumbnail, creator, creatorId };
  stats?: { totalPlays, activePlayers, detailViews };
  category?: GameCategory; // Official | Sandbox
}

export interface SandboxCard {
  id: string; type: GameType; source: ContentSource; // official (公式拡張) | ugc
  slug: string; parentGenre: ParentGenre; genres: SubTag[]; tags: Tag[];
  title: string; creator: string; // Official または ユーザー名
  thumbnail: string; totalPlays: number; activePlayers: number; detailViews: number; description: string;
  category: 'Sandbox';
}

export type ParentGenreFilter = 'all' | ParentGenre;
export type SubTagFilter = 'all' | SubTag;
export type SandboxSortKey = 'totalPlays' | 'activePlayers' | 'detailViews';

export interface VoteOption {
  subMode: SubTag; // ffa, tdm, dom
  label: string; votes: number;
}

export interface VoteSession {
  roomId: string; gameId: string; // fps-official
  options: VoteOption[]; // 同一FPSゲーム内のサブモード一覧
  endsAtMs: number; voters: Set<string>;
}
```

### 10.3 `gamemodes/fps/official/ffa` 拡張 — 改訂版

```ts
export default defineGameMode({
  id: 'fps-official-ffa', // Official FPSのFFAサブモード。将来 fps-official 本体が subModes を持つ
  type: 'fps',
  source: 'official',
  slug: 'ffa',
  minPlayers: 2, maxPlayers: 16,
  world: { map: 'static-arena' },
  parentGenre: 'fps',
  genres: ['ffa'], // サブタグ
  tags: ['official','pvp','fps'],
  subModes: ['ffa','tdm','dom'], // Official FPSは1ゲーム複数モード
  currentSubMode: 'ffa',
  category: 'Official',
  display: { title: 'FFA', description: 'Free For All - Official FPS subMode', thumbnail: '/thumbnails/ffa.png', creator: 'Official' },
  stats: { totalPlays: 1234, activePlayers: 12, detailViews: 567 },
});
```

- Official FPSは1ゲーム複数モード、FFAはその中の1サブモード。
- Official Voxelは1モードのみ Survival永続。

### 10.4 `apps/web` ハブUI — 改訂版

#### Header (Officialゲームの切替)

```tsx
// Header: [FPS]タブ 公式FPS画面、[Voxel]タブ 公式Voxel画面
export function Header({ activeTab, onTabChange }: { activeTab: 'fps'|'voxel', onTabChange: (t: 'fps'|'voxel')=>void }) {
  return (
    <header className="hub-header">
      <div className="logo">COD-WEB</div>
      <nav>
        <button className={activeTab==='fps'?'active':''} onClick={()=>onTabChange('fps')}>FPS — Official 1ゲーム複数モード</button>
        <button className={activeTab==='voxel'?'active':''} onClick={()=>onTabChange('voxel')}>Voxel — Survival永続</button>
      </nav>
    </header>
  );
}
```

#### LeftSidebar (Sandboxは公式拡張+UGC)

```tsx
export function LeftSidebar({ onOpenSandbox }: { onOpenSandbox: ()=>void }) {
  return (
    <aside className="left-sidebar krunker-style">
      <button>Play (Official FPS)</button>
      <button onClick={onOpenSandbox}>Sandbox (公式拡張+UGC)</button>
      <button>Settings</button>
    </aside>
  );
}
```

#### Sandbox lib (親ジャンル+サブタグ、公式拡張+UGC)

```ts
export function filterByParentGenre(cards: SandboxCard[], parent: ParentGenreFilter): SandboxCard[] {
  if (parent==='all') return cards;
  return cards.filter(c => c.parentGenre===parent);
}
export function filterBySubTag(cards: SandboxCard[], subTag: SubTagFilter): SandboxCard[] {
  if (subTag==='all') return cards;
  return cards.filter(c => c.genres.includes(subTag));
}
export function sortByKey(cards: SandboxCard[], key: SandboxSortKey, order='desc'): SandboxCard[] {
  return [...cards].sort((a,b) => order==='desc' ? b[key]-a[key] : a[key]-b[key]);
}

export const MOCK_CARDS: SandboxCard[] = [
  { id: 'fps-official-zombie', type: 'fps', source: 'official', slug: 'zombie', parentGenre: 'fps', genres: ['zombie'], tags: ['official','zombie','pve'], title: 'Zombie (Official拡張)', creator: 'Official', thumbnail: '/thumb/zombie.png', totalPlays: 5432, activePlayers: 8, detailViews: 1234, description: 'Official Zombie...', category: 'Sandbox' },
  { id: 'voxel-official-bedwars', type: 'voxel', source: 'official', slug: 'bedwars', parentGenre: 'voxel', genres: ['bedwars'], tags: ['official','bedwars','pvp'], title: 'Bedwars (Official拡張)', creator: 'Official', thumbnail: '/thumb/bedwars.png', totalPlays: 10234, activePlayers: 12, detailViews: 3456, description: 'Official Bedwars...', category: 'Sandbox' },
  { id: 'fps-ugc-zombie-1', type: 'fps', source: 'ugc', slug: 'zombie', parentGenre: 'fps', genres: ['zombie'], tags: ['ugc','zombie','pve'], title: 'Zombie Survival UGC', creator: 'Zombiemaster', thumbnail: '/thumb/zombie-ugc.png', totalPlays: 3210, activePlayers: 5, detailViews: 890, description: 'UGC Zombie...', category: 'Sandbox' },
  { id: 'voxel-ugc-athletic-1', type: 'voxel', source: 'ugc', slug: 'athletic', parentGenre: 'voxel', genres: ['athletic'], tags: ['ugc','athletic','parkour'], title: 'Athletic Parkour UGC', creator: 'ParkourKing', thumbnail: '/thumb/athletic.png', totalPlays: 2100, activePlayers: 3, detailViews: 567, description: 'UGC Athletic...', category: 'Sandbox' },
];
```

#### SandboxModal (親ジャンル+サブタグ、公式拡張+UGC)

```tsx
export function SandboxModal({ open, cards, parentGenre, subTag, sort, onParentChange, onSubTagChange, onSortChange, onSelectCard, onClose }: Props) {
  const filtered = filterBySubTag(filterByParentGenre(cards, parentGenre), subTag);
  const sorted = sortByKey(filtered, sort, 'desc');
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="sandbox-modal">
        <header>Sandbox (公式拡張+UGC) <button onClick={onClose}>X</button></header>
        <div className="filters">
          Parent: {['all','fps','voxel'].map(p => <button key={p} className={parentGenre===p?'active':''} onClick={()=>onParentChange(p)}>{p}</button>)}
          SubTag: {['all','bedwars','zombie','athletic','tdm','dom'].map(t => <button key={t} className={subTag===t?'active':''} onClick={()=>onSubTagChange(t)}>{t}</button>)}
        </div>
        <div className="sort">
          <select value={sort} onChange={e=>onSortChange(e.target.value)}>
            <option value="totalPlays">累計プレイ数</option>
            <option value="activePlayers">現在のプレイ人数</option>
            <option value="detailViews">詳細ページ閲覧数</option>
          </select>
        </div>
        <div className="card-grid">
          {sorted.map(card => (
            <div key={card.id} className="sandbox-card" onClick={()=>onSelectCard(card)}>
              <img src={card.thumbnail} alt={card.title} />
              <h3>{card.title}</h3>
              <p>Creator: {card.creator} (Officialまたはユーザー)</p>
              <p>Plays: {card.totalPlays} Active: {card.activePlayers}</p>
              <p>{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

#### VoteOverlay (Official FPS 1ゲーム複数モード)

```tsx
export function VoteOverlay({ session, onVote }: { session: VoteSession | null, onVote: (subMode:string)=>void }) {
  if (!session) return null;
  return (
    <div className="vote-overlay">
      <h2>次のモードを投票 — Official FPS 1ゲーム複数モード</h2>
      <p>Official Voxelは投票対象外 (Survival永続)</p>
      {session.options.map(opt => <button key={opt.subMode} onClick={()=>onVote(opt.subMode)}>{opt.label} ({opt.votes}) — {opt.subMode}</button>)}
    </div>
  );
}
```

### 10.5 投票入口 — 改訂版 (Official FPS 1ゲーム複数モード)

- `onRoundEnd` 後に `VoteOverlay` 表示（Phase 4では手動トリガー or タイマー mock）
- 候補: 同一FPS公式ゲーム内のサブモード [FFA,TDM,DOM] (Official FPS 1ゲーム複数モード)
- 多数決: `VoteSession` の votesを集計、タイマー終了で winnerSubMode決定、次サブモードで新ラウンド
- Official Voxelは投票対象外、永続サバイバル
- 実装: `store/gameStore.ts` に `voteSession` (subMode投票)

## 11. リスク・Gotchas — 改訂版

| リスク | 対応 |
|---|---|
| `GameModeDefinition` 拡張が後方互換を壊す | optional追加、軽量検証、既存 tests 255 passをCIで確認 |
| Official FPSは1ゲーム複数モードという理解が `fps-official-ffa` 単一実装と衝突 | Phase 3の `fps-official-ffa` はFFAサブモード最小実装、Phase 4で `fps-official` 本体が subModes を持つ設計へ。後方互換維持、FFAはその中の1つ |
| Official Voxelは1モード永続という理解が bedwars等と衝突 | Official Voxelは Survival永続のみ、Bedwars等は公式拡張としてSandboxへ。product.md/editor.mdで明確化 |
| SandboxはUGCだけでなく公式拡張も含むという理解が source=ugcのみと衝突 | Sandboxは `source=official|ugc` かつ標準FPS/Voxel以外。category=Sandboxで集約。matchmakerで `category=Sandbox` クエリ |
| Header/Sidebar/Modal追加で既存 GameCanvas描画経路を壊す | GameCanvas維持、DOM overlay、z-index管理 |
| 親ジャンル+サブタグフィルタの複雑化 | parentGenre (fps/voxel) + subTag (bedwars/zombie/athletic) の2層フィルタ、mockで動作確認 |
| Coverage 85%が下がる | include-all維持、重要branchをassertion |

## 12. 実績と証拠（実装後に記入）

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| `PLAT-4` | 本コミット改訂版 | docs-only link check / `git diff --check` | Phase 4計画改訂版。Official FPS 1ゲーム複数モード + Voxel 1モード永続 + Sandbox公式拡張+UGC + 親ジャンル+サブタグ |
| `PH4-A` | | | GameModeDefinition 親ジャンル+サブタグ+subModes拡張 |
| `PH4-B` | | | Header Official FPS/Voxelタブ |
| `PH4-C` | | | Left Sidebar + Sandboxボタン (公式拡張+UGC) |
| `PH4-D` | | | Sandboxモーダル 親ジャンル+サブタグフィルタ+ソート mock 公式拡張+UGC |
| `PH4-E` | | | 詳細ページ + Play Now/Room Selection mock |
| `PH4-F` | | | 投票入口 Official FPS 1ゲーム複数モード + quality gate |

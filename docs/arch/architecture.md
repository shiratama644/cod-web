# レイヤーとリポジトリ — 改訂版 (Official 1ゲーム複数モード、Sandbox公式拡張+UGC)

## 層 — 改訂版

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
  /fps/official/zombie, /voxel/official/bedwars, /fps/ugc/*, /voxel/ugc/*
  表示: /sandbox, /sandbox?parent=fps&tag=zombie, /sandbox/{id}
  カード: thumbnail/title/creator/plays/desc、親ジャンル+サブタグフィルタ、ソート plays/active/views
  参加: Play Now (auto-match) / Room Selection (manual)

L3  ゲームモード / コンテンツ層
    Official FPS: /fps/official (1ゲーム複数モード ffa/tdm/dom, 投票)
    Official Voxel: /voxel/official/survival (1モード永続)
    Sandbox: /fps/official/zombie (公式拡張), /voxel/official/bedwars (公式拡張), /fps/ugc/*, /voxel/ugc/* (UGC)
    → GameModeDefinition を export。Official FPSは subModes を持ち、Sandboxは parentGenre + genres(サブタグ)

L2  Sim Profile 層  ★ここだけがタイプごとに分岐
    VoxelProfile          FpsProfile
    チャンク / voxel-physics   静的マップ+BVH / カプセル
    i32 座標 / 20-30Hz         i16 座標 / 60Hz
    Voxel Survivalは永続、finish_game無し

L1  エンジンコア  ★タイプ非依存
    Room / TickScheduler / PlayerRegistry / InputQueue
    GameModeRuntime / RateLimiter / ctx 実装 / Voting (Official FPSのサブモード投票)

L0  プラットフォーム  ★タイプ非依存
    framing / Transport / 認証 / 座席予約
    マッチメイカー / Redis / ハブUI (Header [FPS][Voxel]はOfficial切替, Left Sidebar [Sandbox]は公式拡張+UGC) / プロフィール / チャット
```

**依存は常に下向き。** L2 は L1 を知ってよいが、L1 は L2 をインターフェース経由でのみ呼ぶ。L0 は L2 の存在を知らない。

`official` / `ugc` は type ではなく Content Source。3 種類目の type として扱わない。**Official FPSは1ゲーム複数モード、Official Voxelは1モード永続、Sandboxは標準以外の公式+UGC**。将来 3 つ目の本当の type（例: `racing`）を足すときに触るのは L2 と L3 だけ。L0/L1 は無変更。

> 注: 過去の議論で `boxel` と記載があった箇所は `voxel` のタイポ。`voxel` に訂正済み。エイリアス機能としては扱わない。

実装中に「L1 に `if (type === 'voxel')` を書きたくなった」ら、L1/L2 の境界を見直す。

## リポジトリ（Bun workspaces モノレポ）— 改訂版

目標構成（理想）と現行実装（PH3-D時点）。

### 現行（PH3-D時点、実装済み）

```
/
├ package.json                    # workspaces ["apps/*","packages/*"]
├ packages/
│  ├ protocol/                    # @cod/protocol 実装済み
│  ├ engine-core/                 # @cod/engine-core 実装済み (gamemode含む)
│  ├ profile-fps/                 # @cod/profile-fps 実装済み
│  ├ gamemode-api/                # @cod/gamemode-api 実装済み PH3-A
│  └ gamemode-sdk/                # @cod/gamemode-sdk 実装済み PH3-A facade
├ apps/
│  ├ gameserver/                  # @cod/gameserver 実装済み (profile+gamemode注入)
│  └ web/                         # @cod/web 実装済み (src/game/babylon, net, input, components)
├ gamemodes/
│  ├ fps/official/ffa/            # fps-official-ffa 実装済み PH3-C (Official FPSのFFAサブモード)
│  └ fps/official/pvp/            # pvp alias (ffa re-export)
├ _tests_/                        # ミラー配置 実装済み
└ e2e/                            # Playwright 実装済み
```

### 理想（改訂版: Official 1ゲーム複数モード + Sandbox公式拡張+UGC）

```
/
├ package.json                    # workspaces
├ tsconfig.base.json
├ biome.json
├ packages/
│  ├ protocol/                    # L0: バイト定義・量子化・パッカー
│  ├ engine-core/                 # L1: Room基盤 + GameModeRuntime + Voting
│  ├ profile-voxel/               # L2 (将来、Survival永続)
│  ├ profile-fps/                 # L2 (Official FPS 1ゲーム複数モード)
│  ├ gamemode-api/                # L1 core (genres/tags/parentGenre/subModes拡張はPH4)
│  ├ gamemode-sdk/                # L3 が import する唯一のパッケージ
│  └ shared-types/
├ apps/
│  ├ matchmaker/                  # L0 HTTP (mockはPH4、本実装はPH5以降)
│  │  ├ Official FPS: /v1/official/fps/submodes, /v1/official/fps/vote
│  │  ├ Official Voxel: /v1/gamemodes?category=Official&type=voxel
│  │  └ Sandbox: /v1/gamemodes?category=Sandbox&parentGenre=fps&subTag=zombie
│  ├ gameserver/                  # L0+L1+L2 Bun WS
│  └ web/                         # PH4: Header/Sidebar/Sandboxモーダル/詳細/投票
│     ├ components/Header.tsx     # PH4-B: [FPS][Voxel]はOfficial切替
│     ├ components/LeftSidebar.tsx # PH4-C: [Sandbox]は公式拡張+UGC
│     ├ components/SandboxModal.tsx # PH4-D: 親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic
│     ├ components/SandboxDetailPage.tsx # PH4-E: Play Now / Room Selection
│     ├ components/RoomSelectionModal.tsx # PH4-E
│     ├ components/VoteOverlay.tsx # PH4-F: Official FPSのFFA/TDM/DOM投票
│     ├ lib/sandbox.ts            # PH4-D: parentGenre + subTag filter/sort
│     ├ lib/matchmaker-mock.ts    # PH4-D/E: mock Official + Sandbox
│     └ store/gameStore.ts        # PH4: activeTab, sandboxOpen, voteSession(subMode)
└ gamemodes/
   ├ fps/
   │  ├ official/                 # Official FPS: 1ゲーム複数モード
   │  │  ├ index.ts               # fps-official 本体、subModes [ffa,tdm,dom], voting
   │  │  ├ ffa/                   # FFAサブモード (現行実装)
   │  │  ├ tdm/                   # TDMサブモード (将来)
   │  │  ├ dom/                   # DOMサブモード (将来)
   │  │  └ zombie/                # 公式拡張: Zombie (Sandbox表示、Officialだが標準以外)
   │  └ ugc/                      # Sandbox UGC FPS
   │     ├ zombie/
   │     └ athletic/
   └ voxel/
      ├ official/
      │  ├ survival/              # Official Voxel: 1モードのみ Survival永続
      │  └ bedwars/               # 公式拡張: Bedwars (Sandbox表示)
      └ ugc/                      # Sandbox UGC Voxel
         ├ bedwars/
         └ athletic/
   # Official: Header [FPS][Voxel]タブ切替、FPSは1ゲーム複数モード投票、Voxelは永続Survival
   # Sandbox: Left Sidebar [Sandbox]ボタン → モーダル /sandbox (公式拡張+UGC、親ジャンル+サブタグフィルタ)
```

## 依存規則（Biome `linter.rules.style.noRestrictedImports` / `noRestrictedGlobals` で強制）

### 理想

```
gamemodes/*         → gamemode-sdk のみ（他は禁止）
packages/profile-*  → protocol, engine-core, shared-types
packages/engine-core → protocol, shared-types（profile-* は禁止）
packages/protocol   → shared-types のみ
apps/gameserver     → 全部
apps/web/hub        → shared-types のみ（Babylon 禁止）
apps/web/client-*   → protocol, net, 対応する profile-*
```

`gamemodes/*` の制限は、UGC 移行時のサンドボックス境界になる。

### 現行（PH3-D時点でBiomeで強制済み）

- `packages/protocol` → `@cod/engine-core`, `@cod/profile-fps`, `@cod/gameserver`, `@cod/web` 禁止
- `packages/engine-core` → `@cod/profile-fps`, `@cod/gameserver`, `@cod/web`, `three`, `three-mesh-bvh`, `@react-three/fiber` 禁止
- `packages/profile-fps` → `@cod/gameserver`, `@cod/web` 禁止
- `packages/gamemode-api` → `@cod/profile-fps`, `@cod/profile-voxel`, `@cod/gameserver`, `@cod/web`, `three`, `three-mesh-bvh`, `@babylonjs/*` 禁止 (L1純度)
- `packages/gamemode-sdk` → `@cod/profile-fps`, `@cod/profile-voxel`, `@cod/gameserver`, `@cod/web`, `three`, `three-mesh-bvh` 禁止 (facade)
- `gamemodes/*` → `@cod/gamemode-sdk` のみ許可 (PH3-Dで追加)
- `apps/web` → `@cod/engine-core`, `@cod/gameserver` 禁止 + `WebSocket` global 禁止（`apps/web/src/game/net/websocket.ts` のみ許可）

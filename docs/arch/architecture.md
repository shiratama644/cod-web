# レイヤーとリポジトリ

## 層

```
L3  ゲームモード / コンテンツ層
    /fps/official/pvp /fps/official/zombie /fps/ugc/athletic
    /voxel/official/survival /voxel/official/bedwars /voxel/ugc/athletic ...
    → GameModeDefinition を export するだけ。所属 type と source を宣言する

L2  Sim Profile 層  ★ここだけがタイプごとに分岐
    VoxelProfile          FpsProfile
    チャンク / voxel-physics   静的マップ+BVH / カプセル
    i32 座標 / 20-30Hz         i16 座標 / 60Hz

L1  エンジンコア  ★タイプ非依存
    Room / TickScheduler / PlayerRegistry / InputQueue
    GameModeRuntime / RateLimiter / ctx 実装

L0  プラットフォーム  ★タイプ非依存
    framing / Transport / 認証 / 座席予約
    マッチメイカー / Redis / ハブUI / プロフィール / チャット
```

**依存は常に下向き。** L2 は L1 を知ってよいが、L1 は L2 をインターフェース経由でのみ呼ぶ。L0 は L2 の存在を知らない。

`official` / `ugc` は type ではなく Content Source。3 種類目の type として扱わない。将来 3 つ目の本当の type（例: `racing`）を足すときに触るのは L2 と L3 だけ。L0/L1 は無変更。**この性質が保たれているかが設計の判定基準。**

実装中に「L1 に `if (type === 'voxel')` を書きたくなった」ら、L1/L2 の境界を見直す。

## リポジトリ（Bun workspaces モノレポ）

目標構成（理想）と現行実装（PH1-F時点）。

### 現行（PH1-F時点、実装済み）

```
/
├ package.json                    # workspaces ["apps/*","packages/*"]
├ packages/
│  ├ protocol/                    # @cod/protocol 実装済み
│  ├ engine-core/                 # @cod/engine-core 実装済み
│  └ profile-fps/                 # @cod/profile-fps 実装済み
├ apps/
│  ├ gameserver/                  # @cod/gameserver 実装済み
│  └ web/                         # @cod/web 実装済み (src/game/babylon, net, input, components)
├ _tests_/                        # ミラー配置 実装済み
└ e2e/                            # Playwright 実装済み
```

### 理想（未実装はPH2以降、task-list参照）

```
/
├ package.json                    # workspaces
├ tsconfig.base.json
├ biome.json
├ packages/
│  ├ protocol/                    # L0: バイト定義・量子化・パッカー（PH1: @cod/protocol）
│  ├ engine-core/                 # L1: Room 基盤。SimProfile.ts のみ L2 境界（PH1: @cod/engine-core）
│  ├ profile-voxel/               # L2
│  ├ profile-fps/                 # L2（PH1: @cod/profile-fps）
│  ├ gamemode-sdk/                # L3 が import する唯一のパッケージ
│  └ shared-types/
├ apps/
│  ├ matchmaker/                  # L0 HTTP
│  ├ gameserver/                  # L0+L1+L2 Bun WS（PH1: @cod/gameserver）
│  └ web/                         # PH1: @cod/web
│     ├ hub/                      # React。初期バンドル。Babylon 禁止
│     ├ shell/
│     ├ net/                      # タイプ非依存ネットコード
│     ├ client-voxel/             # 動的 import
│     └ client-fps/               # 動的 import
└ gamemodes/
   ├ fps/
   │  ├ official/pvp/
   │  ├ official/zombie/
   │  └ ugc/                 # 投稿物はDB/CDNが正。repo 内は fixtures / runtime adapter のみ
   └ voxel/
      ├ official/survival/
      ├ official/bedwars/
      └ ugc/
```

`packages/protocol` の中は `common/` / `voxel/` / `fps/` にパケットを分ける。PH1-A の内部 package 名は `@cod/protocol`, `@cod/engine-core`, `@cod/profile-fps`, `@cod/gameserver`, `@cod/web`。`engine-core` の `profile/SimProfile.ts` が L2 の実装契約。エディタとコンテンツ階層は [`editor.md`](./editor.md)。

未実装: `profile-voxel/`, `gamemode-sdk/`, `shared-types/`, `apps/matchmaker/`, `gamemodes/` は理想構成。PH2ではfps先行、voxelは契約のみ。matchmakerはPH4以降（`docs/task-list.md`参照）。

## 依存規則（Biome `linter.rules.style.noRestrictedImports` / `noRestrictedGlobals` で強制）

### 理想（全てをBiomeで強制したい）

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

### 現行（PH1-F時点でBiomeで強制済み）

- `packages/protocol` → `@cod/engine-core`, `@cod/profile-fps`, `@cod/gameserver`, `@cod/web` 禁止（`biome.json`）
- `packages/engine-core` → `@cod/profile-fps`, `@cod/gameserver`, `@cod/web`, `three`, `three-mesh-bvh`, `@react-three/fiber` 禁止
- `packages/profile-fps` → `@cod/gameserver`, `@cod/web` 禁止
- `apps/web` → `@cod/engine-core`, `@cod/gameserver` 禁止 + `WebSocket` global 禁止（`apps/web/src/game/net/websocket.ts` のみ許可）
- 未強制: `gamemodes/*`, `shared-types`, `gamemode-sdk`, `profile-voxel`, `matchmaker`, `hubでBabylon禁止`, `client-voxel/client-fps分離` は今後 `biome.json` へ追加予定（`extend-biome` 選択）

ゲームコードから `WebSocket` を直接参照しない。`apps/web/src/game/net/websocket.ts` 以外は Biome の `noRestrictedGlobals` で禁止する（[protocol.md](./protocol.md)、[api-sources.md](./api-sources.md)）。

# レイヤーとリポジトリ

## 層

```
L3  ゲームモード層
    voxel-bedwars / voxel-creative / fps-ffa / fps-tdm ...
    → GameModeDefinition を export するだけ。所属タイプを宣言する

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

3 つ目のタイプ（例: `racing`）を足すときに触るのは L2 と L3 だけ。L0/L1 は無変更。**この性質が保たれているかが設計の判定基準。**

実装中に「L1 に `if (type === 'voxel')` を書きたくなった」ら、L1/L2 の境界を見直す。

## リポジトリ（Bun workspaces モノレポ）

目標構成。現行は単一 `package.json` + `src/` / `shared/` / `server/`。フェーズ 1 で再編する。

```
/
├ package.json                    # workspaces
├ tsconfig.base.json
├ biome.json
├ packages/
│  ├ protocol/                    # L0: バイト定義・量子化・パッカー
│  ├ engine-core/                 # L1: Room 基盤。SimProfile.ts のみ L2 境界
│  ├ profile-voxel/               # L2
│  ├ profile-fps/                 # L2
│  ├ gamemode-sdk/                # L3 が import する唯一のパッケージ
│  └ shared-types/
├ apps/
│  ├ matchmaker/                  # L0 HTTP
│  ├ gameserver/                  # L0+L1+L2 Bun WS
│  └ web/
│     ├ hub/                      # React。初期バンドル。Babylon 禁止
│     ├ shell/
│     ├ net/                      # タイプ非依存ネットコード
│     ├ client-voxel/             # 動的 import
│     └ client-fps/               # 動的 import
└ gamemodes/
   ├ voxel-creative/
   ├ voxel-bedwars/
   ├ fps-ffa/
   └ fps-tdm/
```

`packages/protocol` の中は `common/` / `voxel/` / `fps/` にパケットを分ける。`engine-core` の `profile/SimProfile.ts` が L2 の実装契約。

## 依存規則（Biome `noRestrictedImports` で強制）

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

ゲームコードから `WebSocket` を直接参照しない。`apps/web/src/net/websocket-transport.ts` 以外は Biome で禁止する（[protocol.md](./protocol.md)）。

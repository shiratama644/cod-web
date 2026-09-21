# Sandbox + フィルター設計の整理 (議論用) — 最終訂正

> Date: 2026-09-22 / Status: 議論中→合意済み / 対象: ユーザー理想 `sandbox/{fps, zombie, athletic, boxel, bedwars}` + タグフィルター `official`, `boxel` 等
> **最終訂正 2026-09-22: ユーザー確認により `boxel` は `voxel` のタイポ。エイリアス機能としては扱わない。`voxel` に訂正済み。以下の議論中の `boxel` 表記はすべて `voxel` のタイポとして読む。**

## 現状の設計 (docs/arch/editor.md)

```
/{type}/{source}/{slug}

type: fps | voxel (2つだけ, L1/L2の分岐)
source: official | ugc (運営/UGC区分)
slug: pvp, zombie, athletic, survival, bedwars 等 (個別ゲーム)

例:
  /fps/official/pvp
  /fps/official/zombie
  /fps/ugc/athletic
  /voxel/official/bedwars
  /voxel/official/survival
```

- `type` はシミュレーション実装を決める (fps=カプセルvs三角形 60Hz, voxel=AABB vs グリッド 30Hz)
- `source` は配信・権限を決める
- `slug` は表示・検索上の名前

## ユーザー理想の解釈 (要確認)

> `sandbox/{fps, zombie, athletic, boxel, bedwars}がある感じでsandbox画面でフィルター(tagとして)にofficialやboxelなどがあって絞り込める`

解釈案:

- `sandbox` はハブのトップ画面 (ゲーム一覧)
- `fps, zombie, athletic, boxel, bedwars` は **ジャンル/カテゴリ** として sandbox 配下に並ぶ
- `official, boxel, ...` は **タグ** としてフィルターに使える

疑問点:
- `boxel` は `voxel` の別名? それとも1つのゲームタイトル?
- `fps` は type とジャンル両方に出現するが、同じ意味?
- `bedwars` は voxel の1モードだが、独立カテゴリにしたい?

## 提案: 3層 + タグ (現行互換 + 拡張)

現行の `type/source/slug` を内部IDとして維持しつつ、表示層で **genre + tags** を追加する。

### データモデル拡張案

```ts
interface GameModeDefinition {
  id: 'fps-official-ffa' // 現行維持, 正規表現 /^[a-z][a-z0-9-]{2,31}$/
  type: 'fps' | 'voxel'  // 現行維持, L1/L2分岐は2つのみ (fps先行+voxel契約だけ)
  source: 'official' | 'ugc' // 現行維持
  slug: 'ffa' | 'zombie' | 'athletic' | 'bedwars' | ... // 現行維持

  // 追加 (Phase 4)
  genres: Genre[] // 例: ['fps', 'zombie'] / ['boxel', 'bedwars']
  tags: Tag[]     // 例: ['official', 'pvp', 'pve', 'parkour', 'survival']
}

type Genre = 'fps' | 'zombie' | 'athletic' | 'boxel' | 'bedwars' | 'survival' | 'pvp' | ...
type Tag = 'official' | 'ugc' | 'fps' | 'voxel' | 'boxel' | 'zombie' | 'athletic' | 'bedwars' | 'pvp' | 'pve' | ...

type Boxel = 'voxel' // 互換: boxelはvoxelのエイリアスとして扱う? それとも別?
```

### URL / ルーティング案

3案を比較:

#### 案A: 現行維持 + sandboxはハブのクエリフィルター (最小変更)

```
内部ID: /fps/official/zombie (維持)
ハブURL: /sandbox?genre=zombie&tag=official
        /sandbox/fps (genre=fpsのエイリアス)
        /sandbox/zombie
        /sandbox/athletic
        /sandbox/boxel (genre=boxel=voxel)
        /sandbox/bedwars

表示:
  sandbox画面で [fps][zombie][athletic][boxel][bedwars] のカテゴリボタン
  + [official][ugc][pvp][pve] 等のタグフィルター (AND/OR)
  1ゲームが複数genre/tagを持つ (例: /fps/official/zombie は genres=[fps, zombie], tags=[official, pve, zombie])
```

- メリット: 現行コード・import境界・SimProfile分岐を壊さない。Phase 3完了の成果を維持。
- デメリット: URLが /fps/official/zombie と /sandbox/zombie の2つ存在 (エイリアス)

#### 案B: 物理パスを sandbox/{genre}/{source}/{slug} に再構成

```
gamemodes/sandbox/fps/official/ffa
gamemodes/sandbox/zombie/official/zombie
gamemodes/sandbox/athletic/ugc/athletic
gamemodes/sandbox/boxel/official/bedwars
gamemodes/sandbox/bedwars/official/bedwars

URL: /sandbox/fps/official/ffa
     /sandbox/zombie/official/zombie
```

- メリット: ユーザー理想のパスに近い
- デメリット: 現行の /{type}/{source}/{slug} 階層を捨てる、type分岐がgenreに拡散 (L1に if genre==... が入りやすい)、Phase 3の成果 (ffa最小) を再配線必要

#### 案C: ハイブリッド - typeは維持、genreは表示用、boxel=voxelエイリアス

```
内部:
  type: fps | voxel (維持, voxelはboxelの正本、boxelはエイリアス表示)
  source: official | ugc
  slug: ffa, zombie, athletic, bedwars, survival, ...

表示拡張:
  genres: ['fps'] | ['zombie'] | ['athletic'] | ['boxel'] | ['bedwars'] | ['fps','zombie'] 等
  tags: ['official','pvp'] | ['official','boxel','bedwars'] 等

URL:
  正本: /fps/official/ffa (維持)
  エイリアス: /sandbox/fps, /sandbox/zombie, /sandbox/athletic, /sandbox/boxel, /sandbox/bedwars
  フィルター: /sandbox?genres=fps,zombie&tags=official,boxel

gamemodes物理パス:
  gamemodes/fps/official/ffa (維持)
  gamemodes/voxel/official/bedwars (維持)
  + 将来 gamemodes/fps/official/zombie, gamemodes/voxel/ugc/athletic 等
  sandbox/ は物理パスではなくハブの表示グルーピング
```

- メリット: L1/L2のtype分岐2つを維持 (fps先行+voxel契約だけ)、official/ugcをタグとしても扱える、boxelをvoxelの表示エイリアスにできる、Phase 3完了を維持しつつPhase 4で拡張
- デメリット: 内部IDと表示URLが別 (エイリアス管理が必要)

### タグ設計案

```ts
// 1ゲームが複数タグを持つ
const ffa = {
  id: 'fps-official-ffa',
  type: 'fps',
  source: 'official',
  slug: 'ffa',
  genres: ['fps', 'pvp'], // sandbox/fps, sandbox/pvp に出る
  tags: ['official', 'fps', 'pvp', 'ffa'],
}

const zombie = {
  id: 'fps-official-zombie',
  type: 'fps',
  source: 'official',
  slug: 'zombie',
  genres: ['fps', 'zombie'],
  tags: ['official', 'fps', 'zombie', 'pve'],
}

const bedwars = {
  id: 'voxel-official-bedwars',
  type: 'voxel',
  source: 'official',
  slug: 'bedwars',
  genres: ['boxel', 'bedwars'], // boxel=voxel表示
  tags: ['official', 'boxel', 'voxel', 'bedwars', 'pvp'],
}

const athletic = {
  id: 'voxel-ugc-athletic',
  type: 'voxel',
  source: 'ugc',
  slug: 'athletic',
  genres: ['athletic', 'boxel'],
  tags: ['ugc', 'boxel', 'athletic', 'parkour'],
}
```

sandbox画面:

```
[Sandbox]
  カテゴリ: [All][fps][zombie][athletic][boxel][bedwars]
  タグフィルター: [official][ugc][pvp][pve][parkour]...
  検索結果: genres/tagのAND/ORで絞り込み

例: カテゴリ=boxel + タグ=official → bedwars等が表示
    カテゴリ=zombie → zombieが表示 (officialタグ付き)
```

### boxel の扱い案

- 案1: boxel = voxel の表示エイリアス (互換)。typeはvoxelが正本、UIではboxelと表示。URL /sandbox/boxel は /voxel のゲームを一覧。
- 案2: boxelは独立したtype (typeを fps|voxel|boxel に拡張)。ただしL1分岐が増え、Phase 2の「fps先行+voxel契約だけ」に反する。
- 案3: boxelはgenreの1つ。typeはfps|voxel維持、boxelはgenre/tagとして扱う。/sandbox/boxel は genre=boxel のゲーム一覧。

推奨: 案1 or 案3 (typeは2つのまま、boxelは表示/タグ)

## 質問 (ユーザーへ)

1. sandbox はハブ画面の名前ですか? URLは /sandbox がトップで、その配下に /sandbox/fps 等がカテゴリページという理解で合っていますか?
2. fps, zombie, athletic, boxel, bedwars はジャンル/カテゴリとして、1つのゲームが複数に属すこともありますか? 例: zombieはfpsでもある?
3. boxel は voxel と同じ意味で使っていますか? それとも別のゲーム?
4. official は今は source (official/ugc) ですが、タグとしてもフィルターしたいということで、sourceもタグの一種として扱うイメージですか?
5. 他にタグとして欲しいものはありますか? (pvp, pve, parkour, survival, creative等)
6. URLは現行の /fps/official/pvp を維持しつつ、/sandbox/fps 等をエイリアスとして追加する案 (案A/C) は許容ですか? それとも物理パス自体を sandbox/... に変えたいですか?

## 次のステップ (合意後)

- Phase 4計画 (PLAT-4) に genre/tag 拡張を明記
- GameModeDefinition に genres/tags 追加 (optional, 後方互換)
- gamemodes の物理パスは現行維持 (fps/official/ffa, voxel/official/bedwars) + 新規 zombie/athletic/bedwars を追加
- ハブ (apps/web/src/hub) で sandbox画面 + フィルターUI実装
- biome.json の gamemodes/*→sdkのみ維持、type分岐2つ維持

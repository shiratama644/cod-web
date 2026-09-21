# Sandbox + フィルター設計の整理 (2026-09-22 改訂版)

> Date: 2026-09-22 / Status: 合意済み改訂版 / 対象: 2026-09-22改訂版「Official FPS 1ゲーム複数モード + Voxel 1モード永続、Sandboxは公式拡張+UGC、親ジャンル+サブタグ」
> **最終訂正 2026-09-22: `boxel` は `voxel` のタイポ。エイリアス機能としては扱わない。`voxel` に訂正済み。**
> **改訂版 2026-09-22: SandboxはUGCだけでなく標準FPS/Voxel以外の公式ゲームも含む。Official FPSは1ゲーム複数モード、Official Voxelは1モード永続。親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic。**

## 現状の設計 (docs/arch/editor.md 改訂版)

```
/{type}/{source}/{slug}

type: fps | voxel (2つだけ, L1/L2の分岐)
source: official | ugc (Sandboxは両方含む、標準FPS/Voxel以外)
slug: ffa, tdm, dom, zombie, athletic, survival, bedwars 等 (個別ゲーム)

例:
  /fps/official (1ゲーム複数モード、subModes ffa/tdm/dom) — Official FPS本体
  /fps/official/ffa (FFAサブモード)
  /fps/official/zombie (公式拡張、Sandbox表示)
  /voxel/official/survival (1モード永続) — Official Voxel
  /voxel/official/bedwars (公式拡張、Sandbox表示)
  /fps/ugc/zombie, /voxel/ugc/bedwars (UGC、Sandbox表示)
```

- `type` はシミュレーション実装を決める (fps=カプセルvs三角形 60Hz, voxel=AABB vs グリッド 30Hz)
- `source` は配信・権限を決める (Sandboxは official|ugc両方含む)
- `slug` は表示・検索上の名前
- Official FPSは1ゲーム複数モード、Official Voxelは1モード永続、Sandboxは公式拡張+UGC

## ユーザー理想の解釈 (改訂版)

> Official FPSは1つのゲームに複数ゲームモード [FFA,TDM,DOM,etc.] voting_system
> Official Voxelは1つのゲームモードのみ [Survival] finish_game永遠続く
> SandboxはUGCだけでなく標準で付いているFPS,Voxel以外の公式が作成したゲームも含む
> 親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athleticでフィルタ

解釈:

- Official FPSは1ゲーム複数モード、投票で次サブモード決定。現行 ffa はFFAサブモード最小実装。
- Official Voxelは1モードのみ Survival永続、死んだらリスポーン、finish_game無し。
- Sandboxは公式拡張+UGC。親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athleticでフィルタ。
- Header [FPS][Voxel]はOfficial切替、Left Sidebar [Sandbox]は公式拡張+UGC。

## 提案: 親ジャンル + サブタグ + 投票 (改訂版)

現行の `type/source/slug` を内部IDとして維持しつつ、表示層で **parentGenre + subTag + subModes + category** を追加する。

### データモデル拡張案 — 改訂版

```ts
interface GameModeDefinition {
  id: 'fps-official' | 'fps-official-ffa' | 'voxel-official-survival' | 'fps-official-zombie'
  type: 'fps' | 'voxel'  // 現行維持, L1/L2分岐は2つのみ (fps先行+voxel契約だけ)
  source: 'official' | 'ugc' // Sandboxは両方含む
  slug: 'ffa' | 'tdm' | 'dom' | 'zombie' | 'athletic' | 'bedwars' | 'survival' | ...

  // 追加 (Phase 4) — 改訂版
  parentGenre: ParentGenre // 'fps' | 'voxel' — 親ジャンル
  genres: SubTag[] // サブタグ: ['bedwars'] / ['zombie'] / ['athletic'] / ['ffa'] / ['tdm'] / ['dom']
  tags: Tag[]     // ['official','pvp'] / ['ugc','bedwars'] 等
  subModes: SubTag[] // Official FPSのみ: [FFA,TDM,DOM]
  currentSubMode: SubTag
  category: GameCategory // Official | Sandbox
  display: { title, description, thumbnail, creator }
  stats: { totalPlays, activePlayers, detailViews }
}

type ParentGenre = 'fps' | 'voxel'
type SubTag = 'ffa' | 'tdm' | 'dom' | 'zombie' | 'bedwars' | 'athletic' | 'survival' | string
type Tag = 'official' | 'ugc' | 'fps' | 'voxel' | 'zombie' | 'athletic' | 'bedwars' | 'pvp' | 'pve' | ...
type GameCategory = 'Official' | 'Sandbox'

interface VoteOption {
  subMode: SubTag // ffa, tdm, dom
  label: string
  votes: number
}
```

### URL / ルーティング案 — 改訂版

#### 内部正本

```
Official FPS: /fps/official (1ゲーム複数モード、subModes ffa/tdm/dom) — Header [FPS]タブ
Official Voxel: /voxel/official/survival (1モード永続) — Header [Voxel]タブ
Sandbox: /fps/official/zombie (公式拡張), /voxel/official/bedwars (公式拡張), /fps/ugc/*, /voxel/ugc/* (UGC) — Left Sidebar [Sandbox] → /sandbox
```

#### 表示集約

```
ハブURL: /sandbox?parent=fps&tag=zombie
        /sandbox?parent=voxel&tag=bedwars
        /sandbox?parent=fps&tag=athletic

表示:
  Sandbox画面で親ジャンル [FPS][Voxel] + サブタグ [Bedwars][Zombie][Athletic][TDM][DOM] フィルタ
  + [official][ugc][pvp][pve] 等のタグフィルター
  1ゲームが親ジャンル1つ + 複数サブタグを持つ
  Sandboxは公式拡張+UGC両方を含むため creator は Official または ユーザー名
```

- メリット: 現行コード・import境界・SimProfile分岐を壊さない。Phase 3完了の成果を維持。Official 1ゲーム複数モード + Voxel永続 + Sandbox公式拡張+UGCを表現可能。
- デメリット: URLが /fps/official/zombie と /sandbox の2つ存在 (表示集約)

### タグ設計案 — 改訂版

```ts
// Official FPS: 1ゲーム複数モード
const fpsOfficial = {
  id: 'fps-official',
  type: 'fps',
  source: 'official',
  slug: 'official',
  parentGenre: 'fps',
  genres: ['ffa','tdm','dom'],
  tags: ['official','fps','pvp'],
  subModes: ['ffa','tdm','dom'],
  currentSubMode: 'ffa',
  category: 'Official',
}

// Official FPSのFFAサブモード
const ffa = {
  id: 'fps-official-ffa',
  type: 'fps',
  source: 'official',
  slug: 'ffa',
  parentGenre: 'fps',
  genres: ['ffa'],
  tags: ['official','pvp','fps'],
  subModes: ['ffa','tdm','dom'],
  currentSubMode: 'ffa',
  category: 'Official',
}

// Official Voxel: 1モード永続
const survival = {
  id: 'voxel-official-survival',
  type: 'voxel',
  source: 'official',
  slug: 'survival',
  parentGenre: 'voxel',
  genres: ['survival'],
  tags: ['official','voxel','survival'],
  category: 'Official',
}

// Sandbox: 公式拡張 Zombie
const zombieOfficial = {
  id: 'fps-official-zombie',
  type: 'fps',
  source: 'official',
  slug: 'zombie',
  parentGenre: 'fps',
  genres: ['zombie'],
  tags: ['official','fps','zombie','pve'],
  category: 'Sandbox',
}

// Sandbox: 公式拡張 Bedwars
const bedwarsOfficial = {
  id: 'voxel-official-bedwars',
  type: 'voxel',
  source: 'official',
  slug: 'bedwars',
  parentGenre: 'voxel',
  genres: ['bedwars'],
  tags: ['official','voxel','bedwars','pvp'],
  category: 'Sandbox',
}

// Sandbox: UGC Athletic
const athletic = {
  id: 'voxel-ugc-athletic',
  type: 'voxel',
  source: 'ugc',
  slug: 'athletic',
  parentGenre: 'voxel',
  genres: ['athletic'],
  tags: ['ugc','voxel','athletic','parkour'],
  category: 'Sandbox',
}
```

sandbox画面 — 改訂版:

```
[Sandbox] (公式拡張+UGC)
  親ジャンル: [All][FPS][Voxel]
  サブタグ: [All][Bedwars][Zombie][Athletic][TDM][DOM][FFA]
  ソート: [Plays][Active][Views]
  検索結果: parentGenre + subTag のANDで絞り込み

例: 親ジャンル=FPS + サブタグ=Zombie → fps-official-zombie (公式拡張) + fps-ugc-zombie (UGC) が表示
    親ジャンル=Voxel + サブタグ=Bedwars → voxel-official-bedwars (公式拡張) + voxel-ugc-bedwars (UGC) が表示
```

### 投票システム — 改訂版 (Official FPS 1ゲーム複数モード)

- トリガー: Official FPSで1マッチ終了時 onRoundEnd後に全プレイヤー投票UI
- 候補: 同一FPS公式ゲーム内のサブモード [FFA,TDM,DOM,etc.]
- 多数決で次サブモード決定、次ラウンド開始
- Official Voxelは投票対象外 (Survival永続)

### boxel の扱い — 最終

- `boxel` は `voxel` のタイポで `voxel` に訂正。エイリアス機能としては扱わない。

## 合意 (改訂版)

1. Sandboxはハブ画面の名前、URLは /sandbox がトップで、親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athleticでフィルタ、公式拡張+UGC両方含む。
2. Official FPSは1つのゲームに複数モード [FFA,TDM,DOM]、投票で次決定。Official Voxelは1モードのみ [Survival]永続。
3. Header [FPS][Voxel]はOfficial切替、Left Sidebar [Sandbox]は公式拡張+UGC。
4. 親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athleticでフィルタ、ソート plays/active/views。
5. URLは現行の /{type}/{source}/{slug} を維持しつつ、/sandbox を表示集約として追加。Sandboxは source=official|ugc両方含む。
6. boxelはvoxelのタイポで訂正、エイリアス機能としては扱わない。

## 次のステップ (合意後) — 改訂版

- Phase 4計画 (PLAT-4) に Official 1ゲーム複数モード + Voxel永続 + Sandbox公式拡張+UGC + 親ジャンル+サブタグ拡張を明記
- GameModeDefinition に parentGenre/genres(サブタグ)/tags/display/stats/subModes/currentSubMode/category 追加 (optional, 後方互換)
- gamemodes の物理パスは現行維持 (fps-official/ffa, voxel/official/survival) + 新規 zombie/bedwars 公式拡張をSandboxとして表示
- ハブ (apps/web/src/components) で Header Official切替 + Sidebar Sandbox (公式拡張+UGC) + Sandboxモーダル 親ジャンル+サブタグ + 投票UI Official FPS subMode
- biome.json の gamemodes/*→sdkのみ維持、type分岐2つ維持

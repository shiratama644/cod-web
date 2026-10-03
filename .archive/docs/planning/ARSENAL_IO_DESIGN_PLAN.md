# ARSENAL.IO — デザイン & ページルーター 確定案（D0 議論用）

> **⚠ SUPERSEDED（2026-09-24）**: CoD Mobile へのシステム全面入れ替えが決定したため、本計画は **保留・代替** された。代替: `CODM_DEEP_RESEARCH_PLAN.md`（リサーチ→統合Spec で最終 IA・デザインを出す）。IA（rank/match/br/zombie）と VALORANT 風のスタイルは、統合Spec（R7）の成果で置き換わる。
>
> Date: 2026-09-24(JST) / Status: **SUPERSEDED / 保留**（未実装）
> 前提: FPS のみ（voxel は v1 除外・拡張機構は維持）/ Design-first（デザイン+ルーターを先に完成）/ Sandbox は v1 非採用 / リポジトリ名は cod-web → arsenal-io へ（ユーザー操作待ち）

## 1. 合意事項（2026-09-24 議論）

| 項目 | 決定 |
|---|---|
| ゲーム | FPS のみ。voxel は spec/コードから除去（将来追加は registry への spec 1 追加で可能に設計） |
| 開発方針 | 完全なデザイン + ページルーターを先に完成 → ロジックを後から組み込み |
| Sandbox (UGC) | v1 の IA/UI に含めない。拡張機構（registry 型）のみコードに保持 |
| ページ | TOP + 4モード + skins / shop / profile / settings / login / 404 |
| ビジュアル | VALORANT 風 ダーク・タクティカル（シャープ・幾何学・黒/白+アクセント1色） |
| 4モード | rank / match / br / zombie。**FFA・TDM・DOM は rank と match の両方の中にある形式** |
| リポジトリ | cod-web → arsenal-io（GitHub UI での改名待ち。旧URLは自動リダイレクト） |

## 2. URL / ページルーター（完全版）

| URL | ページ | 役割 |
|---|---|---|
| `arsenal.io/` | TOP | ログインボーナス、スキン展示、モードボタン×4、ニュース |
| `arsenal.io/rank/` | RANKED | ランク戦（形式: FFA/TDM/DOM 選択可） |
| `arsenal.io/match/` | MATCH | 標準マッチ（形式: FFA/TDM/DOM 選択可） |
| `arsenal.io/br/` | BATTLE ROYALE | バトルロワイヤル |
| `arsenal.io/zombie/` | ZOMBIE | ゾンビ（波状） |
| `arsenal.io/skins/` | SKINS | 武器スキン一覧・詳細 |
| `arsenal.io/shop/` | SHOP | パック・バーゲン（mock、実決済なし） |
| `arsenal.io/profile/` | PROFILE | プロフィール・統計・所持スキン |
| `arsenal.io/settings/` | SETTINGS | 映像・音・操作・アカウント |
| `arsenal.io/login/` | LOGIN | ログイン画面（v1 はデザインのみ・実 auth なし） |
| `arsenal.io/play` | IN-GAME | **既存の FPS プレイビューを流用**（GameCanvas+HUD+タッチ操作）。フルスクリーン（Header なし） |
| `*` | 404 | Not Found |

### ルーター構造（react-router / BrowserRouter）

```
<BrowserRouter>
  <Routes>
    <Route element={<AppLayout/>}>            // 共通: Header + Footer
      <Route index element={<Top/>}/>
      <Route path="rank"   element={<ModePage mode="rank"/>}/>
      <Route path="match"  element={<ModePage mode="match"/>}/>
      <Route path="br"     element={<ModePage mode="br"/>}/>
      <Route path="zombie" element={<ModePage mode="zombie"/>}/>
      <Route path="skins"   element={<Skins/>}/>
      <Route path="shop"    element={<Shop/>}/>
      <Route path="profile" element={<Profile/>}/>
      <Route path="settings" element={<Settings/>}/>
      <Route path="login"   element={<Login/>}/>
      <Route path="*"       element={<NotFound/>}/>
    </Route>
    <Route path="play" element={<InGame/>}/>   // フルスクリーン（layout 外）
  </Routes>
</BrowserRouter>
```

- 末尾スラッシュ（`/rank/`）は React Router が正規化して `/rank` と同等扱い
- `/play` だけが layout（Header/Footer）の外 → 既存ゲーム画面をそのまま埋め込める
- 新規モード追加 = **registry 1 エントリ + ページコンポーネント 1 個**。ルート・TOP のボタン・ナビは registry から自動生成

## 3. モード registry（拡張性の核心）

```
MODES:
  rank   → slug 'rank'   名称 RANKED          形式 [ffa, tdm, dom]  ランク対象  最大 20
  match  → slug 'match'  名称 MATCH           形式 [ffa, tdm, dom]  非ランク   最大 20
  br     → slug 'br'     名称 BATTLE ROYALE   形式 なし（solo/duo/squad はマッチ設定）最大 100
  zombie → slug 'zombie' 名称 ZOMBIE          形式 なし（ウェーブ設定）       最大 16

FORMATS:
  ffa → 全員対決
  tdm → チーム戦
  dom → 制圧戦（ゲーム内 DOM 投票は維持）
```

- `GAME_TYPES` も同型 registry 化（現在は `fps` のみ。voxel 復活は spec 追加だけで済み、L0/L1 の型非依存設計は維持）
- 形式・マップ・最大人数など「振る舞いに効く値」は全部 registry 側に置く → D3 でロジック（マッチメイク/sim）がそのまま引ける

## 4. デザインシステム（VALORANT 風 ダーク・タクティカル）

### パレット

| 用途 | 色 |
|---|---|
| 背景 | `#0F1923`（Deep Navy） |
| パネル | `#16222C` / `#1F2C38` |
| アクセント | `#FF4655`（VALORANT Red）— 単一アクセント |
| 文字 | `#FFFFFF` / 2次 `#B5BDC4` / 3次 `#7A8A99` |
| ランク（金） | `#F5C518`（ランク表示のみに限定使用） |

### 形状・タイポ

- 角丸は最小（0–4px）、**斜めカット（clip-path）のカード/ボタン**がメインモチーフ
- 見出しは uppercase + 広い文字間。ラベルは condens 系無襯線
- 外部フォントは初期不使用（system stack）。必要なら Rajdhani / Barlow Condensed を追加（要確認）

### 共通コンポーネント

PrimaryButton（accent・斜めカット）/ SecondaryButton（outline）/ Card / Stat / SectionTitle / Badge（rarity・ランク）/ Modal / Toggle / Slider — いずれも v1 は静的（`useState` のみ、永続化なし）

## 5. ページ別デザイン（静的・mockデータ）

### `/` TOP
1. **Hero**: `ARSENAL` ロゴ + タグライン + 大 CTA「PLAY」（→ /match/）＋背景アート（プレースホルダ）
2. **デイリーログインボーナス**: ストリーク N/7、報酬アイコン、受取ボタン（静的）
3. **モードボタン×4**: RANKED / MATCH / BATTLE ROYALE / ZOMBIE の斜めカットカード（アイコン+プレイ人数 mock）→ 各モードページ
4. **スキン展示**: 注目スキンカルーセル（mock: 画像スロット/名前/価格or所持）→ /skins
5. **ニュース・パッチノート**: リスト（mock）
6. Footer（規約/サポート/バージョン）

**グローバル Header**: ロゴ（→/）+ 通貨チップ（クレジット/コイン mock）+ 設定アイコン（→/settings）+ アバター（→/profile）
※v1 設計前提: 常時 mock ログイン済みユーザー表示（logged-out 表現は /login に集約）

### `/rank/` RANKED
1. モードバナー（RANKED / "Competitive Match"）
2. 現在ランク表示（mock: Gold II）+ ポイント + 次のランクへ進捗バー
3. **形式選択: FFA / TDM / DOM タブ**
4. マップ選択（mock リスト）
5. PLAY（→ /play）
6. シーズン報酬プレビュー（mock）

### `/match/` MATCH
1. モードバナー（MATCH / "Standard Match"）
2. **形式選択: FFA / TDM / DOM タブ**
3. マップ選択（mock）
4. フレンド/招待（mock リスト）
5. PLAY（→ /play）

### `/br/` BATTLE ROYALE
1. モードバナー
2. ルールカード + プレイ数選択（solo/duo/squad, mock）
3. マップ選択
4. PLAY

### `/zombie/` ZOMBIE
1. モードバナー
2. ウェーブ状況プレビュー（mock: 現在ウェーブ/残敵数）
3. 難易度・役割選択（mock）
4. PLAY

### `/skins/` SKINS
- 武器スキングリッド（mock: 画像スロット/名称/rarity バッジ/価格）
- フィルタ: 武器種 / rarity（静的）
- 詳細モーダル: 大画像・ステータス・「装備」「購入」スタブ

### `/shop/` SHOP
- 通貨表示 / パック・ケースグリッド（mock）/ デイリーバーゲン / チャージパック（mock）

### `/profile/` PROFILE
- アバター・名前・レベル・ランクバッジ
- 統計（K/D、勝率、プレイ時間 — mock）
- 所持スキン（mock）

### `/settings/` SETTINGS
- 映像（品質/FOV）/ 音（音量）/ 操作（感度）/ アカウント（ログアウト → /login）
- 全スタブ（useState のみ）

### `/login/` LOGIN
- 中央カード: ロゴ・入力欄・ログインボタン（スタブ）・ソーシャルボタン（mock）・規約リンク
- 実 auth は D3 以降

### `/play` IN-GAME
- 既存 FPS プレイビュー（GameCanvas + RendererHud + TouchControls + StartOverlay + VoteOverlay + RoomSelectionModal）を**そのまま流用**
- 既存のテスト資産・エンジン資産を壊さない。D3 で「モード→形式→マップ」ロビーとマッチメイクを繋ぐ

### 404
- 大文字 `404 / SIGNAL LOST` + TOP へ戻るボタン

## 6. 除去・維持（voxel / sandbox）

- **除去（v1 の IA/UI）**: voxel（`GAME_TYPES`・`TYPE_SPECS`・sandbox mock・Header の voxel 参照等）、SandboxModal / SandboxDetailPage / LeftSidebar（Sandbox 導線）
- **維持（拡張機構）**: `gamemode-api` の型（SandboxCard 等）+ registry パターン + engine-core / protocol / gameserver / InputController（D3 のロジック層）
- 除去に伴うテスト整理は D1 で行う（ゲート全 pass を維持）

## 7. フェーズ計画

| フェーズ | 内容 | 成果物 |
|---|---|---|
| **D0（今回）** | この文書で IA・デザイン・ルーターを合意 | 本 plan |
| **D1** | react-router 導入 + 共通 layout + **全ページの静的デザイン完成** + voxel/sandbox 除去 + テスト整備 | 設計通り全ページ閲覧可能（プレビュー） |
| **D2** | ビジュアル仕上げ（画像アセット、モーション、レスポンシブ） | 完成度のあるデザイン |
| **D3+** | ロジック組み込み（auth → マッチメイク → gameserver WS → 既存エンジン接続） | 実動作 |

## 8. 未決事項（要コメント）

1. **in-game URL**: `/play` でよいか（別案があれば）
2. **Hero 背景アート**: プレースホルダ（CSS グラデ/幾何学）でよいか、それともアセットを提供するか
3. **フォント**: system stack のみでよいか、Rajdhani 等を導入するか
4. **TOP の PLAY CTA 遷移先**: 現在は `/match/` 想定
5. **br の最大人数 / zombie のウェーブ数など mock 数値**: 仮値でよいか

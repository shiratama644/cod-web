# 00 — Scope と参照基準（R0 成果物）

> Date: 2026-09-24(JST) / Phase: R0 完了（同日ハイブリッド基準へ改訂・§1.4）/ Status: **確定 — R1 開始可**
> 上位計画: `docs/planning/CODM_DEEP_RESEARCH_PLAN.md`（決定: **ハイブリッド基準（§1.4）** / MP+Ranked+BR 先行 / UI 1:1（2026 画面構成）/ ゲーム内観測可）
> **要旨**: モード定義のみ 2020-03-25 初出期、武器システムとその他の全機能は 2026 現在版、マップは独自（拡張可能 / MVP は JSON 定義+手続き生成 / 本番は 3D モデルアップロード）。§2〜§3 の初出期タイムライン/棚卸は「モード一覧の根拠」および歴史的記録として保持する。

## 1. 参照基準（REFERENCE BASELINE）— 確定

**基準 = 2020-03-25（Zombies 除去パッチ適用後のゲーム状態 / Season 4 "Rise of Soap" 期間、Season 5 開始 2020-04-01 前）**

### 1.1 選定理由

| 要件 | 基準 2020-03-25 で満たすか |
|---|---|
| Ranked（MP+BR）が存在する | ✅ 2020-01-14 導入（公式ブログ検証済み、§2） |
| Zombies が存在しない | ✅ 2020-03-25 に除去（公式アノウンス検証済み、§2） |
| 初出期のコア体験（MP+BR）が全モード揃っている | ✅ リリース(2019-10-01)から 6 か月分の全コンテンツを含む |
| DMZ / Undead Siege が存在しない | ✅（2024 / 2021 追加） |

### 1.2 重要な事実訂正（計画時点の前提が誤っていた点）

**Zombies は「2020-08 導入」ではなく、初出の 1 か月後に追加され、2020-03-25 に除去されていた。**

- Zombies（classic）追加: **2019-11-22/23**（グローバル版、リリースの約 3 週間後）[検証済み: Wikipedia + Daily Express + Wiki main]
- Zombies 除去: **2020-03-25**（2020-02-29 の公式コミュニティアップデートで告知。理由: 「求める品質レベルに達しなかった」。第2マップ Nacht Der Untoten はグローバル版で非リリース）[検証済み: TechRaptor（公式引用）+ Wikipedia]
- Zombies 復活: **2022-10-13**（Shi No Numa のみ）[検証済み: Wikipedia + Wiki main]

→ ユーザー決定「初出期・MP+BR コア・Zombies 無」を最も忠実に満たす状態が **2020-03-25 の除去直後**（= Zombies 無 + Ranked 有 + 初出期全モード/マップ）。

### 1.3 基準に「含まれない」もの（再現対象外・明確化）

| 機能 | 実際の出た時期 | 扱い（2026-09-24 改訂後） |
|---|---|---|
| **Gunsmith（武器カスタム / アタッチメント）** | **Season 9 "Conquest"（2020-08-16）** | **対象内**（武器システム = 2026 世代、§1.4） |
| Alcatraz（BR） | 2020 S11（2020-10） | 2026 BR デザイン原則参照（幾何再現しない、§1.4） |
| 訓練モード（Firing Range feature） | 2020 S7（2020-06） | 2026 版として R6 要検証（Sフェーズで採用判定） |
| The Club（ソーシャル） | 2020 S11 | 2026 版として R6 要検証（Sフェーズで採用判定） |
| Undead Siege | 2021-08 | 本研究対象外（計画§0） |
| DMZ: Recon | 2024〜 | 本研究対象外（計画§0） |
| Control モード | 追加時期未検証（現在の core playlist に存在） | **対象外**（モード一覧は 2020-03-25 固定、§1.4） |
| 現行ランク表（Pro/Master/Grand Master/Elite + CP 帯） | Grand Master は 2025 S8 追加等 | **対象内**（その他の機能 = 2026、§1.4） |
| 2020-04 以降のマップ（Meltdown, Rust, Saloon, Tunisia, …） | S5〜 | 該当せず — マップは全て独自（§1.4） |

### 1.4 スコープ改訂 2026-09-24（ユーザー決定）— **ハイブリッド基準**

§1 の「単一日期基準」は、以下の**ドメイン別ハイブリッド基準**に改訂された（2026-09-24 ユーザー指示）:

| ドメイン | 参照バージョン | 備考 |
|---|---|---|
| **モード定義**（モード一覧 / 勝利条件 / ルール） | **2020-03-25 初出期（そのままで）** | TDM / FFA / Domination / S&D / Frontline / Kill Confirmed / Hardpoint（3/25 恒久化）。2024 以降の新モード（Control 等）は採用しない |
| **武器システム** | **2026 年現在版（Gunsmith 世代）** | アタッチメント全システム、統計パーセンテージ、武器比較機能、ダメージモデル、2026 武器ロースター |
| **その他の全機能**（Ranked / Scorestreaks / 進行 / 経済 / BP / ショップ / UI / ソーシャル / 設定 / BR / Zombies） | **2026 年現在版** | ユーザーのゲーム内観測（2026 版）が UI 1:1 の対象と直接一致する |
| **マップ** | **独自（CoD マップ幾何の再現しない）** | 下記「マップシステム」 |

**マップシステム（決定のポイント）:**

1. **1 枚に固定しない — 拡張可能**（マルチマップ対応）
2. **MVP: コードで作成 — マップ定義は JSON 形式**（データ駆動）
   - マップ = **JSON 定義 + ビルダ**（マップごとにハードコードしない）
   - マップ registry: **新規マップ追加 = JSON 1 個の追加**（本番では + 3D アセット）
   - MVP のマップは **手続き生成の独自マップ**（JSON → 生成: モジュールキット [壁 / カバー / 部屋 / レーン] + オブジェクト配置 + スポーン安全検証）
3. **本番: 3D モデルアップロード**（カスタム 3D アセットが同じ JSON schema に載る）
4. CoD マップは **デザイン原則の参照のみ**（レーン構造 / 視野線 / オブジェクト配置 / スポーンロジック / モード別サイズ感）

**研究スコープへの影響:**

- §1.3 の扱い改訂: **Gunsmith → 対象内**（武器システム = 2026）。「CoD マップ 13 枚の再現」→ **「マップデザイン原則 + JSON マップシステムの要求定義」**。Alcatraz 等の 2026 BR マップ → 幾何再現せず**デザイン原則参照**
- **R1 に追加**: ① 独自マップの JSON schema 要求（モード別メタデータ: オブジェクト点 / ボムサイト / スポーン / ゾーンアンカー / BR なら POI）② CoD マップのデザイン原則（代表 1 枚を深掘り: レーン / カバー密度 / 視野線 / スポーン保護）③ 手続き生成の実現性（モジュールキット方式）④（本番）3D モデルアップロードの管道要求（glTF 等 → collision → スポーン/オブジェクトタグ付け）
- **R1 武器**: 「2020 固定ビルド」→「**2026 Gunsmith システム**」（ロースター / アタッチメントスロット / 適合 / ダメージモデル / 武器比較機能）
- **R2**: 「2020-01 当時のランク表検証」→「**2026 ランクシステム**」（32 ランク / CP 帯 / Series / 配置試合 / デケイ — 大方は既存情報）
- **R4 Zombies**: **2026 現在版（2022 復活版）で研究**（2019 版は対象外）
- **R6 UI**: 1:1 対象 = **2026 画面構成**（ユーザーのゲーム内スクショがそのまま対象。2019-2020 メディアとの突合は不要）

## 2. 検証済みタイムライン（ソース付き）

| 日付 | 出来事 | ソース | 信頼度 |
|---|---|---|---|
| 2019-09-29 | シンガポール等 SEA（Garena）リリース | Wikipedia, Wiki main | 検証済み |
| **2019-10-01** | **ワールドワイド（グローバル版）リリース**（EU/NA 09-30、Korea 10-01） | Activision 公式ブログ, Wikipedia, Wiki main | 検証済み |
| 2019-11-22/23 | Zombies（classic、Shi No Numa）追加（グローバル版） | Wiki main, Daily Express | 検証済み |
| **2020-01-14** | **Ranked Mode（MP+BR）導入**。Lv7 で解放。MP/BR 別トラック。Rookie I → Legendary。BR は全マッチが対象（デフォルト）。MP 離脱ペナルティ（RankXP 減 + 5分BAN〜）。BR 統計は生存時間/救出数含む | Activision 公式ブログ "Introducing Ranked Mode" | 検証済み（一次情報） |
| 2020-01-16 | Season 3 "The Future Is Here" 開始 | Wiki main（シーズン表） | 単一情報源（Wiki） |
| 2020-02-14 | Ranked の「モード選択」をバレンタインイベントで試験（Garena）。**この時点の Ranked プレイリストは TDM / Domination / S&D の3モード固定** | zilliongamer | 単一情報源（SEA 版記事） |
| 2020-02-29 | Zombies 除去を公式告知（3/25 実施） | TechRaptor（公式コミュニティ更新引用） | 検証済み（公式引用） |
| **2020-03-25** | **Zombies 除去 + Hardpoint が恒久モード化**（それまで期間限定） | TechRaptor, Wikipedia, Wiki main | 検証済み |
| 2020-03-01 | Season 4 "Rise of Soap" 開始（BP: Disavowed） | Wiki main（シーズン表） | 単一情報源（Wiki） |
| 2020-08-16 | Season 9 "Conquest" = **Gunsmith 導入**（アタッチメント制の開始） | Wiki main | 単一情報源（Wiki、他ソースで時期の整合あり） |
| 2022-10-13 | Zombies 復活（Shi No Numa のみ） | Wikipedia, Wiki main | 検証済み |

### シーズン構造（2019-2020、Battle Pass シーズン約 2 か月）

| シーズン | 名称 | BP 名 | 開始 | 基準との関係 |
|---|---|---|---|---|
| S1 | （無名） | （無名） | 2019-10-01 | 基準前 |
| S2 | （無名） | — | 2019-11-25 | 基準前 |
| S3 | The Future Is Here | Phantom Strike | 2020-01-16 | 基準前（Ranked 導入と同じ時期） |
| **S4** | **Rise of Soap** | **Disavowed** | **2020-03-01** | **基準期間** |
| S5 | Steel Legion | Steel Legion | 2020-04-01 | 基準後（除外） |

- Ranked "Series"（2 か月 = BP 2 シーズン）: Wiki の Series 表（Series 1 "Stars" 09.2019〜 等）は **2020-01 導入という公式事実と矛盾**するため `[要クロス検証]`。採用は公式ブログの 2020-01-14 導入を正とし、Series の番号/名称は R2 で再検証する。
- ソース: https://callofduty.fandom.com/wiki/Call_of_Duty:_Mobile （Seasons and Themes 表）、https://blog.activision.com/call-of-duty/2020-01/Introducing-Ranked-Mode-to-Call-of-Duty-Mobile

## 3. 基準時点（2020-03-25）のコンテンツ棚卸

### 3.1 MP モード

- **コア（基準時点で恒久）**: Team Deathmatch（40K）、Free-for-All、Domination、Search & Destroy（4R）、Frontline、Kill Confirmed、**Hardpoint**（2020-03-25 に恒久化。それまで期間限定）[検証済み: TechRaptor]
- **期間限定（初出期に存在した/する）**: Gunfight（2v2、Killhouse/Shipment 対応 — 投入時期 R1 で検証）、その他イベント限定モード（R1 で一覧化）
- **Control**: 現行 core に存在（Wikipedia）。**追加時期未検証 → R1 で基準内/外を判定**
- Ranked 専用勝利条件（現行値）: TDM 50K / Dom 150pt（75-75 ラウンド制）/ S&D 5R / Hardpoint 通常と同じ / Frontline は半場制 + 60K。`[単一情報源: Wiki Ranked page — R2 で基準時点値を検証]`
- ソース: https://callofduty.fandom.com/wiki/Ranked_Mode , https://en.wikipedia.org/wiki/Call_of_Duty:_Mobile , https://www.gamespot.com/articles/call-of-duty-mobile-every-multiplayer-map-detailed/1100-6497557/

### 3.2 MP マップ（基準時点 = 13 枚 + 季節限定）

| 分類 | マップ |
|---|---|
| 初出（2019-10-01） | Nuketown, Crash, Hijacked, Takeoff, Crossfire, Summit*, Standoff, Raid, Killhouse, Firing Range（*Summit は Wiki の "Included" 外・"Season 2" 表記。初出リストは **9 枚**（Nuketown/Crash/Hijacked/Takeoff/Crossfire/Standoff/Raid/Killhouse/Firing Range）と **10 枚**（+Summit）の2説あり → R1 で 1 枚の出入りを解消） |
| 2019 追加 | Summit (S2), Winter Raid (S2), Standoff Halloween（ハロウィン限定） |
| 2020 追加（基準前） | **Scrapyard (S3, 2020-01)**, **Cage (S4, 2020-03)** |

- マップ×モード対応表は GameSpot（2021 版、基準より後）を起点に R1 で基準時点に写す。
- ソース: https://callofduty.fandom.com/wiki/Call_of_Duty:_Mobile （CoDMobile_Maps テンプレート）, https://www.polygon.com/2019/9/18/20872285/

### 3.3 Battle Royale（基準時点）

- **マップは 1 枚のみ: Isolated**（初出マップ。Alcatraz は 2020 S11）
- 基準時点の Isolated POI（2020 S7/S9 タグの POI は基準後で除外）: Bus Station, Countdown, Crash, Diner, Dock, Estate, Farm, Forest, Killhouse, Launch Base, Nuclear Plant, Nuketown, Overgrown, Pier, Pipeline, Practice Range, Sakura, Standoff（初出）+ Circus (S2), Aerial Platform (S3) = **20 POI**
- 構成: Single / Double / Squad（100 名）。期間限定に Warfare（20v20）[単一情報源: Wiki main — R3 で詳細検証]
- 詳細（ゾーン/車両/ロードアウトドロップ/ルート/ミニマップ/終了画面）= **R3 対象**
- ソース: https://callofduty.fandom.com/wiki/Call_of_Duty:_Mobile （CoDMobile_BRLocations テンプレート）

### 3.4 Scorestreaks（基準時点・コア機能）

- 初出 10 種（2019 発表時）: Molotov Cocktail (300), UAV (400), Hunter Killer (500), Airdrop/Care Package (550), Counter-UAV (600), Predator Missile (700), MQ-27 Dragonfire (750), Sentry Gun (800), XS1 Goliath (800), SAM Turret (850), Stealth Chopper (1000), VTOL (1600), Tactical Nuke（武器キル 20/25 条件 — 数値はソース間で差異、R1 で確定）
- **2020 年追加**: Shock RC (450)（gurugamer 2020-05 記事で "new" 表記 → 基準内の可能性あり、R1 で投入時期検証）
- 仕様: **3 スロット装備**（MP メニューから選択）、ポイント到達で発動、**Persistence パークで死亡時にリセットされない**（2022 年にリワーク — 基準はリワーク前仕様）
- 入手経路（現行記述）: BP/シーズンチャレンジ/ショップ。`[単一情報源 — R1 で基準時点の入手経路を検証]`
- ソース: https://www.gfinityesports.com/article/call-of-duty-mobile-scorestreaks-all-confirmed-scorestreaks-and-killstreaks-for-cod-mobile-on-android-and-ios-devices , https://gamerheadquarters.com/articles/call-of-duty-mobile-scorestreaks-guide.html , https://callofduty.fandom.com/wiki/Call_of_Duty:_Mobile

### 3.5 その他コア仕様（基準時点）

- **Operator Skills**: キャラクター毎の個別スキル（時間経過で発動、大ダメージ系）。初出から存在（IW/BO3/BO4 系）[単一情報源: Wiki main — R1/R5 でスキル一覧検証]
- **HUD**: 敵プレイヤー头上に**-health bar 表示**（IW/BO4 方式）+ 肩部赤ランプ [単一情報源: Wiki main — R6 でスクショ検証]
- **メダル**: BO2 ベース。全敵 wipe（20 武器キル）で Nuclear 到達 [単一情報源: Wiki main — R5 で一覧検証]
- **武器**: Gunsmith 前 = **固定ビルド**（アタッチメント無）。武器 XP の挙動（カモ/Blueprint 解放の仕組み）は R1/R5 で検証
- **パーク・ワイルドカード**: 存在確認（Persistence 等）。全一覧 = R1

## 4. 機能マトリックス（最終・R0 確定）

優先度: P0=初版コア / P1=重要（初版後続） / P2=後フェーズ / P3=保留・対象外

優先度: P0=初版コア / P1=重要（初版後続） / P2=後フェーズ / P3=保留・対象外
**参照バージョン列**: M=2020-03-25 初出期 / 26=2026 現在版 / 独=独自（§1.4）

| # | システム | R フェーズ | 参照 | 優先度 | 状態 |
|---|---|---|---|---|---|
| 1 | MP モード（TDM/FFA/Dom/SD/Frontline/KC/Hardpoint + 期間限定） | R1 | M | P0 | 未着手 |
| 2 | 独自マップシステム（**拡張可能** / **JSON 定義 + ビルダ** / MVP 手続き生成 / 本番 3D アップロード）+ CoD デザイン原則 | R1 | 独 | P0 | 未着手 |
| 3 | 武器 — **2026 Gunsmith システム**（ロースター / アタッチメント / ダメージモデル / 武器比較） | R1 | 26 | P0 | 未着手 |
| 4 | パーク / ワイルドカード | R1 | 26 | P0 | 未着手 |
| 5 | Scorestreaks（**2026 版** — 2022 リワーク後: 力関係ベースの段階制 / 3 スロット / ショップ・BP 入手） | R1 | 26 | P0 | 未着手 |
| 6 | Operator Skills（キャラクター別） | R1+R5 | 26 | P0 | 未着手 |
| 7 | 移動モデル（スプリント/スライド/スライドジャンプ） | R1 | 26 | P0 | 未着手 |
| 8 | マッチフロー / HUD / スコアボード | R1 | 26 | P0 | 未着手 |
| 9 | Ranked（MP）— **2026 ランクシステム**（32 ランク / CP / Series / 配置 / デケイ / 報酬） | R2 | 26 | P0 | 未着手 |
| 10 | Ranked（BR）— 受動 XP 制 | R2 | 26 | P1 | 未着手 |
| 11 | BR（**2026 版**: 100 名 / ゾーン / 車両 / 空投 / 複数マップ — **マップ本体は独自手続き生成**） | R3 | 26（マップ=独） | P1 | 未着手 |
| 12 | Zombies（**2026 現在版** = 2022 復活版 classic） | R4 | 26 | P2 | 未着手 |
| 13 | プレイヤー XP / レベル / ダブルXP | R5 | 26 | P1 | 未着手 |
| 14 | 武器 XP / カモシステム（Gunsmith 連動） | R5 | 26 | P1 | 未着手 |
| 15 | バトルパス（2026 構造・報酬） | R5 | 26 | P2 | 未着手 |
| 16 | 通貨（CP/Credits）/ ショップ | R5 | 26 | P2 | 未着手 |
| 17 | ブループリント / キャラ / スキン / チャーム | R5 | 26 | P2 | 未着手 |
| 18 | イベント（期間限定モード/ダブルXP） | R5 | 26 | P3 | 未着手 |
| 19 | パーティ / フレンド / チャット | R6 | 26 | P1 | 未着手 |
| 20 | 設定（映像/音声/操作/感度 — Web マッピング表） | R6 | 26 | P1 | 未着手 |
| 21 | UI 全画面（**2026 画面構成 1:1**。ハブ/Locker/Stats/Ranked 画面等） | R6 | 26 | P0 | 未着手 |
| — | DMZ / Undead Siege | — | — | P3 | 除外 |
| — | Control / 2024 以降の新モード | — | — | P3 | 除外（モード一覧 M 固定） |

## 5. 各フェーズへの引き継ぎ（要検証項目リスト）

- **R1**: ①**独自マップの JSON schema 要求**（モード別メタデータ: オブジェクト点 / ボムサイト / スポーン / ゾーンアンカー / BR の POI）②**CoD マップのデザイン原則**（代表 1 枚の深掘り: レーン / カバー密度 / 視野線 / スポーン保護 / モード別サイズ感）+ 手続き生成（モジュールキット）の実現性 ③（本番）3D アップロード管道の要求（glTF 等 → collision → スポーン/オブジェクトタグ）④**2026 武器ロースター + アタッチメントシステム**（スロット / 適合 / 各アタッチメントの統計効果）+ ダメージモデル（部位倍率 / 距離減衰）+ 武器比較機能 ⑤2026 パーク・ワイルドカード全一覧 + 効果値 ⑥2026 Scorestreaks（リワーク後の段階制 / ポイント獲得ルール / 入手経路）⑦Operator Skills 一覧 ⑧移動パラメータ ⑨各モードの勝利条件・ルール（**2020-03-25 基準値**）+ 期間限定モード（Gunfight 等）の扱い
- **R2**: ①**2026 ランク表**（32 ランク / 各 Tier 閾値 / CP 帯 / Grand Master）②Series（2 か月）の振る舞い・集結・降段 ③配置試合の詳細 ④デケイ / シールド / 離脱ペナルティ ⑤ランク毎報酬（現行シーズン例）⑥MP Ranked プレイリスト（2026: 5 コア + 期間限定）
- **R3**: ①**2026 BR のマッチフロー**（ロードアウト事前選択 / ガンシップ / ドロップ / ゾーン / 終了画面）②ゾーン設計（フェーズ / 縮小 / 域外ダメージ）③車両（種別 / 挙動）④空投（頻度 / 内容）⑤ルート / 武器配置ルール ⑥100 名の構成 / スポーン ⑦**独自 BR マップ（手続き生成）への設計要件**（POI 数 / ゾーンアンカー / 規模）⑧Web スケーリング案（32/48 名化）
- **R4**（**2026 現在版** = 2022 復活版 classic）: マップ / ウェーブ構成 / 経済 / ミステリーボックス / パーク / 4 人制（2019 版は対象外）
- **R5**: ①武器 XP / カモ（**Gunsmith 連動の 2026 仕様**）②BP の 2026 構造（レベル数 / フリー&プレミアム / 通貨）③CP / クレジットの経済 ④ショップ / ⑤イベント（ダブルXP / チャレンジ）
- **R6**: ①**2026 全画面遷移**（ユーザースクショ + Wiki）②HUD 要素（health bar / ミニマップ / キルフィード / スコアピップ / ゾーンタイマー）③設定項目の Web マッピング ④パーティー / フレンド / チャットのフロー ⑤訓練モード / The Club の採用判定材料

## 6. ソース一覧（R0 で使用）

| ソース | URL | 用途 |
|---|---|---|
| Activision 公式ブログ（Ranked 導入） | https://blog.activision.com/call-of-duty/2020-01/Introducing-Ranked-Mode-to-Call-of-Duty-Mobile | Ranked 一次情報 |
| Activision 公式ブログ（リリース告知） | https://blog.activision.com/call-of-duty/2019-09/Announcement-Call-of-Duty-Mobile-launches-on-October-1 | リリース日 |
| CoD Wiki（ゲーム主ページ） | https://callofduty.fandom.com/wiki/Call_of_Duty:_Mobile | マップ/シーズン/モード/Zombies 経緯 |
| CoD Wiki（Ranked Mode） | https://callofduty.fandom.com/wiki/Ranked_Mode | Ranked 仕様 |
| Wikipedia（CoD Mobile） | https://en.wikipedia.org/wiki/Call_of_Duty:_Mobile | リリース日/Zombies 除去/モード一覧 |
| TechRaptor | https://techraptor.net/gaming/news/call-of-duty-mobile-zombies-is-being-removed-soon | Zombies 除去の公式引用 + Hardpoint 恒久化 |
| Gfinity（Scorestreak 初出リスト） | https://www.gfinityesports.com/article/call-of-duty-mobile-scorestreaks-all-confirmed-scorestreaks-and-killstreaks-for-cod-mobile-on-android-and-ios-devices | Scorestreak 数値 |
| Gamer Headquarters（2019-07 beta） | https://gamerheadquarters.com/articles/call-of-duty-mobile-scorestreaks-guide.html | 3 スロット/カスタム |
| zilliongamer（2020-02） | https://zilliongamer.com/call-of-duty-mobile/c/news/cod-mobile-rank-mode-selection | 初期 Ranked プレイリスト |
| GameSpot（マップ詳細） | https://www.gamespot.com/articles/call-of-duty-mobile-every-multiplayer-map-detailed/1100-6497557/ | マップ×モード |
| Polygon（2019-09） | https://www.polygon.com/2019/9/18/20872285/call-of-duty-mobile-release-date-october/ | 初出モード/マップ |
| Daily Express（2019-11） | https://www.express.co.uk/entertainment/gaming/1207264/ | Zombies 初出日 |
| igitems（2026） | https://igitems.com/post/understanding-the-ranked-system-in-call-of-duty-mobile | 現行ランク表（基準外・参考） |

## 7. スクリーンショット依頼（R6 準備・第1弾 — **2026 現行版がそのまま 1:1 対象**）

1. メインハブ（トップメニュー）
2. マルチロビー（マップ/モード選択画面）
3. Gunsmith（武器カスタム画面 — アタッチメントスロット / 統計表示）
4. ロッカー（武器 / キャラ / 装備 サブタブ）
5. Ranked メニュー（ランク表示+報酬トラック）
6. BR ロビー（スクワッド/ロードアウト事前選択）
7. マッチ内 HUD（MP — health bar/スコア/アモ確認用）
8. マッチ終了画面（MP — 結果 / XP / 武器 XP 表示）

> 注: ユーザーのゲームは 2026 現行版 = **UI 1:1 の対象そのもの**（§1.4 改訂により 2019-2020 メディアとの突合は不要）。除外対象（DMZ / Undead Siege / Control 等）の要素は R6 で「除外マーク」を付けて画面グラフに記録する。

## 8. 進捗と次ステップ

- [x] R0: 参照基準確定 + Zombies 経緯の訂正 + コンテンツ棚卸 + 機能マトリックス確定
- [x] R0 改訂（2026-09-24 ユーザー指示）: **ハイブリッド基準へ**（§1.4 — モード=初出期 / 武器・他機能=2026 / マップ=独自・拡張可能・MVP は JSON+手続き生成・本番 3D アップロード）
- [ ] **R1 開始**（独自マップ JSON schema 要求 + CoD マップデザイン原則 + 2026 武器/Gunsmith + パーク + Scorestreaks + 移動 + マッチフロー + モード定義[初出期値]）

## 9. ユーザー決定の記録（確認済み）

1. ~~基準確定の了承~~ → **2026-09-24 ユーザー指示で §1.4 ハイブリッド基準に置き換え**:
   - マップ: 独自。1 枚に固定せず**拡張可能**。**MVP はコードで作成（JSON 形式のマップ定義）**、本番は 3D モデルアップロード
   - 武器システム: **2026 年の同程度**（Gunsmith 世代）
   - モード: **初出期のまま**（TDM/FFA/Dom/SD/Frontline/KC/Hardpoint）
   - その他の機能: **2026 年現在版**

# ログ: 物理を three-mesh-bvh のキネマティックCC へ確定、3D Mesh Map、XState アニメFSM

- 日時: 2026-09-03
- 種別: docs（設計仕様の確定・更新）
- ブランチ: arena/01a062ac-cod-web
- 前提: 権威サーバー設計 `docs/arch/server-authority.md`（`8b4b07c`）

## ユーザー指示

1. 物理演算は **three-mesh-bvh** を使い、FPS プレイヤーに必要な**キネマティック・キャラクターコントローラー（疑似リジッドボディ）**を作る。
2. マップは **3D Mesh Map**（GLTF メッシュ）を使う。
3. アニメーション遷移は **XState** を使う。

## Web 調査で確認した事実

- **three-mesh-bvh はヘッドレスで動作**: BVH 生成・CPU の raycast/shapecast/ジオメトリクエリはブラウザ API（WebGL）を使わず、node/bun でそのまま動く（作者 gkjohnson の discourse 回答: "All CPU-queries will work just fine in node. No special browser APIs used."）。→ **サーバー権威側でも同一 BVH で衝突計算できる**。
- **定石**: pmndrs の **BVHEcctrl**（R3F 向け・物理エンジン不要・three-mesh-bvh でカプセル衝突。階段/坂/凹凸を浮遊カプセルで処理、重力/浮遊高さ/最大坂角/衝突反復等のパラメータ完備）。three-mesh-bvh 公式にもカプセル shapecast のキャラクターコントローラ例。
- **XState v5**: `createMachine`/`setup`/`createActor`/`fromPromise`。Three.js の AnimationMixer と組み合わせてアニメ FSM を駆動する定石記事あり（状態変化で mixer 再生、one-shot 遷移は mixer `finished` を promise で待つ）。
- FSM と Blend Space の役割分担（UE5 準拠の考え方）: **状態質が変わる切替（接地↔空中、通常↔射撃/リロード）= ステートマシン**、**同じ動作内の連続ブレンド（idle↔walk↔run、移動速度）= ブレンドスペース**。

## 確定した設計への反映

- **物理エンジン（Rapier）はプレイヤー移動に使わない**: three-mesh-bvh の**カプセル shapecast による浮遊キャラクターコントローラー（疑似リジッドボディ）**を shared の純粋関数で自前実装。重力積分＋地面/壁/坂/段差の衝突解決。衝突も射撃レイも同一 BVH に統一。
- **マップは 3D Mesh Map（GLTF）**: そのジオメトリから BVH を構築。クライアント/サーバーで同一マップ→同一 BVH→同一 shapecast 結果で予測と権威が一致。
- **ヘッドレスサーバーの依存ルールを是正**: サーバーはレンダラー（WebGPU/WebGL）・react・DOM を使わないが、**three の core/math（Vector3/Capsule/Geometry）と three-mesh-bvh は CPU のみなので shared 経由で使用可**。「サーバーは three を import しない」という旧 modules.md ルールを修正。
- **アニメ遷移は XState v5 の FSM**（クライアントのみ）。サーバーは FSM を持たず、isGrounded/移動速度/フラグといった権威状態を送るだけ（アニメはクライアント決定論的再生）。Rapier/ecctrl（Rapier ベース）はプレイヤーには不使用、動的剛体が必要になった段階で再検討。

## 更新ファイル

- `docs/arch/tech-stack.md`: §2 物理章を「three-mesh-bvh 統一（キネマティックCC + 3D Mesh Map + 射撃レイ）」に書換、Rapier/ecctrl をプレイヤー不使用に。§3 ecctrl→BVH キネマティックCC。§8 xstate を「アニメ遷移に採用 v5」に。
- `docs/arch/server-authority.md`: §2 判断表（キャラクター物理・アニメ行）、§3 プロセス構成（サーバーが three core/math + three-mesh-bvh をヘッドレス利用）、§5 物理（カプセル shapecast キネマティックCC・BVH・ヘッドレス可）、§6.5 共有移動（CollisionWorld=BVH・アニメは XState）、§9（Rapier は動的剛体要否として）。
- `docs/arch/modules.md`: 依存ルール（server/shared は three core/math + three-mesh-bvh 可、レンダラー/react/DOM 不可）、server/physics ディレクトリ説明、client/player 説明を更新。
- `README.md`: 物理行を three-mesh-bvh 統一、アニメ行に XState。
- `.agent/skills/tech-stack.md`: 物理テーブル・アニメ・サーバー方針を反映。

## 検証

- docs-only。相対 .md リンクチェック BROKEN 0、Rapier/ecctrl の古い肯定記述を grep で一掃（不使用注記以外の残存なし）。

## デベロッパーからの追加助言（② GLTF ヘッドレス読込・BVH 事前シリアライズ、同日追記）

デベロッパーより 2 点の資産パイプライン助言:

1. **ヘッドレス（bun）での GLTF 読込と BVH 事前シリアライズ**: サーバーで GLTFLoader を直接使うと `window`/`Image` 等のブラウザ API 依存でエラーになりうる → **ビルド時に GLTF からジオメトリを取り出して BVH を事前生成し、`MeshBVH.serialize()` でバイナリ書き出し**。サーバー/クライアントとも起動時は `MeshBVH.deserialize()` でロードするだけにすれば**起動ほぼ0秒**・サーバーで重いジオメトリ解析不要。
2. **射撃レイキャストも同じ BVH を使い回す**: 移動衝突だけでなくヒットスキャンも `bvh.raycast()` で同一 BVH を使用 → サーバーの当たり判定・ラグ補償巻き戻し実装コストが下がる。

Web 調査で API 確認: `MeshBVH.serialize(bvh)` → `{roots: ArrayBuffer[], index}`、`MeshBVH.deserialize(data, geometry)`（root バッファを共有・コピーなし、ワーカー生成にも使用）。GLTF に専用拡張 `three_mesh_bvh` でアクセサ埋め込みする定石 gist も存在。

### 反映
- `docs/arch/server-authority.md`: §5.1「マップ BVH のビルド時事前生成とヘッドレス読込」（serialize 2案＝GLTF拡張埋め込み / `.bvh` サイドカー、クライアントは GLTFLoader+deserialize、**サーバーは GLTFLoader を使わず position+BVH バッファのみ直接読んで deserialize**、`CollisionWorld` は「ビルド済み BVH を deserialize で受け取る」境界に統一）、§5.2「同一 BVH の使い回し（移動・射撃・ラグ補償。マップは静的なので巻き戻し不要）」を追加。Phase 1 は平面/簡易ジオメトリで位置同期を検証し、GLTF マップ＋事前生成パイプラインはアセット/マップ導入フェーズで整備。
- `docs/arch/tech-stack.md`: §13 アセットパイプライン表に three-mesh-bvh の serialize/deserialize（ビルド時事前生成）行を追加。
- `.agent/skills/tech-stack.md`: BVH 事前生成・ヘッドレス読込・同一 BVH 使い回しのノウハウを追記。

## 追加決定 (3): アーキテクチャ＝データ指向（ECS スタイル）

**背景**: ゲームシミュレーション本体を深い OOP 継承で組むかデータ指向（ECS）にするか。ネット FPS では毎フレーム多数のオブジェクトを決定論的に回し、状態をスナップショット送信・ラグ補償で巻き戻す必要がある。

**決定（ユーザー確定）**:
- **シミュレーション本体（`shared/sim`・権威サーバー）はデータ指向（ECS スタイル）**。エンティティ＝整数 ID、状態＝フラットなコンポーネント配列、ロジック＝純粋システム関数（`stepMovement(state, input, dt, world) → state` など）。深い OOP 継承はホットパスで使わない。
- **理由**: ①クライアント予測とサーバー権威が同一関数を回す**決定論**と相性、②ホットループの**ゼロアロケ/GC レス**、③状態がフラットで**スナップショット/巻き戻し履歴**を配列でそのまま持てる、④後で TypedArray 実装へ載せ替えやすい。
- **境界層は通常 OOP/React でよい**: React/R3F コンポーネント・Room・NetTransport クライアント・XState actor・WS ソケットはシミュレーションのホットパスではないためクラス/React 可。
- **ECS ライブラリは後入れ・使い分け**: Phase 1（~40 体の位置同期）は ECS 形の**プレーンな typed 配列＋純粋関数**で開始し、弾丸/bot が数千体規模になる段階で:
  - **bitecs** → `shared/` と権威サーバーのコア ECS（TypedArray・GC レス・ヘッドレス・決定論）。
  - **miniplex / @miniplex/react** → クライアント表現層（R3F）専用（エンティティ↔メッシュ/ref 結合・ライフサイクル宣言的管理）。サーバーは持たない。
  - システムは「配列に作用する純粋関数」の形で書き、bitecs への載せ替えを容易にする。
- **反映**: `docs/arch/tech-stack.md` §5（パラダイム確定ブロック＋bitecs/miniplex 役割分担表）、`docs/arch/modules.md`（shared/ecs と client ecs/ の説明・shared データ指向方針）、`.agent/skills/tech-stack.md` ECS 章。

## 追加決定 (4): レート構成の分離（シム 60Hz / 送信 30Hz / 入力 60Hz / sub-tick 射撃）

**背景**: 当初「全レート一律 30Hz」としていたが、ユーザーから「30 TPS は良くない、最近は 60 TPS が主流では」と指摘。調査した上で再設計。

**調査（実績値）**:
- 競技系は高 tick: **Valorant 128 / CS2 64Hz＋sub-tick / CoD MW 60-120 / R6 Siege 60 / Halo 60 / Overwatch2 ≈63**。一方 **Fortnite 30 / Apex 20 / Tarkov 12-16** と幅広い。
- **tickrate のコストは帯域ではなくサーバー CPU**。128tick でも 100-150 kbps/人、64→128 で +20-30 kbps 程度。
- **CS2 の sub-tick**: 射撃などのイベントを tick 境界に量子化せず**正確なクライアントタイムスタンプ（マイクロ秒）**を付け、ラグ補償で時系列順に解決。tick を上げずに命中精度を確保する仕組み。

**決定（ユーザー確定: sim60_send30）**:
- **シミュレーション tick = 60Hz**（dt = 1/60s ≈ 16.7ms、アキュムレータで固定ステップ）。
- **入力送信 C→S = 60Hz**（シム tick と 1:1。各 tick で最新入力を 1 つ消費）。
- **スナップショット送信 S→C = 30Hz**（1 tick おき。モバイルは 20Hz 可）。リモートは 50-100ms 補間バッファで滑らか。
- **クライアント描画 = 可変 rAF**（60-120Hz+、60 は下限フロア）。
- **射撃は sub-tick（CS2 型）**: tick 境界に丸めず正確なクライアントタイムスタンプを付け、ラグ補償の巻き戻しで時刻順に解決。128Hz まで上げずに命中精度を得る。
- 全レートは `shared/protocol/constants.ts` の名前付き定数とし、Phase 1 で 30/60 をプロファイル計測。CPU が厳しければシム tick を定数で下げられる設計。
- **分離の理由**: 60Hz シムで命中・ラグ補償履歴が密（100ms で 6 サンプル vs 3 サンプル）になり当たり判定が精緻化。送信まで 60Hz にすると帯域/モバイル/サーバー上り CPU が増えるため、送信は 30Hz 据え置きで分離。
- **反映**: `docs/arch/networking.md`（レート基本ブロック・入力/スナップショット/ラグ補償行・サマリ表）、`docs/arch/server-authority.md`（レート表・Room/sim 記述・§5 tick ループ・§6 パケット・ロードマップ）、`docs/arch/modules.md`、README・docs/README・task-list・game-engineering-principles・skills/project-overview・skills/index の 30Hz tick 記述を全て整合。

## 次

設計は確定。Phase 1（位置同期）の**計画書** `docs/planning/PHASE01_PLAN.md` 作成はユーザーの「Go」待ち。

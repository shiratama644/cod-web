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

## 次

設計は確定。Phase 1（位置同期）の**計画書** `docs/planning/PHASE01_PLAN.md` 作成はユーザーの「Go」待ち。

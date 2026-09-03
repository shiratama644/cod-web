# Tech Stack Skill — 技術構成を使いこなす

> **スキル**: 実装時に「どのライブラリをどこでどう使うか」を判断し、ハマらずに使うためのノウハウ。
> 設計の正本（技術選定・プロトコルの事実）は仕様書 [`../../docs/arch/tech-stack.md`](../../docs/arch/tech-stack.md)。ここではそれを踏まえた「使い方・選び方・注意点」を持つ。
> プロジェクト初期化（Phase 0）後に、実際のバージョンで動かして分かったコツ・ハマりどころを追記して育てる。

## レンダリング（3D）

| ライブラリ | 役割 | 使いどころ |
| :--- | :--- | :--- |
| `three` | 3D レンダリングエンジン | 全 3D の基盤。WebGPU レンダラー（`three/webgpu`）+ TSL、WebGL2 へ自動フォールバック |
| `@react-three/fiber` | React 用 Three.js ラッパー | 宣言的シーン。`useFrame` で毎フレーム更新 |
| `@react-three/drei` | R3F ユーティリティ集 | `Environment` / `PointerLockControls` / `Html`（3D内HTML）/ `PositionalAudio` / `useGLTF` / `useTexture` / `Preload` 等 |
| `troika-three-text` | SDF 3D テキスト | 頭上ネームタグ・ダメージポップアップの高速描画 |

## 物理・当たり判定

| ライブラリ | 役割 |
| :--- | :--- |
| `three-mesh-bvh` | **衝突も射撃も統一**。高速 BVH レイキャスト/shapecast。**プレイヤーのキネマティックCC（疑似リジッドボディ・浮遊カプセル）のマップ衝突**と射撃判定の両方に使う |
| BVHEcctrl（pmndrs） | 物理エンジン不要の R3F 向け BVH キャラクターコントローラ。**設計参考のみ**（コアは shared の純粋関数で決定論・共有、R3F は薄く巻く） |
| ~~@react-three/rapier / Rapier（サーバー）~~ | プレイヤー移動には**不使用**。three-mesh-bvh のキネマティックCC で足りる。動的剛体（投擲・崩壊物）が必要になったら再検討 |

> **重要**: three-mesh-bvh の BVH 生成・shapecast・raycast は **CPU のみで WebGL 不要**（作者 gkjohnson 確認）。だから **ヘッドレス bun サーバーでも three core/math と three-mesh-bvh を import して同一 BVH で権威衝突計算ができる**。マップは **3D Mesh Map（GLTF）** から BVH を構築し、クライアント/サーバーで同一マップ→同一 BVH を使う。レンダラー（WebGPU/WebGL）・react/DOM はサーバーでは使わない。
>
> **BVH はビルド時に事前生成して serialize して配る**: 実行時に毎回 `new MeshBVH(geometry)` しない。ビルドスクリプトで `MeshBVH.serialize(bvh)` → `{roots: ArrayBuffer[], index}` をバイナリ化し、GLTF の `three_mesh_bvh` 拡張に埋め込むか `.bvh` サイドカーとして置く。ランタイムは `MeshBVH.deserialize(data, geometry)` するだけ（起動ほぼ0秒・root バッファ共有）。**サーバーは GLTFLoader（window/Image 依存）を使わず、position + BVH バッファだけ直接読んで deserialize**（テクスチャ/マテリアル不要）。移動 shapecast と射撃 raycast は同一 BVH を使い回す（ラグ補償の巻き戻しも同じ。マップは静的なので巻き戻し不要、動的プレイヤーだけ巻き戻す）。
| `three-bvh-csg` | リアルタイム CSG（弾痕・破壊表現） |

## ECS・大量オブジェクト

- **パラダイム（確定）**: シミュレーション本体（shared/sim・権威サーバー）は**データ指向（ECS スタイル）**。エンティティ＝整数ID、状態＝フラットなコンポーネント配列、ロジック＝純粋システム関数。深い OOP 継承はホットパスで使わない（決定論・ゼロアロケ・スナップショット/巻き戻しとの相性）。境界層（React/R3F・Room・NetTransport・XState actor・WS ソケット）はクラス/OOP 可。
- **ライブラリは後入れ・使い分け**: Phase 1（~20体）は ECS 形のプレーンな typed 配列＋純粋関数で開始し、弾丸/bot が数千体規模になったら bitecs をコアに導入（システムは配列に作用する形で書き載せ替え容易にする）。
  - `bitecs`: **shared/サーバー権威シム**のコア ECS（TypedArray・GC レス・ヘッドレス・決定論）。数万エンティティを高速処理。
  - `miniplex` / `@miniplex/react`: **クライアント表現層（R3F）**専用。エンティティ↔メッシュ/ref 結合・ライフサイクル（弾丸・ドロップ・エフェクト）を宣言的に。サーバーは持たない（ヘッドレス）。

## ネットワーク

> ✅ **トランスポートは確定**（2026-09-03、詳細は [`../../docs/arch/networking.md`](../../docs/arch/networking.md)）。**WebTransport 主 / WebSocket フォールバック**。

| 技術 | 用途 | 特性 |
| :--- | :--- | :--- |
| **WebTransport**（ブラウザ標準） | **主トランスポート** | HTTP/3・QUIC over UDP/443。datagrams（非信頼・HOL なし）= 座標・入力・状態、streams（信頼）= ダメージ確定・チャット。NAT 越え（STUN/TURN）不要。Chrome97+/FF114+/Safari26.4。**UDP/443 ブロック・非対応時は WS へ自動フォールバック** |
| **WebSocket**（`ws` / Bun.serve） | フォールバック＆信頼チャネル | チャット・ロビー・マッチメイキング、WT 不可環境のゲームプレイ。bun ネイティブ（uWS）。Krunker.io も socket.io 方式 |
| **Caddy**（HTTP/3 エッジ） | HTTP/3・WebTransport 終端 | bun は WT サーバー未実装のためエッジで終端し bun（WS＋ロジック）へプロキシ。bun の WT 対応後に寄せる |
| ~~geckos.io~~ | 不採用 | WebRTC-UDP だが node-datachannel ネイティブ依存で bun 非互換の恐れ、別 UDP ポートが FW に弱い |
| ~~Colyseus~~ | 不採用（パターン参考のみ） | WS ファーストで独自 schema 同期が 30Hz/msgpackr/WT 方針と二重化するため使わない。ルームライフサイクル・seat reservation・固定ステップ netcode の**設計パターンだけ**自前サーバーに取り込む（[arch/server-authority.md](../../docs/arch/server-authority.md)） |
| `livekit-client` | WebRTC ボイス（後方フェーズ） | 近接ボイチャ。WebRTC MediaStream/SFU でゲームデータとは別系統 |
| **msgpackr** | バイナリシリアライズ | **低頻度の信頼イベント**（チャット・ルーム・購入）で採用。高頻度は手動バイナリ固定レイアウト（下記） |
| protobufjs | 将来の選択肢 | スキーマ厳密管理が必要になった場合 |

**tick/入力/描画**: サーバー tick・スナップショット = **30Hz**、**入力送信 = 60Hz**（~16ms ごと、tick と独立。入力は ~12B なので帯域誤差）。描画 = **可変フレームレート（60〜120Hz+、rAF 準拠、60 は下限フロア）**でいずれとも独立、delta time ベース。

**高頻度パケット（入力/スナップショット）は手動バイナリ固定レイアウト（DataView/ArrayBuffer）で Phase 1 から**: 入力 ~12B（seq:u32 / move:int8×2 / yaw:u16 / pitch:int8 / flags:u8 / dt:u16）、20 人スナップショット ~330B（ヘッダ serverTick+lastAckSeq 8B、1 人 16B = id:u16 / pos:int16×3 を 0.01m 固定小数点 / vel:int16×3 / yaw:u16）。**MTU ~1200B に 1 発収容**（20 人でも大幅に余裕）・ゼロアロケ（静的バッファ再利用）・リトルエンディアン。座標 int16 は原点 ±327m のため、広域マップは相対オフセット/int32 化が将来課題。バックプレッシャ: 送信前にソケットバッファ（bun は `ws.send` 戻り値/`bufferedAmount`/`backpressureLimit`）を見て、詰まったクライアントはスナップショットを間引く（最新だけ送る）。リモート補間は 50〜100ms バッファ＋過去2フレーム Lerp。詳細は [arch/server-authority.md](../../docs/arch/server-authority.md) §6。

## UI / 状態

- **Zustand**: ゲーム状態（HP / 残弾 / キルログ / スコア / プレイヤー座標）。**Context API は新規使用しない**。毎フレーム更新は `getState()` / `subscribe` で React レンダリングを介さない（[arch 仕様書 game-engineering-principles](../../docs/arch/game-engineering-principles.md)）。
- Radix UI: 設定メニュー・クロスヘア選択・スコアボード・スライダー等のアクセシブル UI。
- framer-motion: キルフィード・被弾赤フラッシュ・ヒットマーカー等の UI モーション。
- `lucide-react`: アイコン。

## オーディオ

- drei `PositionalAudio` / Web Audio API HRTF: 足音・銃声の方向・距離定位。
- `howler.js`: BGM / UI 効果音 / 環境音の同時発音数制御・プリロード。
- `resonance-audio`: HRTF・残響・遮蔽（オクルージョン）。

## アセットパイプライン

- drei `useGLTF` / `useTexture`（`preload()` 付き、Suspense 対応）。
- `gltfjsx`: GLTF → React コンポーネント化。
- `three-stdlib`: KTX2Loader / DRACOLoader 等の拡張ローダー。
- DRACO / meshoperator / KTX2 (Basis Universal): メッシュ・テクスチャ圧縮（モバイル VRAM 対策）。
- `@gltf-transform/core`: ポリゴン削減・KTX2 変換・LOD 自動生成（ビルドツール）。

## VFX・アニメーション・シェーダー

- パーティクル: `three.quarks` 等。`InstancedMesh` / `BatchedMesh` で Draw Call 削減。
- ポストプロセス: `@react-three/postprocessing`。
- アニメーション: **状態遷移は XState v5 の FSM で駆動**（idle/walk/run/jump/fall/crouch/ADS/射撃/リロード。`createMachine`/`createActor`、状態変化で drei `useAnimations` のミキサーを再生、one-shot 遷移は mixer の `finished` を待つ）。連続ブレンド（idle↔walk↔run）はブレンドスペース。状態質の切替（接地↔空中等）を FSM で。サーバーは FSM を持たず権威フラグ（isGrounded/移動速度）だけ送る。IK は three-stdlib/three-ik の CCDIKSolver。WebGPU compute は TSL。

## ツールチェーン

| 用途 | 技術 |
| :--- | :--- |
| ビルド/Dev | Vite（`bun run dev` / `bun run build` / `bun run preview`） |
| Lint/Format | **Biome**（ESLint/Prettier 不使用） |
| Unit | **Vitest** + @testing-library/react（jsdom） |
| E2E | **Playwright**（Chromium、CI のみ・Sandbox 実行不可、[sandbox-constraints.md](./sandbox-constraints.md)） |
| パッケージ / ランタイム | **bun**（`bun install` / `bun run` / `bunx`、`bun.lock`）+ Node LTS（`.nvmrc`）。ゲームサーバーも bun ランタイムを想定 |

## 導入時の注意（Phase 0 で実機確認したコツ・ハマりどころ）

> 2026-09-03 Phase 0 で固定した実バージョン: **react 19.2.8 / react-dom 19.2.8 / vite 8.2.2 / typescript 7.0.2 / three 0.185.1 / @react-three/fiber 9.7.0 / @react-three/drei 10.7.8 / zustand 5.0.15 / vitest 4.1.11 / jsdom 30 / @biomejs/biome 2.5.11 / @types/node 26**。bun は devDependency で exact 固定（`bun add -d bun@1.4.0 --exact`）。

- **bun**: Sandbox ではプリインストールされていない。`bun.sh` は SSL エラーで到達不可だが、**npm registry 経由なら導入可**（2026-09-03 に `bun 1.4.0` で install / run / test 動作確認済み）。導入は `npm install -g bun`、復旧は `restore-sandbox-env.sh`。テストランナーは Vitest を使い `bun test` は使わない（AGENTS.md §6.1）。

### WebGPU / R3F（P0-D で確認）

- **R3F v9 で WebGPU** を使うには `<Canvas gl={asyncFactory}>` に非同期ファクトリを渡す。ファクトリは `new WebGPURenderer({ antialias:true, forceWebGL:false, ...props })`（`three/webgpu` から import）→ `await renderer.init()` して返す。v10 では `renderer` prop になる予定（執筆時点 v9）。
- **WebGPU 不在時は明示的に WebGL2 へフォールバック**: `navigator.gpu?.requestAdapter()` を自前判定（`three/webgpu` の自動フォールバックに頼り切らず、どのバックエンドかを HUD に出して目視確認できるようにした）。WebGLRenderer に渡すプロパティには WebGPU 固有の `context`（GPUCanvasContext）を含めないこと（型エラーになる）。canvas と antialias だけ渡す。
- ファクトリの引数は `HTMLCanvasElement` ではなく **R3F のレンダラープロパティオブジェクト**（canvas を含む）。`glProps: Record<string, unknown>` で受けてそのまま WebGPURenderer に spread する。

### ツールチェーンのバージョン差（TS7 / Biome2 / Vite8）

- **TypeScript 7 で `baseUrl` 廃止**: `paths` は相対パスで書く（`"@/*": ["./src/*"]`）。`baseUrl: "."` は TS5102 でエラー。
- **Biome 2.x**: ① linter の `rules.recommended: true` は deprecated → **`rules: { preset: "recommended" }`**。② `biome migrate` が吐くネガティブグロブ（`!!**/!**/dist/**`）は不正でエラー。**`vcs.useIgnoreFile: true` にすれば .gitignore で除外されるので `files.includes` は書かない**のが一番シンプル。
- **ESM の `vite.config.ts` / `vitest.config.ts` では `__dirname` が未定義**。`path.dirname(fileURLToPath(import.meta.url))` を使う。
- **Vite のライブプレビュー（e2b.app プロキシ配下）では `server.allowedHosts: true`（preview も）が必須**。未設定だと Vite が 403 "Blocked request" を返す。`host:true`（0.0.0.0 バインド）と併用。

### テスト（Vitest 4 / jsdom）

- **R3F `<Canvas>` は jsdom で WebGL 無しのためレンダリングテストしない**。WebGL 非依存の DOM コンポーネント（HUD 等）と純粋ロジック（store の getState/subscribe・純粋関数）をテストする。ゲームロジックは純粋関数として WebGL/React から分離して書くとテストできる。
- **jest-dom マッチャー（`toBeInTheDocument` 等）の型を tsc に認識させる**: `src/vite-env.d.ts` に `/// <reference types="@testing-library/jest-dom" />`、かつ `vitest.setup.ts`（`@testing-library/jest-dom/vitest` を import）を `tsconfig.json` の include に追加。vitest 実行時は setupFiles で動くが、tsc は include を見る。

### Zustand（P0-F で確認）

- ストア本体をフック（`useGameStore`）として export しつつ、React 外（R3F のレンダラー生成・useFrame ループ）からは `useGameStore.getState()` / `.subscribe()` をラップした `gameStoreApi` を使う。毎フレーム動くループでフックを呼ばないこと。
- 高頻度値（座標・回転）はストアに入れず three の ref を直接更新。ストアは HP・残弾・描画バックエンド等の低頻度・UI 表示値に限定。
- ライブラリの API 仕様に不安があれば Web 検索（threejs.org / docs.pmnd.rs / colyseus.io 等の公式を優先、AGENTS.md §7.5）。
- ネットワークは **WebTransport 主 / WebSocket フォールバック**で確定（[networking](../../docs/arch/networking.md)）。bun は WebTransport サーバー未実装（HTTP/3 は v1.3.14 で実験サポート、WT は issue #13656 で進行中）のため、初期は Caddy エッジで HTTP/3 終端 → bun（WS＋ロジック）。WT の bun ネイティブ対応状況は Phase 1 で再調査。
- ブラウザは WebTransport が Safari26.4（2026-03）で Baseline 入り。古い Safari・iOS WebView・UDP/443 ブロック企業網では WS へフォールバックが必須。
- geckos.io は不採用（node-datachannel ネイティブ依存で bun 非互換の恐れ、別 UDP ポートが FW に弱い）。
- **権威サーバーは自前の軽量実装（bun `Bun.serve` + ネイティブ WS）**。Colyseus はライブラリ不使用で設計パターン（onCreate/onJoin/onLeave、seat reservation、固定ステップ）だけ拝借。サーバー/クライアントのプレイヤー物理は **three-mesh-bvh のキネマティックCC（浮遊カプセル・3D Mesh Map の BVH に shapecast）を shared の純粋関数で**。Rapier はプレイヤーには使わず、動的剛体が要る段階で再検討。**Phase 1 は WebSocket で位置同期**を通す（WT は Caddy 終端→bun 中継経路の検証後に有効化）。ルームは最大 20 人で初期は AOI 不要・フルスナップショット。詳細は [arch/server-authority.md](../../docs/arch/server-authority.md)。
- **「uWebSockets.js を使え」は bun では追加インストール不要**: bun の WebSocket は内部で uWebSockets を使用し、TCP_NODELAY・pub/sub・backpressure が組込み済み。Node 向け `uWebSockets.js`（git パッケージ）は bun で動作しない（bun メンテナ Jarred Sumner 談）。bun ネイティブ WS をそのまま使う。
- **Krunker.io は socket.io（WebSocket/TCP）で動作**し、クライアント予測＋ラグ補償で高速感を実現。「ブラウザFPS＝UDP 必須」ではない。

### Phase 1 で判明したハマりどころ（ネットワーク実装）

- **three-mesh-bvh は bun/node のヘッドレスでそのまま動く**: `new MeshBVH(geometry)`・`bvh.raycastFirst(ray, DoubleSide)`・shapecast は DOM/WebGL を要求しない。サーバー/shared は three の core/math（Vector3/Ray/BoxGeometry/BufferAttribute…）と three-mesh-bvh だけ import し、**GLTFLoader（window/Image 依存）はサーバーで使わない**。`bvh.raycast(ray, side)` は `Intersection[]` を返す（point/distance/faceIndex を持つ）。
- **bun の WS 型**: `Bun.serve<SocketData>({ websocket: {...} })` のジェネリクスは data 型 1 つだけ。`server.upgrade(req, { data: { ... } })` は第 2 引数の data が必須。`ws.data` で接続ごとの状態（playerId）を持つ。
- **クライアントはサーバーを直叩きしない**: ブラウザは同一オリジンの `/ws` に接続し、Vite dev/preview の `server.proxy['/ws'] = { target: 'http://localhost:8080', ws: true, rewrite: () => '/' }` で bun ゲームサーバへ中継する（ライブプレビューのプロキシ配下でも localhost 直叩きを避けられる）。本番は Caddy が同パスを中継。
- **shared のコードはクライアント/サーバーで同一マップを使う**: 障害物配置（DEFAULT_OBSTACLES）など決定論に効く定数は shared に置き、サーバー権威とクライアント予測が同じ BVH を構築する。片方だけ別配置にすると予測と補正がズレる。
- **tsconfig は 2 構成**: `tsconfig.json`（client+shared、DOM 型・jsx）と `tsconfig.server.json`（server+shared、`"types":["bun"]`・lib から DOM を外す）。`@shared/*` エイリアスは tsconfig の paths と vite/vitest の両方に必要。vitest は既定 jsdom だが shared/server のテストはファイル先頭 `// @vitest-environment node`。
- **TS 7**: `baseUrl` は廃止（paths は tsconfig 基準で解決）。`import { X } from '...'` で値としてエクスポートされていない名前を import すると型エラーにならないことがある（`verbatimModuleSyntax` 未使用時）。定数の定義元ファイルと再エクスポート元を混同しない（例: `SNAPSHOT_MAX_BYTES` は packer、INPUT_FLAG_* は messages）。

### テスト配置と一括起動（運用規約）

- **テストは全て `./_tests_/` 配下**に書き、ソースツリー（`src/`・`shared/`・`server/`）と**同じディレクトリ構造をミラー**する。例: `src/lib/clamp.ts` → `_tests_/src/lib/clamp.test.ts`、`server/room/Room.ts` → `_tests_/server/room/Room.test.ts`、`shared/sim/movement.ts` → `_tests_/shared/sim/movement.test.ts`。ソースと同じ場所に `*.test.ts` を置かないこと。
- テスト内の import は相対パスを使わず**エイリアス**を使う: `@/`（src）、`@shared/`（shared）、`@server/`（server）。この3エイリアスは tsconfig の paths・vite.config・vitest.config の3箇所すべてに定義が必要（`@server` は server を指す）。テストを `_tests_/` に移しても import が壊れないのはエイリアスのおかげ。
- vitest の `include` は `_tests_/**/*.{test,spec}.{ts,tsx}` だけ。環境は既定 jsdom、shared/server の純粋ロジックはファイル先頭 `// @vitest-environment node`。tsconfig は2構成の `include` に `_tests_/src`・`_tests_/shared`（client 構成）と `_tests_/server`・`_tests_/shared`（server 構成）をそれぞれ追加して型チェック対象に含める。
- **一括起動は `bun run start`（`scripts/execute.ts`）**: `vite build` を先に実行し、成功時のみ `bun run server`（:8080）と `vite preview`（:4173）を `Bun.spawn` で並列起動。子の stdout/stderr は行バッファして **[BUILD] シアン / [SERVER] 緑 / [CLIENT] マゼンタ**の ANSI 色タグを付けて転送する。SIGINT/SIGTERM と子プロセス異常終了で全子を SIGTERM する。`scripts/` は bun ランタイムなので tsconfig.server.json の include に含める。

### WebGPU レンダラーと資材の注意（Phase 1 で判明）

- **drei の `<Sky>`（GLSL ShaderMaterial）は WebGPU で白い箱になる**: WebGPU 対応端末（Galaxy S24 Ultra 等最近のスマホ/PC）では WebGPURenderer が優先され、drei Sky のカスタム GLSL シェーダが正しく描画されず白ドーム化＋太陽も出ない。**空は drei Sky を使わず、2D Canvas で描いたグラデ＋太陽＋雲を `THREE.CanvasTexture` にして `mapping = EquirectangularReflectionMapping` で `<primitive attach="background">`** で貼る（src/game/scene/Skybox.tsx）。CanvasTexture は通常テクスチャパスを通るので **WebGPU/WebGL2 どちらでも同じ青空**。drei を Sky だけのために import しない（バンドル 646→110 モジュールと大幅減）。
- **影は R3F `<Canvas shadows>` と light の castShadow 両方が必要**: Canvas に shadows を付け、directionalLight に castShadow + shadow-mapSize + shadow-camera 範囲（±70m 程度）を設定し、床に receiveShadow・障害物/プレイヤーに castShadow/receiveShadow。モバイル 60FPS 優先で directional 1 本・2048 マップに留める。空に描いた太陽の方位と directionalLight の position は equirect の UV 変換（u=0.5+atan2(z,x)/2π, v=0.5−asin(y)/π）で揃える。
- **ネット/予測ループは rAF で回さない**: requestAnimationFrame はタブが非表示/側ペイン/最小化だと間引き・停止する。入力送信・クライアント予測を useFrame（rAF）で駆動すると、見えない側のプレイヤーが数秒遅れて動く深刻なラグになる。**入力サンプリング・予測・送信は wall-clock の setInterval(60Hz) で駆動し、rAF（GameClient.frame）はリモート補間結果を描画用にサンプリングするだけ**にする。受信は WebSocket コールバックなので元から rAF 非依存。
- **リモートプレイヤーのメッシュは 1 フレーム欠測で即削除しない**: スナップショット欠落/補間の隙間で remove→add が起き「点滅」する。Map に `lastSeenMs` を持ち、**GRACE_MS（~600ms）戻らなかったときだけ削除**する。

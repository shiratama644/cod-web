# 🎮 Krunker.io 上位互換クロスプラットフォーム・オンラインFPS 開発技術スタック完全ガイド（統合完全版）

> **本プロジェクトの目標**: [Krunker.io](https://krunker.io) にインスパイアされた**完全上位互換**のブラウザFPS。
> **最重要目標**: **どの端末（PC ブラウザ / スマートフォン / タブレット）でも 60FPS 以上**を安定して達成すること。Krunker と同等以上の高速読み込み・低遅延・軽量さを優先し、重厚な AAA グラフィックスは優先しない（60FPS を割るリスクのある表現は入れない）。
>
> **コア構成**: React + Three.js + TypeScript + Vite（パッケージ管理/ランタイムは **bun**）
> **対応プラットフォーム**: PC（マウス＆キーボード / ゲームパッド） ＋ モバイル（タッチ / 仮想スティック / ジェスチャー）
> **アーキテクチャ**: 権威型サーバー ＋ クライアント予測・サーバー調停（Reconciliation） ＋ ラグ補償（Lag Compensation）。トランスポートは **WebTransport 主 / WebSocket フォールバックで確定**（[`networking.md`](./networking.md)）。サーバー設計（ルーム規模・自前実装・物理・Phase 1 範囲）は [`server-authority.md`](./server-authority.md)
> **開発方針**: 各機能モジュールごとに最適な専門ライブラリを採用し、**全端末での安定 60FPS** と低遅延・高速読み込みを両立する。

---

## 1. コア：3Dレンダリング（React統合・WebGPU）

| ライブラリ | 役割 | 備考 |
| :--- | :--- | :--- |
| **three** | 3Dレンダリングエンジン | 次世代WebGPUレンダラー（`three/webgpu`）およびTSL対応による高負荷処理が可能 |
| **@react-three/fiber** | React用Three.jsラッパー | 宣言的シーン管理。`useFrame` による毎フレームの描画ループ・更新制御 |
| **@react-three/drei** | R3F公式ユーティリティ集 | `<Environment>`, `<PointerLockControls>`, `<Detailed>` (LOD), `<Preload>` など必須コンポーネント群 |

> 💡 **WebGPU ベース + WebGL2 フォールバック（必須方針）**  
> レンダラーは **WebGPU を最優先で使用**し、WebGPU API が利用できない環境（非対応ブラウザ・無効化・デバイス）では**自動的に WebGL2 へフォールバック**する。  
> - Three.js の `WebGPURenderer` はフォールバック機能を持つ（WebGPU が使えなければ WebGL2 で描画）。起動時に `navigator.gpu` の有無を確認し、フォールバック時も同一コードで動く構成を基本とする。
> - コードは WebGPU 固有機能（Compute Shader / TSL の GPU 計算）に強く依存しない部分から作り、WebGL2 でも 60FPS が出ることを前提に性能設計する。
> - WebGPU Compute Shader は「使える端末での追加高速化」に位置づけ、WebGL2 フォールバック時に機能が欠落しないようにする。
> - モバイル Safari 等は WebGPU 非対応が多いため、**WebGL2 を「全端末 60FPS の基準レンダラー」**として必ず動作確認する。WebGPU は「対応端末での追加高速化」という位置づけ。

---

## 2. 衝突・キャラクター物理 & 精密当たり判定（three-mesh-bvh 統一）

> **物理エンジン（Rapier 等のリジッドボディ）はプレイヤー移動には使わない。**
> **three-mesh-bvh** で **キネマティック・キャラクターコントローラー（疑似リジッドボディ・浮遊カプセル）** を自前実装し、マップは **3D Mesh Map（GLTF メッシュ）** をそのまま衝突に使う。射撃レイキャストも同じ BVH で統一する。

| ライブラリ | 役割 | 備考 |
| :--- | :--- | :--- |
| **three-mesh-bvh** | 高速BVH。**プレイヤー衝突（キネマティックCC）と射撃判定の両方** | カプセル shapecast で地面/壁/坂/段差に対する浮遊カプセル移動（疑似リジッドボディ）＋ 超高速レイキャストで射撃・ヘッドショット判定。**CPU のみで WebGL 不要 → ヘッドレス bun サーバーでも同一 BVH を権威計算に使える**（作者 gkjohnson 確認済み）。[server-authority.md](./server-authority.md) §5 |
| **three-mesh-bvh**（マップ） | 3D Mesh Map の衝突 | GLTF のマップジオメトリから BVH を生成し、その三角形に対して衝突・レイ判定。クライアント/サーバーで同一マップ → 同一 BVH |
| **BVHEcctrl**（pmndrs） | R3F 用 BVH キャラクターコントローラー | 物理エンジン不要・three-mesh-bvh のカプセル衝突で階段/坂/凹凸を浮遊移動。**コア設計の参考（R3F バインディング）**。決定論・共有化のためコア移動ロジックは shared の純粋関数に置き、R3F は薄く巻く |
| ~~@react-three/rapier / @dimforge/rapier3d~~ | （プレイヤー移動には不採用） | プレイヤー移動は BVH キネマティックCC で足りるため当初不要。動的剛体（投擲物・崩れるオブジェクト）が必要になった段階で再検討 |
| **three-bvh-csg** | リアルタイムCSG（ブーリアン演算） | 壁に弾痕や穴を開ける破壊表現（デストラクション）の実装 |

> 💡 **統一構成**: プレイヤーの移動・障害物との衝突も、弾丸の着弾/ヘッドショット判定も **全部 three-mesh-bvh** で行う。
> マップは **3D Mesh Map（GLTF）** をオーサリングし、そのジオメトリから BVH を作る。キャラクターは**重力・坂・段差を扱う疑似リジッドボディ（カプセル）**として自前で解き、本物の剛体エンジンは使わない（決定論的・軽量・クライアント/サーバー同一計算）。

---

## 3. キャラクターコントローラー & カメラシステム

| ライブラリ | 役割 | 備考 |
| :--- | :--- | :--- |
| **BVHEcctrl / 自前カプセルCC** | three-mesh-bvh ベースの**キネマティック・キャラクターコントローラー（疑似リジッドボディ）** | 物理エンジン不要。カプセル shapecast で浮遊移動・階段/坂/段差登攀・着地判定。**コアは shared の純粋関数**でクライアント/サーバー共有（決定論）、R3F は薄いラッパー。Rapier ベースの ecctrl は使わない |
| **camera-controls** | 高度なカメラ制御 | ADS（エイムダウンサイト）、反動（リコイル）、視点揺れ、滑らかな補間 |
| **@react-three/drei** (`CameraShake`) | カメラシェイク | 爆発や被弾時、射撃時の臨場感ある画面揺れの演出 |

---

## 4. マルチプレイヤー・低遅延ネットワーキング & ボイスチャット

> **決定方針（2026-09-03、詳細は [`networking.md`](./networking.md)）**:
> **WebTransport（HTTP/3・QUIC）を主経路、WebSocket をフォールバック＆信頼メッセージ経路**とする。datagrams（非信頼）を座標・入力・状態に、streams（信頼）をダメージ確定・チャット等に使用。非対応・UDP/443 ブロック時は自動で WebSocket へフォールバック。STUN/TURN は不要（P2P ではなくクライアント→公開権威サーバー）。
> サーバー tick・スナップショットは **30Hz**、入力送信は **60Hz**、描画は**可変フレームレート（60〜120Hz+）**で互いに独立。高頻度パケットは**手動バイナリ固定レイアウト**（入力~12B・40人スナップショット~650B、固定小数点量子化・ゼロアロケ）、低頻度の信頼イベントは **msgpackr**。FX/アニメはアクションフラグ（`isShooting` 等）＋発射トリガーのみ送りクライアント再生。詳細は [server-authority.md](./server-authority.md) §6。

| ライブラリ / 技術 | 役割 | 備考 |
| :--- | :--- | :--- |
| **WebTransport**（ブラウザ標準 API） | **主トランスポート** | HTTP/3・QUIC over UDP/443。datagrams（非信頼・HOL なし）+ streams（信頼）を 1 接続で併用。NAT 越え不要。Chrome97+/FF114+/Safari26.4。**WS フォールバック必須** |
| **WebSocket**（`ws` / Bun.serve ネイティブ） | **フォールバック＆信頼チャネル** | チャット・ロビー・マッチメイキング、および WT 非対応/ UDP ブロック環境のゲームプレイ。bun ネイティブで高速。Krunker.io も socket.io 方式 |
| **Caddy**（HTTP/3 リバースプロキシ） | HTTP/3・WebTransport 終端 | bun は WT サーバー未実装のため、エッジで HTTP/3 を終端し bun（WS＋ゲームロジック）へプロキシ。bun の WT 対応後に寄せる |
| ~~geckos.io~~ | （不採用） | WebRTC-UDP だがサーバーが node-datachannel ネイティブ依存で **bun 非互換の恐れ**、別 UDP ポートが FW に塞がれやすい。WebTransport が同じ UDP の長所をより安全に提供 |
| ~~Colyseus~~ | （ライブラリ不採用・**パターン参考のみ**） | WS ファーストで独自 schema 同期が 30Hz/msgpackr/WebTransport 方針と二重化するため使わない。ルームライフサイクル・seat reservation・固定ステップ netcode の設計パターンを自前サーバーに取り込む（[server-authority.md](./server-authority.md)） |
| **livekit-client** | WebRTC ボイスチャットSDK（後方フェーズ） | 近接ボイチャ（Proximity Voice）。WebRTC MediaStream/SFU で、ゲームデータ（WebTransport）とは別系統 |
| playroomkit | モバイル向け対戦SDK（参考・不採用候補） | P2P/ローカル対戦プロトタイプ用。本プロジェクトは権威サーバー方式のため原則不使用 |
| **msgpackr** | 高速MessagePackバイナリシリアライザ | **低頻度の信頼イベント**（チャット・ルーム・購入・スコア）で採用。高頻度（入力/スナップショット）は手動バイナリ固定レイアウト（[server-authority.md](./server-authority.md) §6） |
| protobufjs | Protocol Buffers（将来の選択肢） | スキーマ厳密管理が必要になった場合の候補。初期は msgpackr |

---

## 5. ECS（エンティティ・コンポーネント・システム）& 大量オブジェクト管理

| ライブラリ | 役割 | 備考 |
| :--- | :--- | :--- |
| **miniplex** / **@miniplex/react** | R3F向けECSフレームワーク | 弾丸、ドロップアイテム、エフェクトなどのライフサイクルをデータ指向で超高速処理 |
| **bitecs** | 高性能TypedArrayベースECS | サーバー・クライアント共通で数万のエンティティをGCレス（ガベージコレクションなし）で処理 |

---

## 6. ゲームAI・パスファインディング（BOT実装 / 練習モード）

| ライブラリ | 役割 | 備考 |
| :--- | :--- | :--- |
| **yuka** | ゲームAIエンジン / フレームワーク | ステアリング行動（巡回・追跡・回避）、有限ステートマシン、敵ボットの知覚/視線判定（Vision） |
| **recast-navigation** / **recast-navigation-js** (`@recast-navigation/three`) | NavMesh（ナビメッシュ）生成 & 経路探索 | AAAゲーム標準のRecast/DetourのWASM版。マップ移動可能エリアの自動抽出と3D空間内のA*最短経路探索（ボットの自動走行） |

---

## 7. パーティクル & VFX・弾道エフェクト

| ライブラリ | 役割 | 備考 |
| :--- | :--- | :--- |
| **three.quarks** / **quarks.r3f** | 高機能GPUパーティクル/VFXエンジン | Unity（Shuriken）互換。マズルフラッシュ、爆破、火花、血飛沫、軌跡（トレイル）を最小Draw Callでバッチ描画 |
| **three.meshline** | 太さのあるライン描画 | **弾道トレース（Tracer）**、レーザーサイト、近接武器の軌跡表現 |
| **r3f-vfx** | TSL / WebGPUパーティクル | WebGPU Compute Shaderを用いた大量のGPU駆動パーティクルシミュレーション |
| **three-custom-shader-material** | カスタムシェーダー拡張 | シールド被弾時の六角形エフェクト、スコープの歪み、既存PBRマテリアルを維持したステルス表現 |

---

## 8. アニメーション・リギング & 姿勢制御（IK / FSM / カットシーン）

| ライブラリ | 役割 | 備考 |
| :--- | :--- | :--- |
| **@react-three/drei** (`useAnimations`) | ボーン・GLTFアニメーション管理 | 待機（アイドル）、走行、射撃、リロード、ジャンプ等のブレンド・クロスフェード再生制御 |
| **three-stdlib** / **three-ik** (`CCDIKSolver`) | インバースキネマティクス (IK) | **銃の反動（Recoil）時の腕・手首の追従**、段差や坂道での**足の接地（Foot IK）** |
| **xstate**（v5） | アニメーション状態遷移 FSM（**採用**） | idle/walk/run/jump/fall/crouch/ADS/射撃/リロード等のアニメ状態遷移を XState v5（`createMachine`/`createActor`）で一元管理。連続変化（idle↔walk↔run）はブレンドスペース、状態質の変化（接地↔空中、通常↔射撃）をステートで。one-shot 遷移は mixer の `finished` を待つ。サーバーは FSM を持たず権威フラグのみ。`useAnimations`（drei）と併用 |
| **@theatre/core** / **@theatre/r3f** | ビジュアルタイムライン・モーショングラフィックス | マッチ開始前のカメラ演出、キルカメラ、イベントシーンのオーサリング |
| **gsap** | プログラマティック・イージング | 武器のリコイル復帰、スコープズーム、カメラワークのアニメーション |

---

## 9. 入力・コントロール（PC / モバイル / ゲームパッド両対応）

| ライブラリ | 役割 | 備考 |
| :--- | :--- | :--- |
| **nipplejs** | 仮想ジョイスティック | モバイル画面上の左スティック（移動）/ 右スティック（視点操作） |
| **@react-three/drei** (`PointerLockControls`) | マウス視点ロック | PC版FPSの標準的なマウスによるフリーエイム制御 |
| **@react-three/drei** (`KeyboardControls`) | キーボード入力マッピング | WASD移動、ジャンプ、しゃがみ、リロードなどのキーバインド一元管理 |
| **joypad.js** | ゲームパッド API ラッパー | PS5 / Xbox コントローラーをブラウザに接続した際の入力制御 |
| **hammerjs** | タッチジェスチャー | スワイプ（武器切替/回避）、ダブルタップ（リロード/近接攻撃）などの検出 |
| **screenfull** | フルスクリーン制御 | モバイルブラウザのアドレスバー非表示・没入感向上のための画面最大化 |

---

## 10. モバイル & ブラウザUX・デバイス制御

| ライブラリ / API | 役割 | 備考 |
| :--- | :--- | :--- |
| **screenfull** | フルスクリーン制御 | ブラウザのアドレスバーを非表示にし、ネイティブアプリ並みの没入感を確保 |
| **nosleep.js** / **Screen Wake Lock API** | スリープ防止 | プレイ中にモバイル画面が自動消灯・ロックされるのを防止 |
| **Navigator.vibrate** (Vibration API) | ハプティクス（触覚フィードバック） | モバイルでの射撃時や被弾時に端末を振動させて臨場感を向上 |

---

## 11. UI / HUD（ヘッドアップディスプレイ） & 3DダイジェティックUI

| ライブラリ | 役割 | 備考 |
| :--- | :--- | :--- |
| **zustand** | グローバル状態管理 | HP、残弾数、キルログ、スコア、プレイヤー座標の超軽量・高速な非同期共有（Context不要） |
| **@react-three/drei** (`Html`) | 3D空間内HTML投影 | プレイヤー頭上のネームプレート、ピン表示、インタラクトUI |
| **troika-three-text** | 高速SDF 3Dテキスト | 頭上のネームタグ、大量に発生するダメージポップアップ数値の超高速描画 |
| **@radix-ui/react-\*** | アクセシブルUIコンポーネント | 設定メニュー、クロスヘア選択、スコアボード、オーディオ/グラフィックスライダー |
| **framer-motion** | UIモーションアニメーション | キルフィードのアニメーション、被弾時の画面赤フラッシュ、ヒットマーカー演出 |
| **lucide-react** | アイコンセット | 弾薬、アーマー、各種武器・設定用SVGアイコン |

---

## 12. オーディオ & 3D空間立体音響

| ライブラリ | 役割 | 備考 |
| :--- | :--- | :--- |
| **@react-three/drei** (`PositionalAudio`) | R3F統合3D立体音響 | 敵の足音や銃声の方向・距離感をWeb Audio APIのHRTFステレオ定位で再現 |
| **howler.js** | 汎用マルチオーディオ再生管理 | BGMループ、UI効果音、環境音（Ambient）の同時発音数制御と事前プリロード |
| **resonance-audio** | 高度な空間音響（HRTF・残響音） | 部屋の広さや遮蔽物（オクルージョン）によるリアルな残響・音の回り込みシミュレーション |

---

## 13. アセット最適化 & パイプラインツールチェーン

| ライブラリ | 役割 | 備考 |
| :--- | :--- | :--- |
| **@react-three/drei** (`useGLTF` / `useTexture`) | 3Dアセット読み込み | `preload()` によるアセット事前キャッシュ、React Suspense対応 |
| **gltfjsx** | GLTF → JSX 変換CLI | 3DモデルをReactコンポーネント化し、ボーンやマテリアルへの直接アクセスを容易にする |
| **three-stdlib** | Three.js追加ローダー群 | KTX2Loader, DRACOLoader, LDrawLoader などの標準拡張ローダー |
| **meshoptimizer** / **DRACOLoader** | 高速メッシュ圧縮・デコード | モデルサイズ削減とモバイル環境での高速ロード（meshoptimizerはデコードが極めて高速） |
| **@gltf-transform/core** | GLTF最適化ビルドツール | モデルのポリゴン削減、テクスチャのKTX2/Basis変換、LOD自動生成、不要ノード削除 |
| **three-mesh-bvh**（`MeshBVH.serialize` / `deserialize`） | **マップ BVH のビルド時事前生成** | GLTF の衝突ジオメトリから BVH をビルド時に 1 回構築し `serialize()` でバイナリ化（GLTF 拡張 `three_mesh_bvh` 埋め込み or `.bvh` サイドカー）。クライアント/ヘッドレスサーバーとも起動時は `deserialize()` するだけで起動ほぼ0秒・実行時解析なし。サーバーは GLTFLoader（window/Image 依存）を使わず position+BVH バッファのみ読む。[server-authority.md](./server-authority.md) §5.1 |

---

## 14. シェーダー・ポストプロセス・グラフィック効果

| ライブラリ | 役割 | 備考 |
| :--- | :--- | :--- |
| **@react-three/postprocessing** | ポストプロセスエフェクト | ブルーム、SSAO（周辺減光）、被写界深度（DoF）、色補正（LUT） |
| **three-custom-shader-material** | カスタムシェーダー拡張 | 既存のPBRマテリアルを維持したまま、被弾・シールド・ステルスなどの表現を追加 |
| **three/webgpu (TSL)** | Three Shading Language | WGSL/GLSLを意識せずクロスプラットフォームで動作する次世代ノードシェーダー |

---

## 15. パフォーマンス・モニタリング & 自動スケーリング

| ライブラリ | 役割 | 備考 |
| :--- | :--- | :--- |
| **r3f-perf** | 詳細パフォーマンスオーバーレイ | FPS、Draw Calls、ジオメトリ数、GPU/CPUメモリ使用量、テクスチャ数を可視化 |
| **@react-three/drei** (`PerformanceMonitor`) | デバイス適応型品質制御 | フレームレート低下時に解像度スケール（DPR）やシャドウ品質を動的に自動調整 |
| **stats-gl** | 次世代軽量モニタリング | WebGL/WebGPU対応の軽量パフォーマンス統計 |

---

## 16. 開発環境・シーンオーサリング・デバッグ

| ライブラリ | 役割 | 備考 |
| :--- | :--- | :--- |
| **leva** | パラメータ調整用GUIパネル | 銃の反動値、ブレ、移動速度、重力、ライト強度などをリアルタイムに変更・検証 |
| **@react-three/editor** | シーンエディタ（開発用） | レベルデザイン、オブジェクト配置の視覚的オーサリング支援 |
| **vite-plugin-glsl** | GLSLインポーター | Viteで `.glsl`, `.vert`, `.frag`, `.wgsl` ファイルを直接 import 可能にする |
| **msw** (Mock Service Worker) | ネットワークAPIモック | 認証、マッチメイキング、インベントリAPIのモック検証 |

---

## 🎯 Krunker 上位互換・全端末 60FPS を達成するためのエンジニアリング原則 ＆ 設計・実装黄金ルール

> 目標は「**全端末で安定 60FPS+ の軽量・高速なブラウザFPS**」。Krunker.io と同等の軽さ・低遅延・高速読み込みを基準とし、60FPS を割るリスクのある重い表現は入れない。各原則は「60FPS 維持」を最優先で取捨選択する。

1. **射撃判定は「three-mesh-bvh」でローカル即時判定 ＋ サーバー検証（Lag Compensation）**
   - クライアント側でBVHを用いて即座にヒットマーカーを表示しつつ、サーバー側でタイムスタンプを巻き戻して正当性を検証。
2. **クライアント予測（Client Prediction） ＋ サーバー調停（Reconciliation）**
   - プレイヤーの入力は即座に画面へ反映し、サーバーの定期的な確定情報（スナップショット）と差分補正してラグリプレイを排除。
3. **WebGPU ベース + WebGL2 フォールバック（WebGL2 が全端末の基準ライン）**
   - WebGPU API が使えれば活用（Compute Shader / TSL でパーティクル・弾丸演算を GPU へ逃がす）。使えない端末では WebGL2 へ自動フォールバックし、WebGL2 でも 60FPS が出ることを前提に設計する。
4. **Reactのレンダリングサイクルとゲームループの完全分離**
   - 毎フレーム更新される座標や弾丸データは React State ではなく、Three.js のオブジェクト参照（`ref`）や `Zustand` の `getState()` / `subscribe` を用いて直接更新する。
5. **ゼロ・アロケーション（Zero Allocation in Loop）によるGC徹底回避**
   - `useFrame` 内での `new THREE.Vector3()`、`Quaternion`、`Matrix4` などのオブジェクト生成は厳禁。事前にモジュールスコープ等でプールした一時変数（`tempVec` など）を再利用し、GC（ガベージコレクション）によるスパイク・フレーム落ち（Stuttering）を根絶。
6. **ECS（Entity Component System）によるデータ指向設計**
   - 発射された弾丸、投擲物、NPCなどの大量のゲームオブジェクトはECSで配列（Flat Array）として管理し、メモリ局所性とキャッシュ効率を最大化。
7. **パーティクルと弾道エフェクトのバッチレンダリング**
   - 銃撃戦で大量に発生するエフェクトは `three.quarks` や `BatchedMesh` / `InstancedMesh` を使い、Draw Callを極限まで削減。
8. **全端末 60FPS の性能ターゲット（最重要）**
   - **Draw Calls**: 80〜100以下（`InstancedMesh` / `BatchedMesh` の積極利用）
   - **テクスチャ**: すべて KTX2/Basis Universal 形式に圧縮し、GPU VRAM 圧迫を回避
   - **デバイス適応**: `PerformanceMonitor`（drei）でフレームレートを監視し、低性能端末では DPR（解像度スケール）・シャドウ・パーティクル数・LOD を動的に下げる品質ティアを用意。**ローエンドモバイルでも 60FPS を割らないこと**を最低ラインとする
   - **描画フレームレートは可変**: 60FPS は「全端末が達成すべき下限フロア」であり上限ではない。`requestAnimationFrame` はディスプレイのリフレッシュレート（60/90/120/144Hz）で呼ばれるため、**60 で蓋をせずハイリフレッシュ端末では 120FPS で描画**する。全移動・アニメは delta time ベース（固定 16.67ms を仮定しない）。ネット tick（30Hz）とは独立（[`networking.md`](./networking.md)）
   - **高速読み込み**: Krunker 並みの起動の速さを目標に、初期バンドル・アセットを最小化（軽量シーンから段階ロード）

> 💡 **FX/射撃アニメはネットワークに流さない**
> マズルフラッシュ・反動・トレーサー・薬莢・パーティクル等は、`isShooting` 等の**アクションフラグ（ビットフィールド）**と `{playerId, seq, weapon}` の**発射トリガーイベント**だけを送り、各クライアントが決定論的にローカル再生する。アニメ用 transform を毎フレーム同期せずパケットを最小化する（[`networking.md`](./networking.md) §5）。
   - **解像度制御**: `PerformanceMonitor` を用いてモバイルの負荷に応じて `dpr={clamp(..., 1, 1.5)}` を動的変更
# Game Engineering Principles — Krunker 上位互換 FPS 設計・実装ルール

> [`../../docs/CONFIG.md`](../../docs/CONFIG.md) の「🎯 Krunker 上位互換・全端末 60FPS を達成するためのエンジニアリング原則＆設計・実装黄金ルール」を作業時に引きやすくしたもの。ゲームコードを書くときは必ず本スキルを参照する。
> **最優先目標は「どの端末でも安定 60FPS 以上」**。60FPS を割るリスクのある重い表現は入れない。

## 8 つの黄金ルール（CONFIG.md より）

1. **射撃判定は three-mesh-bvh でローカル即時判定 ＋ サーバー検証（Lag Compensation）**
   - クライアントは BVH で即座にヒットマーカー表示。サーバーはタイムスタンプを巻き戻して正当性を検証する権威判定。
2. **クライアント予測（Client Prediction）＋ サーバー調停（Reconciliation）**
   - 入力は即座に画面反映し、サーバーのスナップショット確定情報で差分補正してラグを隠す。
3. **WebGPU ベース + WebGL2 フォールバック（WebGL2 が全端末の基準ライン）**
   - WebGPU API が使えれば活用し、TSL/WebGPU Compute Shader でパーティクル・弾丸演算を GPU 並列実行。使えない端末では WebGL2 へ自動フォールバックし、**WebGL2 でも 60FPS が出ることを前提に設計**する。
4. **React のレンダリングサイクルとゲームループを完全分離** ⭐
   - 毎フレーム更新される座標・弾丸データは **React State にしない**。Three.js オブジェクト参照（`ref`）や Zustand の `getState()` / `subscribe` で直接更新する。
5. **ゼロ・アロケーション（Zero Allocation in Loop）で GC を徹底回避** ⭐
   - `useFrame` 内での `new THREE.Vector3()` / `Quaternion` / `Matrix4` 等は厳禁。モジュールスコープ等にプールした一時変数（`tempVec` など）を再利用し、GC スパイク・フレーム落ち（Stuttering）を根絶。
6. **ECS（Entity Component System）によるデータ指向設計**
   - 弾丸・投擲物・NPC 等の大量オブジェクトは ECS で Flat Array 管理し、メモリ局所性・キャッシュ効率を最大化。
7. **パーティクル・弾道エフェクトのバッチレンダリング**
   - 大量エフェクトは `three.quarks` / `BatchedMesh` / `InstancedMesh` で Draw Call を極限削減。
8. **モバイル最適化ターゲット**
   - Draw Calls: **80〜100 以下**（InstancedMesh / BatchedMesh を積極利用）。
   - テクスチャ: 全て **KTX2 / Basis Universal** に圧縮し GPU VRAM 圧迫を回避。

## 実装パターン集

### ゲームループ（悪い例 / 良い例）

❌ 悪い（React State を毎フレーム更新 + ループ内アロケーション）:

```tsx
useFrame(() => {
  const v = new THREE.Vector3(x, y, z); // 毎フレーム生成 → GC スパイク
  setPosition(v);                       // React 再レンダーが毎フレーム走る
});
```

✅ 良い（ref 直接更新 + プールした一時変数）:

```tsx
const tempVec = useMemo(() => new THREE.Vector3(), []); // ループ外で 1 回だけ生成

useFrame((state, delta) => {
  if (!meshRef.current) return;
  tempVec.set(x, y, z);                 // プール変数を再利用
  meshRef.current.position.copy(tempVec);
  meshRef.current.rotation.y += delta;  // Three オブジェクトを直接書き換え（React 非関与）
});
```

### 状態の置き場所の使い分け

| データ | 置き場所 | 理由 |
| :--- | :--- | :--- |
| 毎フレーム変わる座標・回転・速度 | Three.js `ref`（オブジェクト直接） | React 再レンダーを避ける |
| ゲーム状態（HP / 残弾 / スコア / キルログ） | Zustand（`getState()` / `subscribe`） | 高頻度更新は subscribe で UI と分離 |
| HUD 表示用に間引いた値 | Zustand → React（必要な箇所だけ購読） | 毎フレームではなく更新時のみ再レンダー |
| 静的設定・定数 | `src/` の定数モジュール | - |

### ネットワークの役割分担（トランスポートは議論中）

- **権威モデルは確定**: サーバーが権威。当たり判定・スコア・状態確定はサーバー側（Rapier ヘッドレス物理）。クライアントは予測のみ。
- **トランスポートは 2 案を比較中**:
  - **WebSocket（socket.io / Colyseus、TCP）**: Krunker.io と同方式。順序・到達保証で実装・デプロイが簡単、bun で動く。欠点は TCP のヘッドオブラインブロッキング（1 パケットロストで後続待ち）。小部屋 FPS では Krunker 実績あり。
  - **WebRTC-UDP（geckos.io、unreliable/unordered DataChannel）**: パケットロス許容・HOL ブロッキングなしで高速。欠点はシグナリング・STUN/TURN・UDP ポート開放が必要でデプロイ複雑、サーバーが node-datachannel ネイティブ依存で bun 互換は未検証。
- 確定するまでネットコードはトランスポート非依存の抽象境界（NetTransport interface）の内側に書き、後で差し替え可能にする。

## テストしやすさのための分離

- ゲームロジック（移動計算・当たり判定・リコンサイル・ECS システム）は **Three.js / WebGL に依存しない純粋関数**として書き、jsdom + Vitest でユニットテスト可能にする。
- レンダリング（Canvas・シェーダー）の目視確認はプレビュー/実機依存とし、ロジックと分離する（[sandbox-constraints.md](./sandbox-constraints.md)）。

## パフォーマンス計測

- FPS / Draw Call / メモリは実機・実ブラウザで計測すること（Sandbox のヘッドレスでは計測不能、AGENTS.md §7.3）。数値は「実機計測予定」と明記し、確定値のように書かない。

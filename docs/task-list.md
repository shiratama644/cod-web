# cod-web タスクリスト（唯一の正本）

> **運用ルール** — Qiita「Claude Code／Codex に中〜大規模開発を任せるためのタスク管理」
> (<https://qiita.com/Y-Y-dev/items/d526fb7cdbe35a3f9384>) に基づく運用。
>
> 1. **本ファイルが進捗管理の唯一の正本**。チャット・Issue・AI の完了報告と本ファイルが
>    矛盾する場合は本ファイルを正とする (AGENTS.md §6.8)。
> 2. **進行中タスクは原則 1 件**。複数を同時に進めない（独立性の高い調査・テストを除く）。
> 3. **タスク ID は再利用しない**。中止したタスクは行を消さず「対象外」にして理由を残す。
> 4. **作業中に見つけた新問題は新タスクとして登録**し、現在のタスクへ混ぜない
>    （現在の完了条件に必須の場合のみ例外）。
> 5. 完了は **AI の自己申告ではなく証拠で判定**する（テスト件数 / コミット SHA / PR / 実測値）。
> 6. 個別タスクの詳細（目的・変更範囲・禁止事項・完了条件・テスト方法・停止条件）は
>    `docs/planning/*_PLAN.md`（計画書テンプレート `_TEMPLATE.md` 準拠）に書く。
>
> **状態の定義**: `未着手` / `調査中` / `実装中` / `ローカル検証済み` /
> `実環境検証待ち`（デプロイ先・実機での確認が残る）/ `完了` / `保留`（外部判断待ち）/
> `対象外`（中止・不採用。理由を残す）

---

## プロジェクト概要

[Krunker.io](https://krunker.io) にインスパイアされたブラウザ向け**クロスプラットフォーム・オンラインFPS**（Krunker の完全上位互換が目標）。**最重要目標は「どの端末でも安定 60FPS 以上」**。技術スタック・設計ルールの大本は
[`arch/tech-stack.md`](./arch/tech-stack.md)。開発規約は [`../AGENTS.md`](../AGENTS.md)。

> レンダラーは **WebGPU 最優先 + WebGL2 自動フォールバック**（WebGL2 を全端末 60FPS の基準）。
> **描画 FPS は可変**（rAF = 60〜120Hz+。60 は全端末の下限フロアであり上限ではない）で、シミュレーション tick 60Hz（送信30Hz）とは独立・delta time ベース。
> ネットワーク方針は確定: **WebTransport（datagrams+streams）主 / WebSocket フォールバック**、シム tick **60Hz**・入力 **60Hz**・スナップショット送信 **30Hz**（レート分離・射撃は sub-tick）、高頻度パケットは**手動バイナリ固定レイアウト**（低頻度信頼イベントは msgpackr）、FX はアクションフラグ＋トリガーのみ送信でクライアント再生。詳細は [`arch/networking.md`](./arch/networking.md)・[`arch/server-authority.md`](./arch/server-authority.md)。

ロードマップの大枠（フェーズ分割は計画書作成時に確定）:

| Phase | テーマ | 状態 |
|---|---|---|
| **0** | プロジェクト基盤（Vite/React/TS/Biome/Vitest、R3F シーン［WebGPU+WebGL2 フォールバック］、ゲームループ骨架） | **完了**（2026-09-03、実機確認済み） |
| **1** | ネットワーク初期（権威 bun サーバー・shared 純粋ロジック・位置同期のみ）。**最小到達点＝動くプレイヤーが互いに見える** | **計画済み・未着手**（[PHASE01_PLAN.md](./planning/PHASE01_PLAN.md)） |
| 2 以降 | 射撃・当たり判定・ラグ補償 / 3D マップ（GLTF＋BVH 事前生成）/ アニメ（XState）/ マッチメイキング・ラウンド制 / 購入・チャット / WebTransport 有効化 / ボイス / HUD・UI / モバイル入力 / アセットパイプライン / パフォーマンス（全端末 60FPS 検証） | 未定（Phase 1 完了後に計画） |

---

## Phase 0: プロジェクト基盤構築

> 計画書: [`planning/PHASE00_PLAN.md`](./planning/PHASE00_PLAN.md)（_TEMPLATE.md 準拠）。
> ゴール: ゲームコードを置くための最小動作する土台。**各サブタスク = 1 commit を原則**。
> ネットワーク・本格的なゲームプレイ実装は Phase 1 以降（Phase 0 に含めない）。

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| P0-A | Vite + React + TypeScript プロジェクト初期化（**bun** パッケージ管理・`bun.lock`、strict、`src/` 構成、`.nvmrc`、bun を devDependency 固定） | ローカル検証済み | 100% | - | `bun install` 成功・`bun run dev` / `bun run build` が通り、空画面が表示される | react19.2.8/vite8.2.2/ts7.0.2、bun1.4.0固定、typecheck 0、build OK（JS gzip 60KB）、dev HTTP 200 |
| P0-B | Biome 導入（lint + format、テスト overrides）+ `bun run lint` 整備 | ローカル検証済み | 100% | P0-A | `bunx biome lint .` が 0 error | @biomejs/biome 2.5.11、biome.json（preset:recommended・vcs useIgnoreFile）、`bun run lint` 0 error / 9 files、format clean |
| P0-C | Vitest + @testing-library/react 導入（jsdom 環境）+ `bun run test:unit` 整備 | ローカル検証済み | 100% | P0-A | サンプルテストが `vitest run` で green | vitest 4.1.11 / jsdom 30 / @testing-library/react 16.3.3、vitest.config.ts+setup、サンプル 7 tests green（clamp 関数 5 + App スモーク 2） |
| P0-D | Three.js / @react-three/fiber / @react-three/drei 導入とシーン基盤（Canvas・カメラ・ライト・地面）。**WebGPURenderer を最優先、WebGPU 不在時は WebGL2 へ自動フォールバック**（`navigator.gpu` 判定） | 完了 | 100% | P0-A | WebGPU 対応環境と非対応環境（WebGL2）の両方で 3D シーンが表示され、フォールバック機構がコード上で明示されている | three 0.185.1/R3F 9.7.0/drei 10.7.8。`src/game/renderer/createRenderer.ts` が navigator.gpu 判定→WebGPURenderer／WebGL2 フォールバックを明示（HUD に backend 表示）。build/dev 配信 OK。**2026-09-03 ユーザー実機で表示・フォールバック動作を確認済み** |
| P0-E | ゲームループ骨架（`useFrame` ベース、ref 直接更新・ゼロアロケーション方針の確立） | ローカル検証済み | 100% | P0-D | 毎フレーム回転するオブジェクト等でループ動作を確認、React State 非依存の更新であること | `src/game/loop/useSpin.ts`（useFrame で mesh ref の rotation を直接加算、delta クランプ 0.05s、new なし・プリミティブ演算のみ）。Box に適用 |
| P0-F | Zustand 導入（ゲーム状態ストアの骨架） | ローカル検証済み | 100% | P0-A | サンプルストアを置き、`getState()`/`subscribe` 利用の方針をコードで提示 | zustand 5.0.15。`src/store/gameStore.ts`（renderer/hp/ammo、setter はクランプ）＋React 外用 `gameStoreApi`（getState/subscribe）。Canvas が backend を書き、HUD が購読。store テスト 4 件 |
| P0-G | 4 検証コマンド整備（typecheck / lint / test:unit / build）+ `.agent/hooks/verify-before-commit.md` の実コマンド整合確認 | ローカル検証済み | 100% | P0-B/C | AGENTS.md §3.1 の 4 コマンドが全て実在し PASS | 4 コマンド全て package.json に実在し一括 PASS: typecheck 0 / biome lint 0（22 files）/ test 11 passed / build OK（JS gzip 453KB）。verify フックと整合 |
| P0-H | ドキュメント/skills の実態追従（README のセットアップ手順検証、`.agent/skills/tech-stack.md` 等を実装後の実態に更新） | ローカル検証済み | 100% | P0-G | docs・skills と実コードの間に不整合がない | README を Phase 0 実態に更新（test:e2e 削除・進捗注記）、skills/tech-stack.md に Phase 0 の実バージョン・WebGPU/R3F/TS7/Biome2/Vitest/Zustand のハマりどころを追記 |

※ Playwright（E2E）は CI 基盤タスクとして Phase 1 以降で計画（Sandbox では実行不可、AGENTS.md §6.2）。
※ ゲームサーバー基盤は Phase 1 で実装。トランスポートは **WebTransport 主 / WebSocket フォールバック**で確定（[networking](arch/networking.md)）。Phase 0 では NetTransport 抽象境界のインターフェースのみを見込んでおり、実装（WS 先行・WT 後続）は Phase 1（[server-authority](arch/server-authority.md)）。

---

## Phase 1: ネットワーク初期 — 権威サーバー＋位置同期

> 計画書: [`planning/PHASE01_PLAN.md`](./planning/PHASE01_PLAN.md)（_TEMPLATE.md 準拠）。
> ゴール: **位置同期のみ＝動くプレイヤーが互いに見える**（2 タブで片方を動かすと他方で滑らかに動く）。
> 射撃・当たり判定・ラウンド制・購入・チャット・マッチメイキング・WebTransport 有効化・GLTF マップは後続フェーズ。
> **1 サブタスク = 1 commit を原則**。

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| P1-A | shared/server 基盤・ビルド設定・プロトコル（`three-mesh-bvh`/`@types/bun` 追加、tsconfig/vite/vitest 解決、`shared/protocol` 定数＋型＋**バイナリ packer**、NetTransport 抽象） | ローカル検証済み | 100% | - | packer/量子化のユニットテスト green・**20人** snapshot は payload ~330B（wire IPv6 ~378B）で ≤MTU | three-mesh-bvh0.9.14/@types/bun1.4.0 導入。`shared/protocol/`(constants/messages/quantize/packer)＋`src/game/net/transport.ts`(NetTransport 抽象)。tsconfig を client/shared と server(bun types) に分離、vite/vitest に `@shared` エイリアス・vitest は shared/server の node テストを include。パック/量子化テスト **9 件**（うち payload=329B / wire IPv4=357B・IPv6=377B、payload上限1152 を断言）。typecheck(2構成)/lint(29files)/test(20 passed)/build 全 PASS |
| P1-B | shared キネマティック移動（純粋関数 `stepPlayer`・three-mesh-bvh CollisionWorld 境界［平面 BVH・レイ衝突］・データ指向 SimWorld） | ローカル検証済み | 100% | P1-A | 決定論・重力/ジャンプ/床衝突の node ユニットテスト green | `shared/sim/collisionWorld.ts`（MeshBVH ラップ・`createPlaneWorld`・床/壁レイ）＋`movement.ts`（純粋 `stepPlayer`：yaw移動・重力・ジャンプ・壁/床解決・速度上限）。**three-mesh-bvh は bun/node ヘッドレスで動作確認済み**（DOM/WebGL 不要）。テスト **7 件**（ヘッドレスBVH・決定論・落下静止・ジャンプ・水平移動・壁めり込み回避）green。全27 test・typecheck2構成・lint33files・build 全 PASS |
| P1-C | bun サーバ骨架（`Bun.serve` ネイティブ WS・単一デフォルトルーム・参加/離脱・playerId 払い出し） | ローカル検証済み | 100% | P1-A | `bun run server` 起動・接続/離脱のロジック統合テスト | `server/index.ts`（Bun.serve ネイティブ WS・0.0.0.0:8080・health/upgrade）＋`server/room/Room.ts`（playerId 払い出し・welcome/join/leave テキスト制御・満員拒否）。Room ロジックをソケットから分離し単体テスト可能に。テスト **5 件** green。実起動 smoke: HTTP health 200、2 クライアント WS 接続で welcome(playerId/roster)・join・leave 通知を確認。全32 test・typecheck2構成・lint36files・build PASS |
| P1-D | 60Hz 権威シミュレーション＋入力受信（アキュムレータ固定 1/60・最新入力消費・shared stepPlayer 権威実行・移動検証） | 未着手 | 0% | P1-B,P1-C | 入力駆動で位置が進む統合テスト | |
| P1-E | 30Hz スナップショット送信＋バックプレッシャ（1 tick おきバイナリブロードキャスト・serverTick/lastAckSeq・詰まりクライアント間引き・ラグ補償履歴の器） | 未着手 | 0% | P1-D | スナップショット bytes/backpressure の統合テスト | |
| P1-F | クライアント接続・入力送信・オフライン予測移動（WS 実装・WASD+PointerLock・60Hz 入力・prediction・自カプセル/一人称カメラ） | 未着手 | 0% | P1-A,P1-B,P1-C | オフラインで WASD 移動が快適（実機確認はユーザー） | |
| P1-G | スナップショット受信・リモート補間・調停（100ms バッファ Lerp/外挿・リモートカプセル描画・lastAckSeq 調停 replay） | 未着手 | 0% | P1-E,P1-F | **2 タブで互いに滑らかに動く**・人工遅延で操作感維持（実機確認はユーザー） | |
| P1-H | 検証・ドキュメント/skills 追従（4 検証 PASS・パケット実測・task-list/README/docs/skills 更新） | 未着手 | 0% | P1-A〜G | typecheck/lint/test/build 全 PASS・証拠記録 | |

※ シム tick 60Hz / 入力 60Hz / スナップショット送信 30Hz（レート分離）。射撃は sub-tick（後続）。
※ シムはデータ指向（プレーン typed 配列＋純粋関数）。bitecs/@miniplex は弾丸/bot が数千体規模になってから後入れ。
※ 実ブラウザ・実 WS の E2E は Sandbox 不可。node 環境のユニット/ロジック統合テストで担保し、2 タブ同期はユーザー実機確認（`実環境検証待ち`）。

---

## 検証待ち・将来タスク

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| CI-1 | GitHub Actions CI（typecheck / lint / unit / build / E2E）の `docs/ops/` 提案 → ユーザー配置 | 未着手 | 0% | P0-G | ワークフロー YAML を docs/ops に用意（`.github/workflows/` は書き込み不可、AGENTS.md §6.3） | |
| DEPLOY-1 | 静的ホスティング（Vercel/Netlify 等）へのデプロイ方針確定と手順書 | 未着手 | 0% | Phase 1 以降 | デプロイ手順を docs/ops に整備 | |

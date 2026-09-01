# P1-C: 権威サーバー（Colyseus + WebTransport 終端）+ ティックループの最小実装

> 対応タスク ID: `P1-C` (docs/ROADMAP.md)
> 計画書テンプレート: docs/planning/_TEMPLATE.md 準拠

## 1. 開始前確認

- 現在のブランチ / HEAD / `git status` を確認する (未コミット変更があれば停止)
- `docs/ROADMAP.md` で依存タスクの完了を確認する
- 関連仕様 (AGENTS.md §6 / .agent/skills/) を読む
- 本計画書の §5 (完了条件) と §7 (停止条件) を再読する

## 2. 目的 (Why)

FPS の核心は「サーバーが正 (authoritative) である」こと。クライアント予測 / サーバー調停 /
エンティティ補間 / ラグ補正はすべて、**サーバーが最終的に状態を決める**という前提で成立する。
本タスクは、**この権威サーバーの最小骨格**を実際に動かし、1 ルームでプレイヤー状態
（位置・視点・姿勢）の同期が成立することを確認する。これが P1-D（決定論 + クライアント予測）や
P2-B（WebTransport datagrams/streams）の土台になる。

## 3. 変更範囲 (Scope)

変更対象:
- `packages/server`（新規）: Colyseus (v0.16+) 権威サーバー、ティックループ、ルーム
- `packages/shared`（新規）: 決定論シミュレーション（移動）の共通ロジック
- `packages/client`（新規、最小）: サーバーへ入力送信・Snapshot 受信の骨格
- 関連ドキュメント更新: `docs/ARCH.md` §2（実装と設計の整合）、`docs/ROADMAP.md`（状態・証拠）

変更しない (境界外):
- ラグ補正・射撃判定 (P1-E)
- モバイル入力・3D 描画の最適化 (P3-*)
- WebTransport の本導入（本タスクは Colyseus + WebSocket で成立させ、QUIC は P2-B で導入）
- WebRTC / geckos.io（見送り確定）

## 4. 禁止事項

- 推測で仕様を補完しない。不明点は §7 の停止条件に従って質問する。
- 無関係なリファクタリングをしない。
- テストを通すためだけに期待値を実装へ合わせない。
- **本物の WebTransport (QUIC) を本タスクで導入しない**。このサンドボックスでは
  QUIC スタックをビルドできない（cmake / OpenSSL ヘッダ / autotools 無し、GitHub リリース配信ブロック）ため、
  P1-C は WebSocket で権威サーバーを成立させ、WebTransport は P2-B に回す。
  `.tmp/wt_udp/` の UDP 実証は「unreliable datagram の通信パターン確認」であり、
  **本物の WebTransport ではない**と明記する。
- 既存のドキュメント構造（docs/ の階層）を壊さない。

## 5. 完了条件 (DoD)

- [ ] `pnpm install` が通り、`packages/server` / `packages/client` / `packages/shared` が解決される
- [ ] `packages/server` が起動し、1 ルームでプレイヤー 2 名が join できる
- [ ] 1 ルームで、入力（位置・視点）がサーバーで検証・ブロードキャストされ、他プレイヤーに Snapshot が届く
- [ ] ティックループ（固定ステップ）が動作している（タイムスタンプ計測で確認）
- [ ] `packages/shared` の決定論シミュレーション（移動）がサーバー/クライアントで同結果（オフライン再現テスト）
- [ ] `docs/ROADMAP.md` の P1-C の状態・進捗・証拠を更新
- [ ] コミットをタスク ID を含む形で作成（例: `feat(P1-C): …`）

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit (vitest) | ◯ | shared の決定論シミュレーション（固定シードで同結果） |
| Component | — | — |
| E2E (Playwright / CI) | 任意 | 2 クライアントが 1 ルームで相互に Snapshot を受ける |
| 実環境 | △ | Node 専用サーバー(VPS) での永続稼働（DPL-2 で本格化） |

> 本サンドボックスではブラウザ E2E を開けないので、最小は「server 起動 + shared 単体 + ローカルノードプロセスで join 確認」。

## 7. 停止条件

次の場合は作業を停止し、変更せず報告する:
- 仕様書 (計画書・AGENTS.md・skills) 同士に矛盾がある
- ROADMAP.md 記載の変更範囲を超える変更が必要
- 破壊的変更 (既存データ・公開 API 互換性) が必要
- ユーザー判断が必要な設計論点に到達した
- 開始時点で作業ツリーに未確認の変更がある

## 8. 完了時に行うこと

1. 差分を自己レビュー (対象外の変更が混ざっていないか)
2. 4 検証 (typecheck / lint / test:unit / build) を実行
3. `docs/ROADMAP.md` の状態・進捗・証拠を更新
4. タスク ID を含むコミット (例: `feat(P1-A): …`) を作成
5. 証拠中心の完了報告 (結果 / テスト件数 / Git SHA / 残事項)

## 9. サブタスク分割

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| P1-C-a | shared 決定論シミュレーション（移動） | 固定ステップ・固定シード | — |
| P1-C-b | Colyseus 権威サーバー + ティックループ | ルーム join / validate / broadcast | P1-C-a |
| P1-C-c | 最小クライアント（入力送信・Snapshot 受信） | 予測 + 調停の骨格 | P1-C-b |
| P1-C-d | ローカル E2E（2 クライアント join 確認） | 実測ログ・証拠 | P1-C-c |

## 10. 設計詳細・仕様

- 権威サーバー: Colyseus (v0.16+)。`defineServer` + `Room`。ティックは `setSimulationInterval`（固定ステップ）。
- ネットワーク: まず WebSocket（Colyseus 標準）。WebTransport は P2-B で導入（サンドボックス制約のため）。
- shared 決定論: 固定タイムステップ・乱数シード化。Rapier は決定論的だが可変ステップは非決定論のため固定。
- 同期: 入力 (client→server) / Snapshot (server→client) は WebTransport `datagrams` 想定だが、
  P1-C では WebSocket + Colyseus のマッチメイキングに載せる。
- `.tmp/wt_udp/` との関係: これは「unreliable datagram の通信パターン」を UDP で再現したもので、
  **本物の WebTransport ではない**。本タスクの権威ロジックの参考実装として扱い、トランスポートは差し替える。

## 11. リスク・Gotchas

- **本サンドボックスでは本物の QUIC/WebTransport をビルド不能**（cmake / OpenSSL ヘッダ / autotools 無し、
  GitHub リリース配信ブロック）。P1-C は WebSocket で完成させ、WebTransport は P2-B で環境を分けて評価する。
- Colyseus の WebTransport transport (`@colyseus/h3-transport`) は **Experimental 表記**。本タスクでは使わない。
- Node に組み込み WebTransport が無い点は既知。終端は Go/Rust（本サンドボックス不可）/ C++（msquic 等）が候補。
  本タスクでは扱わず、P2-B で判断。
- 決定論テストは「オフライン再現」で担保（ブロードキャストの実測とは分離）。

## 12. 実績と証拠 (実装後に記入)

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| P1-C-a | | | |
| P1-C-b | | | |
| P1-C-c | | | |
| P1-C-d | | | |

# P1-C: 権威サーバー（geckos.io WebRTC + Socket.IO）の最小実装

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
P2-B（geckos.io のゲーム同期本格化）の土台になる。**トランスポートは geckos.io WebRTC（ゲーム同期）+ Socket.IO（ルーム・制御系）**。

## 3. 変更範囲 (Scope)

変更対象:
- `packages/server`（新規）: Node.js 24 権威サーバー。Socket.IO（ルーム・制御系）+ geckos.io WebRTC（ゲーム同期層）、ティックループ
- `packages/shared`（新規）: 決定論シミュレーション（移動）の共通ロジック
- `packages/client`（新規、最小）: サーバーへ入力送信・Snapshot 受信の骨格（Socket.IO + geckos.io クライアント）
- 関連ドキュメント更新: `docs/ARCH.md` §2（実装と設計の整合）、`docs/ROADMAP.md`（状態・証拠）

変更しない (境界外):
- ラグ補正・射撃判定 (P1-E)
- モバイル入力・3D 描画の最適化 (P3-*)
- WebTransport の導入（Node 側未成熟のため見送り。geckos.io で代替）
- ゲーム同期の完全な WebSocket フォールバック（P2-C で評価）

## 4. 禁止事項

- 推測で仕様を補完しない。不明点は §7 の停止条件に従って質問する。
- 無関係なリファクタリングをしない。
- テストを通すためだけに期待値を実装へ合わせない。
- **本物の WebTransport (QUIC) を本タスクで導入しない**（Node 側の実装が未成熟／Experimental。geckos.io WebRTC で代替）。
- **サーバー言語は Node.js に固定する。C++ / Go / Rust は採用しない**（`g++` が使える環境である点は事実として認識するが、TypeScript で shared をクライアント/サーバー import 共有できる利点を優先）。
- ゲーム同期の高頻度データ（位置・入力・Snapshot）を Socket.IO（TCP）に載せない（HoL ブロッキングで遅延が増えるため）。
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
| P1-C-b | 権威サーバー（Socket.IO ルーム/制御系 + geckos.io ゲーム同期 + ティックループ） | ルーム join / validate / broadcast | P1-C-a |
| P1-C-c | 最小クライアント（Socket.IO 接続 + geckos.io 入力送信・Snapshot 受信） | 予測 + 調停の骨格 | P1-C-b |
| P1-C-d | ローカル E2E（2 クライアント join 確認） | 実測ログ・証拠 | P1-C-c |

## 10. 設計詳細・仕様

- 権威サーバー: Node.js 24。**Socket.IO**（認証・ロビー・ルーム・チャット・マッチイベント）と **geckos.io WebRTC**（ゲーム同期層）を併用。
- ルーム/制御系: Socket.IO の `io`/`room`。join / leave / カウントダウン / チーム分けは Socket.IO で行う（reliable/ordered）。
- ゲーム同期: geckos.io の `channel`。ティックループは自前の固定ステップ（`setInterval`/`setSimulationInterval` 相当）。
  - 位置・視点・入力・Snapshot: `channel.emit('state', snapshot)`（unreliable/unordered、デフォルト）。
  - 射撃・被弾確定・重要イベント: `channel.emit('event', data, { reliable: true })`（再送・重複除去）。
- shared 決定論: 固定タイムステップ・乱数シード化。Rapier は決定論的だが可変ステップは非決定論のため固定。
- 指針: **高頻度ゲーム状態を Socket.IO（TCP）に載せない**。Socket.IO は制御系・確実性必須の低頻度イベントに限定。
- ネットワーク: WebTransport は導入しない（Node 側未成熟）。geckos.io WebRTC をゲーム同期の主経路とする。

## 11. リスク・Gotchas

- **本サンドボックスでは `node-datachannel`（geckos.io のネイティブ依存）のビルド/実行に制約がある**可能性。
  ビルドが不安定な場合は、正規の geckos.io を使って実環境（VPS）で検証する。
- geckos.io はサーバー側に **UDP ポート開放**が必要（`multiplex:true` で 1 ポートに集約可）。`9208/tcp`（シグナリング）も要る。
- 公開 IP の専用サーバーへの直接接続では **TURN 不要**（ICE ホスト候補で成立）。UDP ブロック網は Socket.IO（TCP）で動作を維持。
- ゲーム同期の完全な WebSocket フォールバックは P2-C で評価（本タスクでは扱わない）。
- 決定論テストは「オフライン再現」で担保（ブロードキャストの実測とは分離）。

## 12. 実績と証拠 (実装後に記入)

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| P1-C-a | | | |
| P1-C-b | | | |
| P1-C-c | | | |
| P1-C-d | | | |

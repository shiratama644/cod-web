# docs/arch — 仕様書（理想形）

ここは **どう作るか** の正本です。計画は [`../planning/`](../planning/)、進捗は [`../task-list.md`](../task-list.md)。

現行コード（単一ルーム FPS）と食い違う場合、**本ディレクトリが目標**です。実装の現状は task-list の「移行元」を見る。

## 実装時に守ること

1. **存在しない API を発明しない。** 記載外の外部 API は公式ドキュメントで実在とシグネチャを確認する。
2. **フェーズ順を飛ばさない。** [`milestones.md`](./milestones.md) の完了条件を満たす前に次へ進まない。
3. **[`adr.md`](./adr.md) に反する実装をしない。** 変更が必要なら実装せず人間に確認する。
4. **ADR に無い未決は勝手に決めない。** 該当箇所に到達したら質問する。
5. **決定論を壊さない。** [`engineering.md`](./engineering.md) の規則に反するコードは、テストが通っても不正解。
6. **トランスポートは現時点で WebSocket のみ。** UDP / WebRTC DataChannel / geckos.io / WebTransport は今は実装しない。将来 WT 移行のため `NetTransport` と Channel 区分は維持する（[`protocol.md`](./protocol.md) §トランスポート）。

## 仕様書一覧

| ファイル | 内容 |
| :--- | :--- |
| [product.md](./product.md) | プロダクト・用語・現行資産の移植判定 |
| [architecture.md](./architecture.md) | L0–L3、モノレポ、依存規則 |
| [types.md](./types.md) | TypeSpec / SimProfile / GameModeDefinition / RoomCtx |
| [protocol.md](./protocol.md) | パケット・AOI・WS 固定と WT 備え |
| [server.md](./server.md) | Room / TickScheduler / 入力キュー / レート制限 |
| [matchmaker.md](./matchmaker.md) | HTTP API・チケット・Redis |
| [client.md](./client.md) | バンドル分割・Babylon・入力・予測 |
| [sim-profiles.md](./sim-profiles.md) | voxel / fps のワールド・物理 |
| [engineering.md](./engineering.md) | 決定論・テスト・予算・脅威モデル |
| [ugc.md](./ugc.md) | QuickJS サンドボックス |
| [adr.md](./adr.md) | 意思決定ログ |
| [milestones.md](./milestones.md) | フェーズ 0–9 |
| [legal.md](./legal.md) | ライセンス・OSS・一次情報 |

新しい設計領域が固まったら `kebab-case.md` を追加し、本一覧と [`../README.md`](../README.md) を更新する。

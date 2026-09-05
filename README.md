# cod-web

ブラウザ向け **マルチタイプ・ゲームプラットフォーム**（`voxel` / `fps`）。ハブからルームに参加し、タイプごとのシミュレーションだけを差し替える。

**理想形の仕様正本:** [`docs/arch/`](./docs/arch/README.md)  
**進捗正本:** [`docs/task-list.md`](./docs/task-list.md)  
**作業規約:** [`AGENTS.md`](./AGENTS.md)

現行コードは単一ルーム FPS の原型（移行元）。描画の目標は Babylon.js。トランスポートの目標は当面 **WebSocket のみ**（WebTransport は条件付きの後続）。ライセンスは **MIT**（LICENSE ファイルは未配置）。

旧 FPS 専用ドキュメントは [`.archive/docs/`](./.archive/docs/) にあります。

## 現行コードの起動（移行元）

まだモノレポ化前の単一パッケージです。

```bash
bun install
bun run start          # vite build → ゲームサーバ :8080 と preview :4173
# 開発時
bun run server         # 権威ゲームサーバ :8080
bun run dev            # Vite :5173（/ws をプロキシ）
bun run typecheck
bun run lint
bun run test:unit
bun run build
```

マルチプレイヤー確認: サーバとクライアントを起動し、ブラウザでプレビュー URL を開く。タブをもう 1 つ開くと互いにカプセルが見える（位置同期）。

テストは `./_tests_/` にソース構造をミラー。エイリアスは `@/` `@shared/` `@server/`。ランタイムは bun。テストランナーは Vitest（`bun test` は使わない）。

## 理想形の要点

| 層 | 内容 |
| --- | --- |
| L0 | プロトコル framing、WS、マッチメイカー、ハブ |
| L1 | Room / ティック / 入力キュー（タイプ非依存） |
| L2 | VoxelProfile / FpsProfile のみ分岐 |
| L3 | `defineGameMode`（bedwars / FFA / TDM 等） |

詳細は [`docs/README.md`](./docs/README.md)。

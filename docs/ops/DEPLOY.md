# CodWeb デプロイ手順

CodWeb は **クライアント（ブラウザ / static）** と **権威ゲームサーバー（Node / VPS）** の 2 つに分かれてデプロイします。

> 権威ゲームサーバーは永続稼働・geckos.io WebRTC（UDP）と Socket.IO（TCP）・ルーム状態保持が必要なため、**サーバーレス（Vercel 等）は不向き**です。**自己管理の Node 専用サーバー（VPS / ゲームサーバー）**を想定します。

---

## 1. 全体像

| 成果物 | ホスト | 内容 |
| :--- | :--- | :--- |
| `packages/client` | 静的ホスティング（CDN / VPS / S3 等） | three.js + React のビルド済み静的ファイル |
| `packages/server` | VPS / ゲームサーバー（Node） | 権威サーバー（Node.js 24）。**Socket.IO（制御系: 認証・ロビー・ルーム・チャット・マッチイベント）+ geckos.io WebRTC（ゲーム同期層）**。永続稼働 |
| 決済・認証・永続 API | VPS / クラウド | HTTPS (REST/gRPC)。DB トランザクション |

---

## 2. クライアント（static）デプロイ

```bash
# 1. 依存インストール
pnpm install

# 2. ビルド
pnpm --filter client build     # 例。ビルド成果物が dist/ に生成される想定

# 3. 静的ホスティングへ配置（例: CDN / VPS の Web サーバー）
#    生成された dist/ を公開ディレクトリへアップ
```

- クライアントは SPA / 静的ビルドが可能。**CDN で配信**してレイテンシを最小化。
- 環境変数（例: `NEXT_PUBLIC_*` 相当）など、ビルド時に埋め込む設定はビルド前に設定。

---

## 3. 権威ゲームサーバー（VPS）デプロイ

### 3.1 前提

- **Node.js**（バージョンは `packages/server` の要件に従う。例: Node 24 LTS）
- **ゲーム同期層 = geckos.io WebRTC**、**制御系 = Socket.IO** を併用する。
  - geckos.io は `node-datachannel`（ネイティブ）前提。**UDP ポート**（`multiplex:true` なら 1 ポート）と **`9208/tcp`**（シグナリング）の開放が必要。
  - 公開 IP の専用サーバーへ直接接続する構成では **TURN 不要**（ICE ホスト候補で成立）。サーバー言語は **Node.js に固定**（C++ は採用しない）。

### 3.2 セットアップ

```bash
# 1. サーバー側の依存インストール
pnpm install

# 2. 本番ビルド
pnpm --filter server build     # 例。dist/ に生成される想定

# 3. 起動（フォアグラウンド）
npm --prefix packages/server start

# （プロセス管理を推奨）pm2 / systemd に登録
```

### 3.3 プロセス常駐の例（systemd / pm2）

pm2:
```bash
pm2 start packages/server/dist/index.js --name codweb-server
pm2 save
pm2 startup
```

systemd（例）:
```
[Unit]
Description=CodWeb Authoritative Game Server
After=network.target

[Service]
WorkingDirectory=/srv/codweb/packages/server
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### 3.4 ネットワーク・ミドルウェア

- **Socket.IO は TCP ポート**（`PORT`、WebSocket/TCP）。**geckos.io は UDP ポート**（`multiplex:true` なら 1 ポート）と **`9208/tcp`**（シグナリング）。
- ロードバランサ / リバースプロキシを挟む場合は、**geckos.io の UDP ポート透過**に注意（UDP ダイレクトが前提）。
- 一部ネットワークは UDP をブロックするため、**Socket.IO（TCP）で動作を維持**し、必要に応じてゲーム同期の WebSocket フォールバックを検討する（P2-C）。

---

## 4. 環境変数（想定）

| 変数 | 用途 | 既定値 |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | 自動 |
| `PORT` | Socket.IO / HTTP の listen port | 3000 |
| `GECKOS_PORT` | geckos.io のシグナリングポート（`9208/tcp`） | 9208 |
| `CLIENT_URL` | 許可するクライアントオリジン（CORS） | 開発時は localhost |
| `DB_URL`（任意） | 永続データの接続先 | 未設定なら自前 |

> 開発段階では `.env.example` を参考に `.env` を用意する（git 管理外）。

---

## 5. デプロイ後の検証チェックリスト

- [ ] クライアントがブラウザでロードされる（HTTP 200）
- [ ] `/health` などサーバーのヘルスチェックが応答
- [ ] Socket.IO でクライアント接続・認証・ルーム join が成立
- [ ] geckos.io（WebRTC/UDP）でゲーム同期接続が成立
- [ ] 1 ルームで複数クライアントが Join できる
- [ ] 6v6 相当の負荷でティックレート・ラグが目標内

---

## 6. トラブルシューティング

### 6.1 geckos.io（WebRTC）が接続できない
- ブラウザが WebRTC 対応か確認。
- UDP ポート（`GECKOS_PORT` シグナリング + データ UDP ポート）が開放されているか確認。`multiplex:true` で 1 ポート集約を確認。
- UDP がブロックされている可能性 → **Socket.IO（TCP）**で動作確認（ゲーム同期は劣化するが動作は継続）。
- `node-datachannel`（ネイティブ依存）が正しく読み込まれているか確認（ビルド・実行環境依存）。

### 6.2 ラグが大きい
- サーバーの場所（リージョン）をクライアントに近づける。
- ティックレート・バッチサイズを調整。

### 6.3 サーバーが落ちる
- メモリ・プロセス監視（pm2 / systemd の再起動設定）を確認。
- 過剰なルーム / 接続数に対する上限設定を確認。

---

## 7. ロールバック

- **静的クライアント**: 前のビルド成果物へ差し替え（CDN なら前のバージョンを公開）。
- **ゲームサーバー**: 前のコミット・ビルドへ戻して再起動。

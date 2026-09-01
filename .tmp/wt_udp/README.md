# wt_udp — CodWeb 権威ゲームサーバー（UDP 実証）

C++ の素の UDP ソケットで、**プレイヤーデータ（PlayerData）の送受信**が実際に動くことを
確認するための最小実証です。

## これは WebTransport なのか？

**本物の WebTransport（HTTP/3 + QUIC）ではありません。** このサンドボックスには
`cmake` / OpenSSL 開発ヘッダ / autotools が無く、さらに GitHub のリリースバイナリ配信
（`release-assets.githubusercontent.com`）もブロックされているため、QUIC スタック
（msquic / ngtcp2 / lsquic 等）をビルドできません。

そこで、この実証は **WebTransport が提供する `datagram`（unreliable / unordered,
latest-state-wins）の通信パターンを、UDP ソケット + 手組みバイナリプロトコルで再現**しています。

- 各パケットは自己完結（1 送出単位）
- 届かなくても「次のフレームの最新状態」で上書きされる（再送しない）
- サーバーは**最新状態だけ**を保持し、他プレイヤーへブロードキャスト

将来、本物の WebTransport に置き換える場合、**「プロトコル層」（下記）はそのまま**、下位の
「トランスポート層」を QUIC/WebTransport セッションに差し替えるだけです。

## 構成（アーキテクチャ上の位置付け）

```
ブラウザ (JS/TS)  ──(将来: WebTransport)──►  C++ 権威ゲームサーバー  ←── 本実証の C++ サーバー
                                              │
NodeJS (ウェブ層)  ←── 認証/課金/インベントリ/戦績の永続化（ゲームループ外）
```

- **ブラウザはフロントエンド**。NodeJS はフロントエンドではなく、ウェブ層（API/ビルド）。
- **C++ が権威ゲームサーバー**（リアルタイム・ゲームロジックを全て担当）。
- 本実証の `wt_client` は、ブラウザで動く JS の代わりに「毎フレーム送信・Snapshot 受信」を
  C++ で再現したもの。

## ファイル

| ファイル | 内容 |
| :-- | :-- |
| `protocol.h` | バイナリプロトコル定義。構造体のパディングに依存せず**明示バイト列**で固定（big-endian）。将来の WebTransport / 他言語クライアントと相互運用可能。 |
| `server.cpp` | 権威サーバー。`PlayerState` を受信→最新状態保持→他プレイヤーへ `Snapshot` ブロードキャスト。タイムアウト・`Bye` で離脱処理。 |
| `client.cpp` | クライアント（ブラウザ代替）。WASD/SPACE 入力（または `--demo` 自動移動）、60Hz で `PlayerState` 送信、`Snapshot` 描画。 |
| `Makefile` | `g++`/`make` のみ。`cmake` 不要。 |

## ワイヤーレイアウト（big-endian）

```
ヘッダ: [magic:4 = "CODW"][version:2][type:1][reserved:1]      = 8 バイト
ペイロード:
  PlayerState / Hello : 1 Player                                = 81 バイト
  Snapshot            : [count:1] + count × Player             （81×N + 1 バイト）

1 Player = 
  float x,y,z,yaw,pitch,vx,vy   (7 × 4 = 28)
  uint8  isShooting,isMoving,team,pad  (4)
  uint32 seq (4)  int32 playerId (4)
  uint8 nameLen(1)  char name[32]
  = 73 バイト
→ パケット合計 = 8 + 73 = 81 バイト（1 人/ 1 送出単位）
```

## ビルド・実行

```bash
cd .tmp/wt_udp
make build            # 警告ゼロでビルド（g++ -std=c++17）

# サーバー（ポート 9000）
./bin/wt_server

# クライアント2台（別ターミナル or &）
./bin/wt_client --name Alice --id 1 --demo --runtime 4
./bin/wt_client --name Bob   --id 2 --demo --runtime 4
```

対話操作（demo なし）: `WASD` 移動 / `SPACE` 射撃（isShooting フラグ）/ `Q` 退室。

## 動作確認（実測ログ）

サーバーが 2 クライアントの位置・視点・`isShooting` を毎フレーム受信し、
他プレイヤーへ Snapshot を中継することをローカルループバックで確認済み。
（両クライアントが互いの最新位置を受け取り合い、`tick`/`seq` が進む。）

## 制約・注意

- `--demo` を付けると stdin キー入力を読まない（自動移動）。同一端末で複数台を安全に動かせる。
- socket は**非ブロッキング**にしてある（`recvfrom` がブロックして送信が止まらないように）。
- この実証は「unreliable datagram」のみ。**確実・順序保証が必要なイベント**（着弾・キルログ等）は
  WebTransport の `streams` に相当する部分で、本実証では対象外。

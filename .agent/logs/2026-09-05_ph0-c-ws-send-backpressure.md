# PH0-C — Bun WS オプションと send() 背圧

> Date: 2026-09-05(JST) / Commit: (このコミット) / Branch: arena/01a06f8b-cod-web

## 1. 指示内容 (Task Summary)

Go。PH0-C（idleTimeout 等の WS オプション、`send()` の -1/0、`bufferedAmount` 廃止）。

## 2. 実行内容 (Executed Actions)

| # | 対象 | 内容 |
|---|---|---|
| 0 | サンドボックス再構築 | `git fetch` + `reset --hard FETCH_HEAD`（5afb369） |
| 1 | `server/index.ts` | WS オプション明示。send 戻り値をそのまま返す。drain で再開 |
| 2 | `Peer` | `sendBinary(): number`。`getBufferedAmount` 削除 |
| 3 | SnapshotBroadcaster | -1 で paused、0 で disconnect+leave |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- -1 は「今回キュー済み」なので、以降を paused にして `drain` まで送らない。テストは初回から -1 を返すと 0 通になる。
- サンドボックス再構築時は未コミットの混在ファイルを触らず FETCH_HEAD へ戻す。

## 4. 次にすべきこと (Next Actions)

PH0-D（`slice` → `subarray`）。

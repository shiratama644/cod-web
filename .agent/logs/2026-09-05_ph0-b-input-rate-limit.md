# PH0-B — 入力レート制限 90/s

> Date: 2026-09-05(JST) / Commit: (このコミット) / Branch: arena/01a06f8b-cod-web

## 1. 指示内容 (Task Summary)

Go。AGENTS.md を適用し PH0-B（入力 90/s burst 20、超過で切断）を実装する。

## 2. 実行内容 (Executed Actions)

| # | 対象 | 内容 |
|---|---|---|
| 1 | `server/net/rate-limit.ts` | TokenBucket + InputRateLimiter。nowMs 注入 |
| 2 | `server/index.ts` | decode 後に allow。失敗は ProtocolError。leave で remove |
| 3 | `_tests_/server/net/rate-limit.test.ts` | burst、再充填、60Hz 持続、200 同時、プレイヤー分離 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- 90/s ちょうどを浮動小数の間隔で回すと丸めで同一時刻になりうる。クライアント実レート 60Hz の持続テストの方が意味がある。
- トークンは decode 成功後に消費する（壊れたパケットでバーストを削らない）。

## 4. 次にすべきこと (Next Actions)

PH0-C（Bun WS オプション + `send()` -1/0）。

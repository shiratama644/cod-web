# PH0-A — BinaryReader + Input 16B

> Date: 2026-09-05(JST) / Commit: (このコミット) / Branch: arena/01a06f8b-cod-web

## 1. 指示内容 (Task Summary)

Go。AGENTS.md を適用し PH0-A（BinaryReader、16 バイト Input、長さ/範囲で切断）を実装する。

## 2. 実行内容 (Executed Actions)

| # | 対象 | 内容 |
|---|---|---|
| 1 | `shared/protocol/binary.ts` | BinaryReader + ProtocolError 1002 |
| 2 | packer / constants / quantize | Input 16B、type 0x10、pitch i16、move -100..100 |
| 3 | `server/index.ts` | message 全体 try/catch。不正は close 1002 |
| 4 | GameClient | type 込み decode。壊れた snapshot は捨てる |
| 5 | テスト | 16B 往復、15/17B、空、move 範囲外、dtMs clamp |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- decode は type 込み先頭から読む。旧 `decodeInput(view, 1)` は reserved 導入で壊れる。
- Snapshot の decode はバッファ全体ではなく `written` 長を渡す（リング余りをプレイヤーと誤認する）。

## 4. 次にすべきこと (Next Actions)

PH0-B（入力 90/s レート制限）。

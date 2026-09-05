# UGC（フェーズ 8）

`@sebastianwessel/quickjs`（WASM QuickJS）。[JSR](https://jsr.io/@sebastianwessel/quickjs) 上で Node と **Bun 対応**が明記されている。

`RoomCtx` は変更しない。移行作業は ctx メソッドのブリッジ、PlayerRef のプレーン化（既に readonly）、実行時間とメモリ上限、スクリプト配信。

| 項目 | 制限 |
|---|---|
| スクリプトサイズ | 64 KB |
| onTick | 8 ms |
| ルームヒープ | 32 MB |
| グローバル | `ctx` のみ。console は `ctx.log` |
| import / async / Promise | 禁止 |
| 正規表現 | 許可。ReDoS タイムアウト |

`gamemodes/*` が gamemode-sdk しか import できない規則が、そのままサンドボックス境界になる。

# 決定論・テスト・予算・セキュリティ

## 決定論（`SimProfile.step` 配下。違反は即バグ）

| 禁止 | 代替 |
|---|---|
| `Math.random()` | `ctx.random()`（xoshiro128**、welcome の seed） |
| `Date.now` / `performance.now` | `ctx.tick` / `ctx.elapsedMs` |
| `setTimeout` / `setInterval` | `ctx.after` / `ctx.every` |
| 比較関数なし `sort` | 明示比較の安定ソート |
| Map/Set の反復順依存 | ソート済み配列 |
| `for...in` | 明示キー配列 |
| I/O, fetch, fs | 禁止 |

予測用 RNG とサーバ専用（ドロップ等）は **別インスタンス**。比較は量子化後のバイト列。

## テスト最低ライン

| 種別 | 最低 |
|---|---|
| 量子化ラウンドトリップ | 各フィールド 10,000 |
| 決定論 | 各プロファイル 1,000 ティック × 100 |
| client/server 同一入力 | 各プロファイル |
| プロトコル fuzz | 1,000,000。プロセスが落ちない |
| 固定長 ±1 | 全固定パケットが切断 |
| レート制限 | 全項目 |
| バックプレッシャ | send=-1 でチャンク停止 |
| GC | 1,000 ティックでヒープ増 &lt; 1MB |
| AOI 帯域 | 下記目標 |
| 負荷 | 32 人 × 4 ルームがティック予算内 |
| seq 欠落 | モックでパケットドロップ |


## Coverage / E2E 品質ゲート（Phase 1.5）

Phase 2 以降の大きな分離に入る前に、Vitest coverage と Playwright E2E を品質ゲートとして追加する。

| 項目 | 方針 |
|---|---|
| Coverage runner | Vitest coverage。provider は公式 docs と installed version を確認し、まず `v8` を基本にする。Bun runtime で動かない場合は停止して fallback を判断する |
| 測定対象 | production source を明示 include。protocol / engine-core / profile-fps / web / gameserver を対象候補にし、entrypoint・型のみ・生成物などは理由付きで exclude |
| Baseline | 初回 baseline を記録してから meaningful tests を追加する。threshold は baseline 後に ratchet し、数字だけの過剰設定を避ける |
| Meaningful tests | protocol 境界、固定長/例外、input accumulation、prediction/reconcile、interpolation、server rate-limit/backpressure/lifecycle、net transport を優先 |
| 禁止 | import-only test、実装詳細だけの shallow test、難しい production file の安易な exclude、coverage のための assertion 弱体化 |
| E2E | Playwright Test。`webServer` で local server を起動し `baseURL` から user-visible state を検証する。Sandbox で browser 実行不可なら CI / 実環境検証待ちと明記する |

## サーバ予算

| 項目 | 予算 |
|---|---:|
| doTick fps 16 人 | p99 &lt; 4 ms |
| doTick voxel 32 人 | p99 &lt; 12 ms |
| step 1 人 | &lt; 0.08 ms |
| onTick | &lt; 8 ms（5 連続超過でモード停止） |
| 1 ノード ルーム | 20–40（CPU 70%） |
| 同時接続 | 300–600 |

## クライアント予算

中位機 &lt; 8 ms/frame（125 FPS）、低スペック &lt; 16 ms（60 FPS）、ドローコール &lt; 100、入力→画面 &lt; 2 フレーム、通常フレーム GC 0、初期バンドル gzip &lt; 300 KB、ゲーム追加 gzip &lt; 1.5 MB、参加からプレイ &lt; 3 秒（キャッシュ済）。

## 帯域（クライアント受信）

| シナリオ | 受信 | 送信 |
|---|---:|---:|
| fps 16 | &lt; 20 KB/s | &lt; 1.2 KB/s |
| fps 32 | &lt; 35 KB/s | &lt; 1.2 KB/s |
| voxel 32 分散 | &lt; 15 KB/s | &lt; 0.7 KB/s |
| voxel 32 密集 | &lt; 30 KB/s | &lt; 0.7 KB/s |
| voxel 初回チャンク | ピーク 200 KB/s、10 秒以内 | — |

現行フルスナップショット 20 人は総帯域約 193 KB/s（参考）。AOI 未実装。

## セキュリティ

サーバ権威のみ。クライアント難読化・改変検出には投資しない（OSS で成立しない。Krunker でも継続バイパス）。

クライアントが送ってよいのは入力と意図。位置・体力・スコア・所有権はサーバ。ヒットはサーバが巻き戻し再計算。申告位置の乖離は記録するが即切断しない。

フェーズ 0 から: 長さ検証、境界チェック、try/catch、レート制限、backpressureLimit + closeOnBackpressureLimit。

チャット 2 msg/s・200 文字。表示名から制御文字・ゼロ幅を除去。

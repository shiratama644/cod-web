# マイルストーン

完了条件を満たさずに次へ進まない。現行リポジトリの「Phase 0–1 FPS」は **移行元**であり、下表のフェーズ番号とは別物。

## フェーズ 0 — 現行コードの穴（1–2 日）

Babylon 移行より前。

- Input 長さ検証（理想 16B。現行 13B からの変更は計画書で明示）
- BinaryReader 境界チェック、handleMessage 全体 try/catch
- 入力レート制限（90/s 超で切断）
- バックプレッシャ: `send()` の -1 / 0。`bufferedAmount` に依存しない
- `perMessageDeflate: false`、`backpressureLimit`、`closeOnBackpressureLimit`
- `buffer.slice` → `subarray`
- idleTimeout 30、sendPings true
- lagcomp `record()` 毎ティック、または削除

**DoD:** 100 万 fuzz で落ちない。固定長 ±1 で切断。

## フェーズ 1 — モノレポと Babylon（1–2 週）

workspaces、`noRestrictedImports`、R3F シーン削除、`createEngine`、unadjustedMovement、入力累積、React を HUD/メニューのみ、単一マップで FFA が Babylon 上で動く。チャンク同期はまだ。地形は静的埋め込み可。

**DoD:** ドローコール &lt; 100。中位機フレーム &lt; 8ms。移植したユニットテストが通る。

未決の確認: モバイル入力はこのフェーズでは入れない（後続）。FPS マップは CDN 前提でパスだけ決める。

## フェーズ 2 — Sim Profile 分離（2–3 週）

SimProfile、FpsSimProfile（BVH）、VoxelSimProfile（voxel-physics-engine をサーバで）、TYPE_SPECS 量子化、同一 step、両プロファイルで予測。

**DoD:** 決定論 1000×100、client/server 一致。

## フェーズ 3 — ゲームモード API 第 1 版（1 週）

defineGameMode、Ctx、Runtime、レート制限、ティックタイマー、`gamemodes/fps-ffa` 最小。

**DoD:** レート制限テスト全項目。モード例外でルームが落ちない。

## フェーズ 4 — ハブとマッチメイカー（2 週）

独立 matchmaker、Redis、HMAC 座席、マルチルーム、ハブ UI、動的 import、バージョンハッシュ。voxel 永続化の保存方式をここで決めて実装開始。匿名 uid。

**DoD:** 満室へ同時 20 接続で席重複なし。初期バンドル &lt; 300 KB gzip。

## フェーズ 5 — 2 つ目のタイプ ★最重要

voxel-creative、voxel-bedwars、fps-tdm。

**DoD:** 4 モードが動く。engine-core にタイプ分岐がない。

## フェーズ 6 — API 再設計（1 週）

フェーズ 5 の欠陥を反映。4 モード移植。ADR 更新。1 回作り直す前提。

## フェーズ 7 — 同期の本実装とスケール（3–4 週）

チャンク codec、断片化、BlockDelta seq、ブロック検証 8 項目、AOI、デルタ、巻き戻しヒット、reusePort マルチプロセス。リージョンはまだ 1 拠点。

**DoD:** 帯域目標全シナリオ。32 人 × 4 ルームがティック予算内。

## フェーズ 8 — UGC（1–2 ヶ月）

QuickJS、ブリッジ、制限、エディタ、モデレーション。

## フェーズ 9 — WebTransport（条件付き）

[protocol.md](./protocol.md) の 3 条件が揃うまで着手しない。WS フォールバック維持。改善なしなら無効化。

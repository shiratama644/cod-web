# ログ: 権威サーバー設計の確定（server-authority.md 新規）

- 日時: 2026-09-03
- 種別: docs（設計仕様・ADR 相当）
- ブランチ: arena/01a062ac-cod-web
- 前提: Phase 0 完了（`dfac639`）

## ユーザー要望

権威サーバーの設計を決めたい。決まっていることをまとめ、決まっていないことを質問、必要なら Web 検索。

## 質問と回答（ask_user）

1. **マッチ/ルーム形態・規模** → **Krunker 風 大人数ロビー（20〜40人/ルーム・FFA/TDM 中心）**
2. **サーバー実装の土台** → **自前の軽量実装ベース。Colyseus は設計パターンのみ参考（ライブラリ不使用＝hybrid）**
3. **サーバー物理の権威範囲** → **まず自前キネマティック移動（shared 純粋関数）。Rapier は後から**
4. **Phase 1 の最小範囲** → **位置同期（動くプレイヤーが見える）だけ。射撃は次**

## Web 検索で確認した事実

- Colyseus: WS ファースト（WebTransport ネイティブなし）。`@colyseus/bun-websockets` で bun 公式対応。ルームライフサイクル・schema 状態同期（デルタ圧縮・約15ms）・マッチメイキング・Redis 水平スケール・固定ステップ/ラグ補償 netcode ガイドあり。→ ライブラリ同期機構は 30Hz/msgpackr/WT 方針と二重化するため不採用、パターンのみ流用。
- bun: HTTP/3 は v1.3.14 で実験サポート、**WebSocket over HTTP/3 と WebTransport は未サポート**（issue #13656 オープン）。→ WT は Caddy エッジ終端で、Phase 1 は WS 先行が妥当。

## 成果物

- **新規 `docs/arch/server-authority.md`**: 権威サーバー設計仕様。
  - ルーム形態（20〜40人/FFA/TDM・初期 AOI 不要・フルスナップショットで帯域試算）
  - 確定判断表（自前 bun+WS、Colyseus パターンのみ、自前キネマティック物理先行、Phase 1 は WS で位置同期）
  - プロセス構成（Caddy エッジ → bun、WT 段階ロールイン、NetTransport 抽象）
  - ルームライフサイクル/seat reservation パターン（Phase 1 は固定ルーム）
  - 固定30Hzシム・shared 純粋関数 `stepPlayer`
  - InputCommand / Snapshot のメッセージ形状、予測・調停（ackInputSeq リプレイ）・補間（100ms）
  - ラグ補償（履歴バッファの器、射撃フェーズで使用）
  - スケール/デプロイ見通し、Phase 1 マイルストン、残論点
- 整合更新:
  - `networking.md`: §8 決定サマリにサーバー設計確定の追記と server-authority.md へのリンク。
  - `tech-stack.md`: アーキテクチャ行の「トランスポート検討中」を確定に修正、Colyseus 行を「不採用・パターン参考のみ」に、rapier3d 行に「キネマティック先行」を明記。
  - `docs/arch/README.md` / `docs/README.md`: 仕様書一覧・ツリーに server-authority.md 追加。
  - `.agent/skills/tech-stack.md`: Colyseus 行を不採用に、権威サーバー方針のコツを追記。

## 検証

- docs-only 変更。4 検証はスキップ（AGENTS.md §3.1）、代わりに相対 .md リンク全件チェック → BROKEN 0。
- 旧名称/矛盾（「検討中」「Colyseus 候補」「トランスポート検討中」）の残存を grep で確認し是正。

## デベロッパーからの助言と反映（追記・同日）

デベロッパーより具体的な低遅延パケット/サーバ設計の助言（初版は WT 寄り、改訂版で **WebSocket ベースに統一**）。改訂版の内容を採用し正本へ反映:

- **WS サーバー基盤**: 助言は `uWebSockets.js`（Node）。Web 検索で確認した事実: **bun のネイティブ WebSocket は内部で uWebSockets を使用**し、TCP_NODELAY・pub/sub・backpressure が組込み済み。Node 向け `uWebSockets.js` パッケージは **bun では動作しない**（bun メンテナ Jarred Sumner のコメント）。→ **追加アドオンなしで bun ネイティブ WS を使う**方針で uWS の長所を得る。
- **高頻度パケットは手動バイナリ固定レイアウト（DataView/ArrayBuffer）を Phase 1 から採用**（当初決定「全 msgpackr」を高頻度について修正）:
  - Input Packet ~12B: seq(u32) / moveX・moveZ(i8×2) / yaw(u16, 0〜2π→0〜65535) / pitch(i8) / flags(u8) / dt(u16 ms)。**60Hz 送信**。
  - Snapshot Packet ~650B（40人）: ヘッダ serverTick(u32)+lastAckSeq(u32)=8B、1人16B（playerId u16 / xyz i16×3 を 0.01m 固定小数点 / vel i16×3 / yaw u16）。**MTU ~1200B に 1 発収容**、30Hz ブロードキャスト。pitch/flags を足しても ~729B で MTU 内。
  - 固定小数点: 座標 int16 は原点 ±327.67m。広域マップは相対オフセット/int32 化が将来課題。
  - ゼロアロケ（静的バッファ再利用）・リトルエンディアン・先頭に種別 1B。
- **レート構成を修正**: 入力 **30Hz → 60Hz**（操作レイテンシ半減、上り ~12B×60/s で微小）。サーバー tick・スナップショットは 30Hz（20〜30Hz で調整）。描画 60〜120FPS は据え置き。
- **バックプレッシャ**: 送信前にソケットバッファを監視し、詰まったクライアントへは古いスナップショットをスキップ（bun: `ws.send()` 戻り値 / `bufferedAmount` / `backpressureLimit`）。
- **リモート補間**: 50〜100ms バッファ、過去2フレームを Lerp（レンダー時刻は現在より ~50ms 過去）。詰まれば短時間外挿。
- **共有移動**: `applyMovement(state, input, colliders)` を shared の純粋関数で（SPEED 8.0 / GRAVITY -20.0 / JUMP_FORCE 7.0 はチューニング対象）。量子化後の値で両者が計算し決定論を保つ。
- **Phase 1 ロードマップ**: デベロッパーの5ステップ（接続→オフライン移動→入力送信&サーバtick→スナップショット&補間→調停&遅延耐性）を bun WS 構成に合わせて server-authority.md §8 に反映。

### 反映ファイル
- `docs/arch/server-authority.md`: §2 判断表に WS基盤/高頻度バイナリ/60Hz入力/バックプレッシャ/補間を追加、§6 をバイナリパケット設計（6.1 Input / 6.2 Snapshot / 6.3 Backpressure / 6.4 予測調停補間 / 6.5 共有移動 / 6.6 ラグ補償）に全面改訂、§8 を5ステップに。
- `docs/arch/networking.md`: §3 入力を 60Hz、§4.1 入力行を 60Hz、§5 シリアライズを「高頻度バイナリ/低頻度 msgpackr」、§8 サマリ更新。
- `docs/arch/tech-stack.md` / `.agent/skills/tech-stack.md`: レート・シリアライズ・msgpackr スコープ・uWS=bun ネイティブの注記を整合。

### 検証
- docs-only。相対 .md リンクチェック BROKEN 0。

## 次

設計は確定。Phase 1（位置同期）の**計画書** `docs/planning/PHASE01_PLAN.md` 作成は、ユーザーの「Go」待ち。

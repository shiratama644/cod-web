# 通信プロトコル議論 → 設計決定（WebTransport/WS・30Hz・msgpackr・可変FPS・FX クライアント再生）

> Date: 2026-09-03(JST) / Commit: (commit 後に追記) / Branch: arena/01a062ac-cod-web

## 1. 指示内容 (Task Summary)

- プロダクト目標を「AAA級」から「**Krunker.io の完全上位互換・どの端末でも 60FPS 以上**」へ変更。レンダラーは「**WebGPU ベース、API が使えなければ WebGL2 へフォールバック**」を明記。
- 通信プロトコルを議論。ユーザーから「P2P でなく権威サーバー構成なら STUN/TURN は不要では」との指摘（正しい）。
- 追加要望: ①描画 FPS は**可変**（60 固定でなく 120Hz スマホ対応）、②射撃アニメ等は `isShooting: boolean` 等の最小状態で管理しクライアント描画してパケット削減。

## 2. 調査で確定した事実（2026-09-03 Web 検索）

- **Krunker.io は socket.io（WebSocket/TCP）** で動作、クライアント予測＋ラグ補償で高速感を実現。「ブラウザFPS＝UDP 必須」ではない。
- **STUN/TURN は P2P（両者が NAT 背後）で必要**。クライアント→公開権威サーバーの一対多では、geckos.io でもサーバー公開IP＋HTTP シグナリング＋UDP ポート開放だけで STUN/TURN 不要（ユーザー指摘が正しい）。
- **WebTransport（HTTP/3・QUIC）が 2026 年の本命**: datagrams（非信頼・HOL なし）と streams（信頼）を 1 接続で併用、NAT 越え不要・443 番・TLS1.3。Safari 26.4（2026-03）で Baseline 入り。ただし**古い Safari・iOS WebView・UDP/443 を塞ぐ企業/ホテル Wi-Fi では WS フォールバック必須**。
- **bun は HTTP/3 を v1.3.14 で実験サポートしたが WebTransport サーバー API は未実装**（issue #13656）。Node もネイティブ非対応。

## 3. 決定事項（docs/planning/NETWORK_DESIGN.md に記録）

| 論点 | 決定 |
|---|---|
| 描画 FPS | **可変**（rAF = 60〜120Hz+）。60 は下限フロアであり上限ではない。全移動・アニメは delta time ベース |
| サーバー tick / 入力 | **30Hz / 30Hz**（業界スイートスポット） |
| トランスポート | **WebTransport（datagrams+streams）主 / WebSocket フォールバック**。geckos.io 不採用（bun 非互換の恐れ＋別 UDP ポートで FW に弱い）。STUN/TURN 不要 |
| サーバーランタイム | bun で WS＋ゲームロジック、HTTP/3/WT は Caddy エッジ終端（bun の WT ネイティブ対応後に寄せる） |
| ネットモデル | 権威サーバー＋クライアント予測＋調停＋ラグ補償＋補間（補間バッファ ~100ms） |
| シリアライズ | **全メッセージ msgpackr** で開始（開発速度優先）。高頻度パケットは将来 bitpacking 移行の余地を残す |
| FX/アニメ同期 | アクションフラグ（`isShooting`/`isReloading`/`isAiming` 等のビットフィールド）＋発射トリガー（`{playerId,seq,weapon}`）のみ送信。**マズルフラッシュ・反動・トレーサー・薬莢・パーティクルは各クライアントが決定論的にローカル再生** |
| ボイス | 後方フェーズ。WebRTC MediaStream / LiveKit（SFU） |

## 4. 更新したファイル

- `docs/planning/NETWORK_DESIGN.md`（新規・決定記録）
- `docs/CONFIG.md`（目標を Krunker 上位互換・全端末60FPS に。§4 ネットワーク表を WebTransport/WS 決定版に。黄金ルールに可変FPS・FX 非同期を追記。WebGPU→WebGL2 フォールバック明記）
- `README.md` / `docs/README.md` / `docs/task-list.md` / `AGENTS.md §6.6`
- `.agent/skills/game-engineering-principles.md`（ネットワーク決定・可変FPS・FX 同期を追記）
- `.agent/skills/tech-stack.md`（ネットワーク表を決定版に・bun の WT 未実装を注記）

## 5. 気づき・知見

- ユーザーの「P2P でなければ STUN/TURN 不要」は正しく、私の初回説明（「STUN/TURN が必要で複雑」）は geckos.io について不正確だった。実際の geckos のコストは「別 UDP ポート＋ node-datachannel ネイティブ依存（bun 非互換の恐れ）」で、NAT 越えではない。
- WebTransport は「UDP の長所（非信頼・HOL なし）を NAT 設定不要・443・TLS で使える」点で geckos.io より運用が安全。ただし bun サーバーが未対応のため、初期は Caddy エッジ終端でブリッジする構成にした。
- 描画可変FPSと固定ネット tick の分離はブラウザゲームの定石。delta time 徹底と delta クランプ（すり抜け防止）が実装ポイント。
- `isShooting` の boolean 案は正しいが、フルオートの個別発射タイミングは boolean だけだと取りこぼすため、状態フラグ（ビットフィールド）＋離散発射トリガー（seq 付き）の併用を設計に盛り込んだ。

## 6. 次にすべきこと

- Phase 0（プロジェクト基盤）はこのネットワーク方針を前提に進める。Phase 0 では NetTransport 抽象境界の**インターフェースだけ**定義し、実装（WT/WS）は Phase 1 ネットワーク。
- Phase 1 で Caddy エッジ終端＋ bun WS サーバーの実結合を実機検証（Sandbox では実結合不可なので「実環境検証待ち」）。bun の WebTransport サーバー成熟度をその時点で再調査。

# ログ: protocol.md を networking.md に統合、modules.md をアーキ構成書に書き直し

- 日時: 2026-09-03
- 種別: docs（仕様書整理）
- ブランチ: arena/01a062ac-cod-web
- 親コミット: 65c2c75（ユーザーが docs/arch/protocol.md と docs/arch/modules.md を追加した "Update"）

## 背景

ユーザーが 2 ファイルを追加したが、いずれも過去の旧ドキュメント由来で現在の確定仕様と不整合があった。ask_user で方針を確認:
- **modules.md** → 「モジュール/アーキ構成書に作り直す（replace-with-module-arch）」
- **protocol.md** → 自由回答「**まだ protocol.md の内容を networking.md に追加してください**」

## 実施内容

### 1. protocol.md の分類マトリクスを networking.md §4 に統合
- 旧 §4「メッセージ種別と信頼性」を、protocol.md のデータ種別×プロトコル分類を取り込んだ **§4「メッセージ分類とプロトコル・信頼性（データ種別マトリクス）」** に拡張。3 層構成:
  - §4.1 datagrams（非信頼・上書きデータ）: 座標/視点/姿勢・入力・アクションフラグ（いずれも **30Hz**）
  - §4.2 streams（信頼・失えないイベント）: 被弾ダメージ確定・キルログ/スコア・チャット・購入・マッチ/ルーム管理。発射トリガーは C→S は datagram、ダメージ確定は stream
  - §4.3 HTTPS API（永続・ACID）: 課金/ガチャ・認証(JWT/OAuth)・インベントリ・戦績・CDN アセット配信（この層は networking.md に新規追加）
  - §4.4 プロトコル選定 3 原則（datagrams=上書きされるデータ / streams=失えないイベント / HTTPS=永続・お金・アカウント）
- **既存確定仕様に reconcile（そのまま転記せず矛盾を是正）**:
  - 視覚EFXを datagram 送信 → **FX は送らずクライアント決定論的再生**（§4.1 に注記、§5 と整合）
  - ボイスを WebTransport datagrams+WebCodecs → 本統合には含めず（§7 の WebRTC/LiveKit 後方フェーズが正本）
  - 入力「毎フレーム 60〜120Hz 送信」→ **送信 30Hz**（描画は可変 60〜120fps だが送信は独立 30Hz）と注記
  - WS フォールバックの記述が無かった → 各層・§4.4 に明記（seq で古パケット破棄で HOL 緩和）
- protocol.md は内容を統合したため **ポインター（統合済みリダイレクト）** に置換。二正本化を回避。

### 2. modules.md をモジュール＆アーキテクチャ構成仕様書として新規作成
- 旧内容は旧 CONFIG.md（AAA級時代のスタックガイド、geckos.io/Colyseus/bitecs/yuka 等の古い記述）のコピーで、ファイル名（modules）と内容が不一致だった。全面書き直し。
- 構成: §1 全体層構成（Client / Shared / Game Server / Web API・CDN の ASCII 図）、§2 責務分担表、§3 Client `src/` 構成、§4 Shared モジュール（純粋 TS・テスト容易）、§5 Game Server(bun) 構成、§6 Web API/CDN、§7 依存方向ルール、§8 bun workspaces 構成方針。
- 一貫させた点: クライアント予測と権威シミュレーションは shared の同一純粋関数を共有 / サーバーは three/react/DOM に依存しないヘッドレス / ネット送信・描画は薄いアダプタ層に閉じる / Phase 0 は client 骨組み＋NetTransport 抽象のみ（WT/WS 実装は Phase 1）。

### 3. 索引更新
- docs/arch/README.md: 仕様書一覧に modules.md 追加、networking.md に「プロトコル分類マトリクス」追記。「Agent 記憶」行を skills 是正定義（agent のスキル＝ノウハウ）に整合。
- docs/README.md: ディレクトリツリーに modules.md・protocol.md（ポインター）追加、networking.md 説明更新。

## 検証
- docs-only 変更のため 4 検証（typecheck/lint/test/build）は package.json 未作成（Phase 0）につき実行不能。整合性確認で代替。
- docs/arch/*.md の相対 .md リンクを全件チェック → BROKEN 0。
- 矛盾 reconcile 項目を §5/§7/§8 の既存確定値と突き合わせ済み。

## 変更ファイル
- docs/arch/networking.md（§4 拡張）
- docs/arch/modules.md（全面書き直し）
- docs/arch/protocol.md（ポインターに置換）
- docs/arch/README.md（一覧更新）
- docs/README.md（ツリー更新）
- .agent/logs/2026-09-03_integrate-protocol-and-rewrite-modules.md（本ログ）

## 停止
本タスク（protocol/modules 組み込み）完了。Phase 0（P0-A: bun で Vite+React+TS 初期化）はユーザーの「Go」待ち。

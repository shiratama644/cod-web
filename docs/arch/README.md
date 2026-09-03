# docs/arch — 仕様書（Architecture & Design Specs）

ここには **仕様書（どう作るか）** を置く。「何を・どの順で・どんな完了条件でやるか」の**計画書**は [`../planning/`](../planning/) とは明確に区別する。

## 仕様書 vs 計画書

| 種類 | 置き場所 | 内容 | ライフサイクル |
| :--- | :--- | :--- | :--- |
| **仕様書** | [`docs/arch/`](./) | 技術選定・プロトコル・アーキテクチャ・設計ルール（どう作るか） | 設計判断の**正本**。更新され続ける |
| **計画書** | [`docs/planning/`](../planning/) | フェーズ/タスクの目的・変更範囲・完了条件・停止条件・サブタスク（何をやるか） | フェーズ単位・着手前に作成 |
| **進捗正本** | [`../task-list.md`](../task-list.md) | タスク ID・状態・証拠 | 随時更新 |
| **Agent 記憶** | [`../../.agent/`](../../.agent) | skills（**agent のスキル**＝ノウハウ・テクニック・手順・パターン）/ hooks（定型手順）/ logs（実行記録） | 設計事実の正本は arch。skills は「こうやるとうまく作れる」の実践知 |

- 仕様書が実コードと食い違う場合は、実コードを確認したうえで**このディレクトリの仕様書を更新**する。
- 計画書・AGENTS.md と仕様書が矛盾する場合は、AGENTS.md §6.8 の優先順位（計画書 ＞ AGENTS.md）に従うが、アーキテクチャの事実そのものは本ディレクトリが正本。

## 仕様書一覧

| ファイル | 内容 |
| :--- | :--- |
| [tech-stack.md](./tech-stack.md) | 技術スタック完全ガイド（採用ライブラリ・役割分担）＋ Krunker 上位互換・全端末 60FPS の設計・実装黄金ルール（WebGPU→WebGL2 フォールバック、可変 FPS 等） |
| [modules.md](./modules.md) | モジュール＆アーキテクチャ構成（client / shared / server / web の層構成・責務分担・ディレクトリ構成・依存方向ルール） |
| [networking.md](./networking.md) | ネットワーク＆リアルタイム設計の決定記録（WebTransport 主 / WebSocket フォールバック、シム60Hz・送信30Hz・入力60Hz、msgpackr、FX クライアント再生、サーバーランタイム構成）＋ **データ種別×プロトコル分類マトリクス（datagrams / streams / HTTPS）** |
| [server-authority.md](./server-authority.md) | **権威サーバー設計**：ルーム形態（20〜40人/FFA/TDM）・自前軽量実装（Colyseus はパターン参考のみ）・自前キネマティック物理先行・固定60Hzシム・入力60Hz/スナップショット30Hz送信（レート分離）・予測/調停/補間・Phase 1（WS で位置同期）マイルストン |
| [game-engineering-principles.md](./game-engineering-principles.md) | FPS 設計の黄金ルールと実装パターン集（ゲームループ分離・ゼロアロケーション・可変 FPS・FX 同期・ネットワーク概要） |

---

> 新しい設計領域（例: ECS 設計・アセットパイプライン・マッチメイキング等）の仕様が固まったら、本ディレクトリに `kebab-case.md` で追加し、この一覧を更新する。

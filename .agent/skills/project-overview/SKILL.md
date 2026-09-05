---
name: project-overview
description: プロダクトの全体像（目標・現行コードと理想形・フェーズ進捗）を掴む。新規セッションの最初に読む 1 スキル。
---

# Project Overview — cod-web

> 製品の全体像。新規セッションの最初に読む 1 ファイル。
> 仕様の正本は [`../../../docs/arch/product.md`](../../../docs/arch/product.md)。
> 進捗の正本は [`../../../docs/task-list.md`](../../../docs/task-list.md)。

## 製品

**cod-web** はブラウザ向け **マルチタイプ・ゲームプラットフォーム**。

- タイプ: `voxel`（ブロック世界）と `fps`（静的アリーナの射撃戦）
- プラットフォーム層（L0/L1）を共有し、Sim Profile（L2）だけ差し替える
- 描画は **Babylon.js**。voxel クライアントは **noa-engine**
- トランスポートは **今 WebSocket のみ**（将来 WT のため `NetTransport` は維持。今は実装しない）
- ライセンス **MIT**。初期は匿名（表示名＋一時 uid）。認証・ランキングは後続
- モバイルは両タイプ対象（タッチ実装は後続）。ボイスは理想に含むがゲーム同期には WebRTC を使わない

現行コードは単一ルーム FPS の原型（**移行元**）。理想フェーズ番号（0–9）とは別物。破棄/移植は product.md の表。

## 技術スタック（要点）

| 層 | 理想 | 現行コード（移行元） |
| :--- | :--- | :--- |
| ビルド | Vite + React + TypeScript（strict）、bun | 同じ（単一パッケージ） |
| 3D | Babylon.js。voxel は noa | Three.js / R3F / WebGPU→WebGL2。**破棄予定** |
| シム | `SimProfile.step`。L1 にタイプ分岐を書かない | shared の FPS 物理（three-mesh-bvh CC） |
| ネットワーク | bun `Bun.serve` WS。手書きバイナリ。Input 16B | bun WS + 手書きバイナリ。レイアウトは理想へ更新 |
| UI | React はハブ・HUD・設定のみ（ADR-003） | R3F Canvas + HUD |
| Lint / Test | Biome、Vitest、テストは `_tests_/` | 同じ |

詳細なハマりどころは [`tech-stack/SKILL.md`](../tech-stack/SKILL.md)。設計ルールは [`docs/arch/engineering.md`](../../../docs/arch/engineering.md) と [`docs/arch/adr.md`](../../../docs/arch/adr.md)。

## フェーズ進捗

> 正本は [`docs/task-list.md`](../../../docs/task-list.md)。下表は要点のみ。

| Phase | 内容 | 状態 |
| :--- | :--- | :--- |
| **0** | 現行コードの穴（長さ検証・fuzz・backpressure・slice） | 未着手（計画書 `PLAT-0` から） |
| **1** | モノレポ + Babylon 移行 | 未着手 |
| **2** | Sim Profile 分離 | 未着手 |
| **3** | ゲームモード API 第 1 版 + fps-ffa 最小 | 未着手 |
| **4–9** | ハブ / モード追加 / API 再設計 / チャンク / UGC / WT | 未着手 |

旧 P0/P1 タスク ID は `.archive/docs/task-list.md`。再利用しない。

## 規模

bun 単一パッケージ。`src/`（クライアント）・`shared/`・`server/`・`_tests_/`。モノレポ化はフェーズ 1。

## 関連

- 開発規約: [`../../../AGENTS.md`](../../../AGENTS.md)
- 仕様入口: [`../../../docs/arch/README.md`](../../../docs/arch/README.md)
- タスク正本: [`../../../docs/task-list.md`](../../../docs/task-list.md)

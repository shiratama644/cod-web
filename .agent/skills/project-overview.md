# Project Overview — CodWeb

> 製品の全体像。新規セッションの最初に読む 1 ファイル。

## 製品

**CodWeb** は、Web ブラウザ上で AAA 級オンライン FPS を、モバイルでも PC でもプレイできるようにするプロジェクト。

- 目標: 「Call of Duty を Web に移植して Web からでも CoD 相当の体験を」— ただし**商用 IP（CoD の名称・アセット・マップ・キャラクター）は一切使用せず、完全オリジナルで「CoD 相当の品質」**を目指す。
- 対応プラットフォーム: PC（マウス/キーボード、ゲームパッド）＋ モバイル（タッチ、仮想スティック、ジェスチャー）
- アーキテクチャ: 権威型サーバー（Authoritative Server）＋ クライアント予測 / サーバー調停 / エンティティ補間 / ラグ補正
- デプロイ: 権威ゲームサーバーは **Node 専用サーバー（VPS / ゲームサーバー）**。クライアントは静的ホスティング。

## 主な機能（目指すもの）

- コアマルチプレイヤー（6v6 級 TDM 等）を軸にした標準対戦
- 移動・射撃・リロード・スプレッド（権威サーバー + クライアント予測）
- スコアボード・キルフィード・リスポーン
- モバイル対応（仮想スティック + タッチ操作）

## 技術方針（確定事項）

| 項目 | 方針 | 理由 |
| :--- | :--- | :--- |
| 描画 | **WebGL2**（three.js）で安定優先。WebGPU（`three/webgpu` + TSL）は段階導入 | 全ブラウザ対応・モバイル実機で確実に動かすため |
| ネットワーク | 権威サーバーは **Node.js 24 + geckos.io（WebRTC）**。**ゲーム同期層 = geckos.io WebRTC**（tick / 入力検証 / Snapshot / interpolation・prediction を低遅延 UDP で）、**制御系 = Socket.IO**（認証・ロビー・ルーム・チャット・マッチイベントを確実に）。永続は HTTPS API | geckos.io は authoritative server 向け。WebRTC DataChannel over UDP で低遅延。公開 IP の専用サーバー直結なら TURN 不要 |
| 物理 | **Rapier（決定論的）**を権威物理に + `three-mesh-bvh` を射撃判定に | クライアント予測/サーバー調停の前提 |
| サーバー | **Node.js 24 専用サーバー（VPS）** | 永続稼働・ルーム状態保持が必要。Socket.IO（TCP）+ geckos.io WebRTC（UDP）。サーバーレスは不向き |
| アセット | **完全オリジナル**（本家超えの品質を志向） | CoD は商用 IP のため Web 配信不可 |

## リポジトリ構成（ドキュメントファースト）

| パス | 内容 |
| :--- | :--- |
| `docs/CONFIG.md` | 技術スタック完全ガイド（全ライブラリの参考リスト＝既定の正） |
| `docs/ARCH.md` | アーキテクチャ・ネットワーク設計・データフロー |
| `docs/TECH_SELECTION.md` | 技術選定の絞り込みと判断理由 |
| `docs/ROADMAP.md` | タスク管理の正本 |
| `AGENTS.md` | 開発規約 |
| `.agent/` | エージェント記憶システム（skills / hooks / logs） |

## 技術スタック（初期構成想定）

| 層 | 技術 |
| :--- | :--- |
| 描画 | three.js + @react-three/fiber + @react-three/drei（WebGL2） |
| 物理 | @dimforge/rapier3d（決定論的）+ three-mesh-bvh（射撃判定） |
| ネットワーク | geckos.io WebRTC（ゲーム同期層: 低遅延 UDP）+ Socket.IO（制御系: 認証・ロビー・ルーム・チャット・マッチイベント）。永続は HTTPS API |
| 共有シミュレーション | `packages/shared`（決定論的。bitecs 等） |
| 状態/UI | zustand + @radix-ui/* + framer-motion |
| 入力 | PointerLockControls / KeyboardControls（PC）+ nipplejs（モバイル） |
| オーディオ | howler.js + PositionalAudio + resonance-audio |
| ビルド | pnpm workspaces（client / server / shared）+ Vite + TypeScript strict |
| テスト | Vitest + msw + Playwright |

## 進捗（現在 = フェーズ 0 ドキュメント基盤）

> 進捗の正本は `docs/ROADMAP.md`。下表は要点のみ。

| Phase | 内容 | 状態 |
| :--- | :--- | :--- |
| 0 | ドキュメント基盤 & リポジトリ整備（CodWeb 化） | 進行中 |
| 1 | 技術検証（モノレポ / three.js FPS / 権威サーバー / クライアント予測） | 未着手 |
| 2 | ネットワーク基盤（geckos.io WebRTC のゲーム同期 + Socket.IO 制御系） | 未着手 |
| 3 | コアゲームプレイ（6v6 / 武器 / スコア / HUD） | 未着手 |
| 4 | 品質・最適化（モバイル / テスト / CI / セキュリティ） | 未着手 |

## 関連

- 作業規約・コミット手順・Lint 検証: `AGENTS.md`
- ドキュメント: `docs/`（DESIGN / TECH_SELECTION / ROADMAP / CONFIG）
- 詳細アーキテクチャ: [architecture-and-data-flow.md](./architecture-and-data-flow.md)

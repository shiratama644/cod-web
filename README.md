# CodWeb

Web ブラウザ上で AAA 級オンライン FPS を、モバイルでも PC でもプレイできるようにするプロジェクトです。
「Call of Duty を Web に移植して Web からでも CoD 相当の体験を」を目標としますが、**商用 IP（CoD の名称・アセット・マップ・キャラクター）は一切使用せず、完全オリジナルのゲーム・アセットで「CoD 相当の品質・体験」を実現**することを指します。

> ここは仕様・計画・設計書ファーストのリポジトリです。アプリのソースコードは段階的に追加されます。

## プロジェクト概要

- **種別**: ブラウザ向けオンライン FPS（権威型サーバー + クライアント予測）の開発リポジトリ
- **対応プラットフォーム**: PC（マウス/キーボード、ゲームパッド）＋ モバイル（タッチ、仮想スティック）
- **アーキテクチャ**: 権威型サーバー（Authoritative Server）＋ クライアント予測（Client Prediction）/ サーバー調停（Reconciliation）/ エンティティ補間（Entity Interpolation）/ ラグ補正（Lag Compensation）
- **描画**: WebGL2（Three.js）で安定優先。WebGPU（`three/webgpu` + TSL）は段階導入
- **ネットワーク**: 権威サーバーは **Node.js + Colyseus (v0.16+)**、**MVP は WebSocket（Colyseus 標準）を主経路**。`datagrams`（UDP 相当）で位置・視点・音声を、`streams`（QUIC ストリーム）で射撃・被弾・キルログ・チャットを転送する**機能別使い分けは WebTransport（P2-B）** で段階導入。永続データは HTTPS API。WebTransport 非対応環境でも WebSocket がそのまま主経路として機能
- **サーバー**: 自己管理の Node 専用サーバー（VPS）で永続稼働（MVP は WebSocket で成立、P2-B で QUIC/WebTransport 終端を追加）

## このリポジトリの構成（ドキュメントファースト）

| パス | 内容 |
| --- | --- |
| `docs/CONFIG.md` | **技術スタック完全ガイド（全ライブラリの参考リスト＝既定の正）** |
| `docs/ARCH.md` | アーキテクチャ・ネットワーク設計・データフロー・境界 |
| `docs/TECH_SELECTION.md` | 技術選定の絞り込みと判断理由（CONFIG.md の全リストから実装候補を抽出） |
| `docs/ROADMAP.md` | マイルストーン・タスク管理の正本 |
| `docs/ops/` | CI・デプロイ運用 |
| `AGENTS.md` | 開発規約（AI エージェント含む全コントリビューター向け） |
| `.agent/` | エージェント記憶システム（skills / hooks / logs） |

## 技術スタック（概要）

詳細な全リストは `docs/CONFIG.md`、絞り込みと判断理由は `docs/TECH_SELECTION.md` を参照。

| 層 | 採用候補（主要） |
| --- | --- |
| 描画 | three.js + @react-three/fiber + @react-three/drei（WebGL2） |
| 物理 / 当たり判定 | @dimforge/rapier3d（決定論的・権威物理）+ three-mesh-bvh（レイキャスト射撃判定） |
| ネットワーク | Colyseus（権威ルーム/状態同期）+ WebSocket（**MVP 主経路**）+ WebTransport（`datagrams`/`streams`、P2-B で導入）。永続は HTTPS API |
| ECS / 大量オブジェクト | bitecs（決定論的シミュレーション） / miniplex（R3F シーン） |
| キャラクター | ecctrl（物理駆動）＋ カスタム FPS コントローラー |
| 入力 | PointerLockControls / KeyboardControls（PC）、nipplejs（モバイル仮想スティック） |
| オーディオ | howler.js + PositionalAudio + resonance-audio（HRTF） |
| HUD / UI | zustand + @radix-ui/* + framer-motion |
| VFX | three.quarks / three.meshline / @react-three/postprocessing |
| アセット最適化 | KTX2/Basis・DRACOLoader・meshoptimizer・@gltf-transform/core |
| テスト | Vitest + Playwright + msw（共有シミュレーションは単体、クライアントは E2E） |
| ビルド / パッケージ | pnpm workspaces（`packages/client` / `packages/server` / `packages/shared`）+ Vite + TypeScript strict |

## ロードマップの概要

詳細は `docs/ROADMAP.md`。直近は「プロトタイプ FPS → サーバー基盤 → ネットコード → コアループ」の順に小さく検証しながら進めます。

## ライセンス

オリジナル実装・アセットを前提とします。商用 IP（Call of Duty 等）は使用しません。ライセンスは別途、開発方針を決めた段階で確定します。

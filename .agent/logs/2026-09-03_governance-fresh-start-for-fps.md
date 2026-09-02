# Governance refresh: DropMod 雛形 → cod-web（ブラウザFPS）用ガバナンスへ刷新

> Date: 2026-09-03(JST) / Commit: (commit 後に追記) / Branch: arena/01a062ac-cod-web

## 1. 指示内容 (Task Summary)

- ユーザー: 「このリポジトリを完全に理解し、AGENTS.md をこれからのシステムプロンプトとしてください」。
- 調査の結果、このリポジトリ (`shiratama644/cod-web`) は新規プロジェクト（**AAA級クロスプラットフォーム・オンラインFPS**、技術構成は `docs/CONFIG.md`）で、起点コミットには旧プロジェクト DropMod（Minecraft Mod マネージャ）の開発ガバナンス一式（AGENTS.md / .agent / docs）だけが置かれており、アプリソースは 1 行もない状態だった。
- ユーザー選択（ask_user）によりタスク確定:
  1. DropMod 由来コンテンツは**削除**（git 履歴で参照可能）
  2. AGENTS.md は**共通規約を維持し §6 と検証コマンドを新スタック（Vite+React+Three.js+Biome+Vitest）に書換え**
  3. **Phase 0 計画・task-list・skills を新規に播种**

## 2. 実行内容 (Executed Actions)

| # | 操作 | 対象 |
|---|---|---|
| 1 | 削除（`git rm`） | DropMod 専用 15 ファイル: 旧 README / docs/task-list.md / docs/ops/{CI_SETUP.md,CI_WORKFLOW.yml,DEPLOY.md} / .agent/skills 11 ファイル |
| 2 | 新規作成 | README.md（FPS 概要）、docs/task-list.md（正本・P0-A〜H + CI-1/DEPLOY-1）、docs/README.md（索引）、docs/planning/PHASE00_PLAN.md（_TEMPLATE 準拠） |
| 3 | 書換え | AGENTS.md（§6 を FPS/3D 固有に、検証コマンドを typecheck/biome/vitest/vite build に、.archive/vite 不変ルールを .archive 一般へ、旧ブランチ名を「毎回 git branch で確認」に） |
| 4 | 新規 skills | project-overview / tech-stack / game-engineering-principles（CONFIG 黄金ルール8 の実装パターン集）/ sandbox-constraints、skills/index.md 更新 |
| 5 | 更新 hooks | pre-task / verify-before-commit / hooks/index / sandbox-rebuild-recovery を新スタックに整合（.archive/vite 言及除去、Vite/vitest/biome コマンド）、_TEMPLATE.md の DoD から .archive/vite 除去 |
| 6 | 維持 | docs/CONFIG.md（技術スタック大本）、docs/planning/_TEMPLATE.md、.agent/hooks/{log-task,restore-sandbox-env}、AGENTS.md §1-5/§7/§8 の共通規約 |

整合性検証（docs-only のため 4 検証はスキップ、AGENTS.md §3.1）:
- 旧名称 grep（dropmod/modrinth/nextjs/.archive-vite/旧ブランチ/旧スキル名）: 残存 0
- 内部 markdown リンク: 全て実在確認（リンク切れ 0）

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- このリポジトリは「ガバナンスの骨組み（AGENTS.md の手順・Git 運用・コミュニケーション規約・.agent 記憶システム）はプロジェクト非依存で流用できるが、§6 プロジェクト固有事項・検証コマンド・skills のコードベース知識はプロジェクト固有」という構造だった。共通規約を残して固有部分だけ差し替える方針が妥当。
- AGENTS.md §4.4 には旧セッションのブランチ名がハードコードされていたが、同節のルール自体が「ブランチ名は毎回 `git branch --show-current` で確認・文書に残さない」と定めている。今回の書換えでも固定値は書かず、`<session-branch>` 表記に統一した。
- restore-sandbox-env.sh は `.nvmrc` と package.json の packageManager を読む汎用スクリプトなので修正不要（プロジェクト初期化後にそのまま機能する）。
- docs-only タスクでは 4 検証コマンドがまだ存在しない（package.json 未作成）ため、AGENTS.md §3.1 の「ドキュメントのみ変更時は整合性確認で代替」ルールを今回初めて適用した。

## 4. 次にすべきこと (Next Actions)

- **Phase 0（プロジェクト基盤構築）** が未着手。P0-A（Vite+React+TS 初期化）から順に、`docs/planning/PHASE00_PLAN.md` のサブタスク分割（P0-A〜H、各 = 1 commit を原則）で進める。
- P0 完了後に実コードの実態に合わせ、`.agent/skills/tech-stack.md` の「導入時の注意」に実バージョン・ハマりどころを追記する。
- ネットワーク基盤（Colyseus/geckos.io）・E2E（Playwright）は Phase 1 以降。E2E は Sandbox 不可のため CI 上でのみ実行。

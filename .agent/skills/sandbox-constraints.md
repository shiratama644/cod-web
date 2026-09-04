# Sandbox / Environment Constraints

> 「動かない / 重い / フォーマット効かない / CI 回らない」時に読む。AGENT.md §6.2/§6.3 の実体版を CodWeb 向けに置き換えたもの。

## 恒常的制約（修正対象ではない、迂回する）

開発環境固有の制約は環境ごとに異なる。**観測・検証してから**以下に記し、対応を定める。現在はソース未配置（ドキュメントファースト）のため、実装フェーズに入ったら随時追記する。

| 制約 | 現象 | 迂回策 |
| :--- | :--- | :--- |
| ネットワーク到達不可（特定ホスト） | `pnpm build` 等で `ECONNRESET` / `TypeError: fetch failed` | **exit code 0 なら成功扱い**。通信依存のローカル動作はフォールバック UI で確認、実環境で最終確認 |
| GPU 無し / ソフトウェアレンダリング | three.js の描画が重い・白フラッシュ等 | `backdrop-filter` / 重いポストプロセスを避ける。モバイルは `PerformanceMonitor` で動的品質 |
| 特定バイナリ導入不可 | Playwright ブラウザ等の install 不可 | E2E は**書けるが実行不可**。CI（GitHub Actions）上のみ。ローカルで install を試みない |
| 権限（CI / GitHub Actions 直下への書き込み不可） | ワークフローを commit できない | 正本を `docs/ops/` に置き、ユーザーに配置してもらう |

## 検証コマンド（commit 前, AGENT.md §3.1）

実装フェーズ確定後に各パッケージの検証手順をここに記す。標準:

```bash
pnpm typecheck                # tsc --noEmit
pnpm lint                     # linter
pnpm test:unit                # vitest run（※ test は watch, 使わない）
pnpm build                    # production build / bundle
```

- 通信エラー類は**無視してよい**（exit 0 が全て）。
- bundle サイズはビルドツールが出力しない場合は `find` 等で直接確認。

## 作業ブランチ（AGENT.md §4.4）

- セッション固定ブランチ（ブランチ名はセッションで変わる）。他ブランチに push しない。
- ※ ブランチ名は必ず `git branch --show-current` で確認すること（過去セッションのブランチ名は文書に残さない）。
- **push は事前許可済み**（AGENT.md §4.3.1）。検証が通ったら確認なしで `git push origin <セッション固定ブランチ>`。

## その他環境メモ

- 実装フェーズで判明した開発環境固有の注意（例: パッケージマネージャ・Node バージョン・ビルドツールの癖）をここに追記する。

## 関連

- [testing.md](./testing.md)（E2E / CI）/ [project-overview.md](./project-overview.md)

# Hook: Sandbox Rebuild Recovery

> **トリガー**: Sandbox 再構築 または HEAD のみの巻き戻りを検知した時。AGENT.md §4.1.1 の手順実体版。
> **検知ヒント**: `git log --oneline` が起点コミット 1 件のみ / `git status` が「大量の削除 + 大量の未追跡」/ `node_modules` が無い。

## まず診断: 「完全再構築」か「HEAD のみ巻き戻り」か（2026-10 追加）

ターン間で git の状態が崩れるパターンは **2 種類**あり、復旧コマンドが異なる。間違えると作業内容を失う。

| 症状 | 診断 | 復旧 |
| :--- | :--- | :--- |
| ワークツリーも古い（大量削除+未追跡、node_modules 無、ログ起点1件） | **完全再構築** | 下の「完全再構築の手順」（`reset --hard FETCH_HEAD`） |
| **ワークツリーは最新のままだが HEAD だけ古いコミット**（`git status` が「もっともらしい変更/削除」を見せる。例: HEAD がセッション起点 198de4e に戻り、push 済みの作業が diff に見える） | **HEAD のみ巻き戻り**（本セッションで4回以上発生） | `git fetch origin <branch>` → `git reset --soft origin/<branch>`（または FETCH_HEAD）→ `git reset -q` で index を揃える。**絶対に `--hard` しない**（最新のワークツリーを過去で潰してしまう） |

- 見分けの決め手: `git log -1 --oneline` が古いのに、`ls` すると直近の作業ファイルが存在する → HEAD のみ巻き戻り。
- 巻き戻り時に `git rm` 等が「local modifications」で失敗するのは典型症状。先に soft reset で HEAD を戻す。
- どちらの場合も復旧後に `bash .agent/hooks/restore-sandbox-env.sh` で bun を確認（PATH から消えることが多い。`export PATH=$PATH:/usr/local/bin`）。

## 背景

Arena の Sandbox は再構築されることがあり、その場合ワークツリーは
「起点コミットのファイル」＋「push 済みコミットで追加されたファイルの未追跡バージョン」が混在した状態で立ち上がる。
ファイルは破損していないので、以下で確実に復旧する。

## 完全再構築の手順

```bash
# 1. リモートの最新を fetch（※ ブランチ名は git branch --show-current で確認）
git fetch origin <session-branch>

# 2. FETCH_HEAD にワークツリーごとリセット
#    （この場合の --hard は §4.3 厳禁ルールの例外 = Sandbox 再構築後の初回のみ許可。
#     未コミット変更は元々存在しない状態のため安全）
git reset --hard FETCH_HEAD

# 3. 依存を再構築（下記スクリプト、または手動 2 行）
bash .agent/hooks/restore-sandbox-env.sh
```

## 復旧後の健全性確認

```bash
git log --oneline -5          # push 済みコミットが見えること
bun run test:unit                # テストが通ること（プロジェクト初期化前は未整備でも可、その場合は bun install 成功まで確認）
```
→ 問題なければ作業再開。

## 注意

- `git reset --hard` は**この例外場面以外では厳禁**（AGENTS.md §4.3）。誤用に注意。
- `.archive/` 等のアーカイブが「未追跡」になっている場合も、`git reset --hard FETCH_HEAD` で追跡状態に戻る（新規にファイルを触らないこと、AGENTS.md §4.5）。

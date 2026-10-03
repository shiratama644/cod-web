---
name: verify-doc-integrity
description: ドキュメントの整合性（リンク実在・目次更新・機密情報混入なし・packageManager）を機械検証する手順。docs変更後・コミット前に必須。Use when docs are changed or before committing.
---

# Verify Doc Integrity — ドキュメント整合性の機械検証

> TEMPLATE_REPO(PalmIDE由来)を cod-web 用に調整。docs-only コミットの代替検証（AGENTS.md §3.1）の実体。
> 包括的なドキュメント整理・外部URL検証は [`../docs-maintenance/SKILL.md`](../docs-maintenance/SKILL.md)。

## いつ使うか

- `docs/` / `.agent/` / `AGENTS.md` を1行でも編集した直後
- docs-only コミットの直前（4+3 検証の代替として）

## 手順（順序厳守）

### Step 1. 機密情報の混入チェック

```bash
git diff --cached --name-only | grep -E "^\.env"   # 期待: 出力なし
```

### Step 2. 内部リンク検証（fenced/inline code 除外）

```bash
python3 - <<'PY'
import re, os, glob
bad=[]
for f in glob.glob("docs/**/*.md", recursive=True)+glob.glob(".agent/**/*.md", recursive=True)+["AGENTS.md"]:
    if "/logs/" in f: continue
    s=open(f).read()
    s=re.sub(r"```.*?```","",s,flags=re.S); s=re.sub(r"`[^`]*`","",s)
    for m in re.finditer(r"\]\((\.[^)#]+?)(#[^)]*)?\)", s):
        t=os.path.normpath(os.path.join(os.path.dirname(f), m.group(1)))
        if not os.path.exists(t): bad.append((f,m.group(1)))
print("broken:", bad if bad else "none")
PY
# 期待: broken: none
```

### Step 3. 目次更新チェック

```bash
git status --porcelain | grep "docs/" | grep -E "^(\?\?|A |D |R )"
# あれば docs/README.md（arch配下なら docs/arch/README.md も）の更新を確認
```

### Step 4. 変更範囲の目視

```bash
git status --short && git diff --stat
# 狙いではないファイル・.agent/logs/ の過去ログが混ざっていないか
```

### Step 5. packageManager 整合性（pnpm）

```bash
node -p "JSON.parse(require('fs').readFileSync('package.json','utf8')).packageManager"
# 期待: pnpm@x.y.z 形式（素の typescript 追加で tsgo 7.x が混入していないかも lockfile で確認:
# grep -c '@typescript/typescript-linux' pnpm-lock.yaml → 0）
```

## 完了報告のフォーマット

```text
- (A) 機密情報: OK (0件)
- (B) リンク: OK (broken 0件)
- (C) 目次: OK / 要更新
- (D) 変更狙い: 意図した N ファイルのみ
- (E) packageManager: pnpm@10.34.6
```

どれか1つでも NG なら「完了」宣言はしない。先に直す。

## 自動化

`.agent/hooks/post_edit_verify.sh`（PostToolUse 登録済み）がこの検証の一部（A/B/E）を自動実行する。

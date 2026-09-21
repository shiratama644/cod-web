---
name: docs-maintenance
description: ドキュメント整理とURL検証のスキル。提案yml削除、内部リンク整合性、外部URL有効性、ミラー排除、AGENTS.md読込順序の遵守。
---

# Docs Maintenance — ドキュメント整理とURL検証スキル

> 仕様正本: `AGENTS.md`（読込順序・5点出力・docs-only代替）、`docs/README.md` 索引、`.agent/logs/2026-09-06_docs-final-check-retry-pr.md`  
> 計画: `docs/planning/complete/DOC-4～6`、`PLAT-3`以降のDOC-10

## 読込順序（AGENTS.md最優先）

1. `AGENTS.md` → 2. `.agent/` recursively → 3. `README.md` → 4. `docs/` recursively 全文、部分読み禁止
2. `docs/README.md` 索引に無いファイルは孤児・混入・残骸を疑う（例: 旧 `docs/ARCH.md`, `ROADMAP.md`, `TECH_SELECTION.md` はPR #1で混入、revertで除去）
3. 正本は `docs/arch/`（仕様） + `docs/task-list.md`（進捗） + `docs/planning/`（計画） + `docs/ops/`（運用）

## Proposal yml削除ルール（2026-09-22確立）

- `docs/ops/github-actions-proposal.yml` は削除済み、再作成禁止
- `.github/workflows/quality-gates.yml` が唯一の正本
- docsがproposalを参照している箇所は全て `.github/workflows/quality-gates.yml` へ書き換え

```bash
ls docs/ops/  # README.md + quality-gates.md のみであることを確認
grep -R "github-actions-proposal" docs/ --include="*.md"  # 0件
```

## 内部リンク整合性チェック

```python
# コードスパン除外してMarkdownリンク抽出
import re, pathlib
for md in pathlib.Path('docs').rglob('*.md'):
    text = md.read_text(errors='ignore')
    # fenced code 除外
    text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)
    # inline code 除外
    text = re.sub(r'`[^`]*`', '', text)
    for m in re.finditer(r'\[.*?\]\(([^)]+)\)', text):
        url = m.group(1)
        if url.startswith('http'): continue
        if url.startswith('#'): continue
        # 相対パス解決
        target = (md.parent / url.split('#')[0]).resolve()
        if not target.exists():
            print(f"BROKEN {md}: {url}")
```

- 1階層深くすると `../` / `../../` がずれる。`git mv` + 中身修正を同時に行うとリンク解決先を1つ深くする必要がある
- 自動リンクチェッカーで回すのが速い（DOC-4実績）

## 外部URL検証ルール

| カテゴリ | 正本URL | ミラー・旧URL | 対応 |
|---|---|---|---|
| Biome import制限 | https://biomejs.dev/linter/rules/no-restricted-imports/javascript/ | `.../no-restricted-imports/` base path redirect OK | 公式pathを使う |
| Biome private import | https://biomejs.dev/linter/rules/no-private-imports/javascript/ | 同上 | 公式path |
| Playwright WebSocket | https://playwright.dev/docs/api/class-websocket | dzone mirror | 公式に置換 |
| Playwright mock | https://playwright.dev/docs/mock#mock-websockets | w3cub mirror | 公式に置換 |
| Playwright CI | https://playwright.dev/docs/ci | - | 公式 |
| Playwright webServer | https://playwright.dev/docs/test-webserver | - | 公式 |
| Vitest coverage | https://vitest.dev/config/coverage | https://v2.vitest.dev/config/coverage 404 | v2は404、公式に置換 |
| Bun install | https://bun.com/docs/pm/cli/install | - | 公式 |
| setup-bun | https://github.com/oven-sh/setup-bun | - | 公式 |
| GitHub workflow syntax | https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax | - | 公式 |

### 検証方法

```bash
# fetch_pageで200確認、anchorまで含めて取得できるか確認
# 例: playwright mock#mock-websockets はanchor付きで取得可能
```

- Mirrors `aidoczh/w3cub` は機能するが非公式、primary usageからは排除、参考リンク程度に留める
- Truncated URL grep artifact `https://ago`, `https://bu` は bracket cutによる誤検出、better extractionで修正

## docs更新時の5点出力（AGENTS.md）

1. 変更ファイル一覧
2. 内部リンク検証結果
3. 外部URL検証結果
4. 旧名称・proposal参照残存チェック
5. 次のTODO

## 関連

- `docs/README.md` 索引
- `docs/ops/README.md` 正本宣言
- `docs/ops/quality-gates.md` 公式URL付き
- `.agent/logs/2026-09-06_doc-4-official-api-doc-audit.md`
- `.agent/logs/2026-09-06_docs-final-check-retry-pr.md`
- `.agent/logs/2026-09-05_revert-pr1-legacy-docs.md`

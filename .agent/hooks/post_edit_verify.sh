#!/bin/sh
# post_edit_verify.sh — 編集後の整合性を事後検証する PostToolUse フック
# TEMPLATE_REPO(PalmIDE由来)をcod-web用（pnpm・2026-10-03 bun→pnpm移行）に調整。
#
# 検証内容:
#   (A) 機密ファイル (.env) が追跡/ステージに含まれていないか
#   (B) docs/ 配下のファイル追加/削除時に docs/README.md の目次が更新されているか（警告のみ）
#   (C) package.json の packageManager が pnpm@x.y.z 形式か
#
# 終了コード: 0 = OK, 1 = NG（警告）

set -u
cd "$(dirname "$0")/../.." || exit 1

FAIL=0

echo "=== post_edit_verify ==="

# (A) 機密ファイルの混入チェック
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  echo "❌ (A) .env が Git 追跡対象です。gitignore を確認してください。" >&2
  FAIL=1
elif git diff --cached --name-only 2>/dev/null | grep -q "^\.env"; then
  echo "❌ (A) .env* がステージングされています。" >&2
  FAIL=1
else
  echo "✅ (A) 機密ファイル: OK"
fi

# (B) docs/ の変更時に README.md の目次更新を促す（警告レベル）
DOCS_CHANGED=$(git status --porcelain 2>/dev/null | grep -E "docs/" | head -n 20)
if [ -n "$DOCS_CHANGED" ]; then
  ADDED_OR_DELETED=$(git status --porcelain 2>/dev/null | grep -E "^(\?\?|A |D |R )" | grep "docs/" || true)
  if [ -n "$ADDED_OR_DELETED" ] && ! git diff --name-only 2>/dev/null | grep -q "docs/README.md"; then
    echo "⚠️ (B) docs/ に追加/削除がありますが docs/README.md が未更新です。目次の更新を検討してください。" >&2
  else
    echo "✅ (B) docs/ 変更: OK"
  fi
else
  echo "✅ (B) docs/ 変更: なし"
fi

# (C) package.json の packageManager チェック（pnpm）
if [ -f package.json ]; then
  PM=$(node -p "try{JSON.parse(require('fs').readFileSync('package.json','utf8')).packageManager||''}catch(e){''}" 2>/dev/null || echo "")
  case "$PM" in
    pnpm@*) echo "✅ (C) packageManager: $PM" ;;
    "")     echo "⚠️ (C) package.json に packageManager フィールドがありません（pnpm@x.y.z を推奨）。" >&2 ;;
    *)      echo "⚠️ (C) packageManager が pnpm ではありません: $PM（本リポジトリは pnpm 固定）" >&2 ;;
  esac
else
  echo "ℹ️ (C) package.json なし: スキップ"
fi

if [ "$FAIL" -eq 0 ]; then
  echo "=== 検証完了 ==="
  exit 0
fi

echo "=== 検証失敗（上の ❌ を確認）===" >&2
exit 1

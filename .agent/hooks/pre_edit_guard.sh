#!/bin/sh
# pre_edit_guard.sh — 編集禁止領域への変更をブロックする PreToolUse フック
# TEMPLATE_REPO(PalmIDE由来)をcod-web用に調整。
#
# ブロック対象:
#   .git/, node_modules/, dist/, .next/, coverage/, .turbo/
#   .archive/ （旧仕様アーカイブ。AGENTS.md §4.5 原則不変、必要ならユーザー確認）
#
# 注意: .agent/logs/ は「追加のみ」運用（AGENTS.md §8.5）。新規作成は許可するため
#       ここではブロックしない。既存ログの書き換え禁止は規約side（Rule 01）で担保する。
#
# 終了コード: 0 = 許可, 2 = ブロック

set -u

TARGET=""

# 1) 引数渡し（手動実行用）
if [ $# -ge 1 ]; then
  TARGET="$1"
else
  # 2) hooks（stdin JSON）から tool_input.file_path を抜く
  INPUT=$(cat 2>/dev/null || true)
  TARGET=$(printf '%s' "$INPUT" \
    | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
    | head -n1)
fi

case "$TARGET" in
  "") exit 0 ;;
esac

# 正規化: ./ プレフィックス・リポジトリ絶対パスの除去
case "$TARGET" in
  ./*) TARGET="${TARGET#./}" ;;
esac
case "$TARGET" in
  */cod-web/*) TARGET="${TARGET#*/cod-web/}" ;;
esac

is_protected() {
  case "$1" in
    .git/*|.git) return 0 ;;
    node_modules/*|node_modules|*/node_modules/*) return 0 ;;
    dist/*|dist|*/dist/*) return 0 ;;
    .next/*|.next|*/.next/*) return 0 ;;
    coverage/*|coverage) return 0 ;;
    .turbo/*|.turbo) return 0 ;;
    .archive/*) return 0 ;;
    *) return 1 ;;
  esac
}

if is_protected "$TARGET"; then
  {
    echo "⛔ [pre_edit_guard] 編集禁止領域です: $TARGET"
    echo "   .git/, node_modules/, dist/, .next/, coverage/ は生成物・内部領域のため直接編集禁止。"
    echo "   .archive/ は旧仕様アーカイブ（AGENTS.md §4.5）。必要な場合はユーザーに確認してください。"
  } >&2
  exit 2
fi

exit 0

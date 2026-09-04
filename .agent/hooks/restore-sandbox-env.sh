#!/usr/bin/env bash
# restore-sandbox-env.sh
# Sandbox 再構築後の環境復旧（AGENTS.md §4.1.1）。sandbox-rebuild-recovery.md から呼出。
#
# やること:
#   1. Node.js を .nvmrc のメジャー版 (最新 LTS) に置換
#      - nodejs.org は Sandbox から到達不可 (SSL 接続エラー) のため、
#        npm registry が配信する node-linux-x64 バイナリパッケージを使用
#   2. bun を npm 経由で導入 (bun.sh は SSL エラーで到達不可。registry.npmjs.org は到達可)
#      - バージョンは package.json の devDependencies.bun に固定した値を優先し、
#        無ければ latest を入れる
#   3. bun で依存を frozen-lockfile で検証付きインストール
set -euo pipefail

# ============================================================================
# 1. Node.js を .nvmrc のメジャー版に置換
# ============================================================================
# プラットフォーム標準の node は v22 固定。.nvmrc (例: "24") のメジャー版の
# 最新パッチを npm registry の node-linux-x64 パッケージから取得して置き換える。

if [ -f .nvmrc ]; then
  NODE_MAJOR="$(tr -d '[:space:]' < .nvmrc)"
else
  NODE_MAJOR="$(node --version | sed 's/^v//' | cut -d. -f1)"
  echo "[restore-sandbox-env] no .nvmrc; using current node major: ${NODE_MAJOR}"
fi
echo "[restore-sandbox-env] .nvmrc major: ${NODE_MAJOR}"

# 現在の node が既に要求メジャー版ならスキップ
CURRENT_MAJOR="$(node --version | sed 's/^v//' | cut -d. -f1)"
if [ "${CURRENT_MAJOR}" = "${NODE_MAJOR}" ]; then
  echo "[restore-sandbox-env] node is already v${NODE_MAJOR}: $(node --version)"
else
  echo "[restore-sandbox-env] resolving latest ${NODE_MAJOR}.x from npm registry (nodejs.org is unreachable) ..."
  NODE_FULL_VERSION="$(node -e "
fetch('https://registry.npmjs.org/node-linux-x64')
  .then((r) => r.json())
  .then((d) => {
    const versions = Object.keys(d.versions)
      .filter((v) => v.startsWith('${NODE_MAJOR}.'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (versions.length === 0) { console.error('no version found'); process.exit(1); }
    console.log(versions[versions.length - 1]);
  })
  .catch((e) => { console.error(e.message); process.exit(1); });
")"
  echo "[restore-sandbox-env] target: node v${NODE_FULL_VERSION}"

  echo "[restore-sandbox-env] downloading node-linux-x64@${NODE_FULL_VERSION} ..."
  curl -sL "https://registry.npmjs.org/node-linux-x64/-/node-linux-x64-${NODE_FULL_VERSION}.tgz" -o /tmp/node-target.tgz

  rm -rf /tmp/node-target && mkdir -p /tmp/node-target
  tar -xzf /tmp/node-target.tgz -C /tmp/node-target

  # /usr/local/bin/node は world-writable なので直接置換可能
  # (npm は JS ファイルのため、node バイナリの差し替えで全体が新 node で動く)
  cp /tmp/node-target/package/bin/node /usr/local/bin/node
  rm -rf /tmp/node-target /tmp/node-target.tgz
fi

echo "[restore-sandbox-env] node: $(node --version)"

# ============================================================================
# 2. bun を npm 経由で導入
# ============================================================================
# bun はサンドボックスにプリインストールされていない。bun.sh の install スクリプトは
# SSL エラーで到達不可だが、registry.npmjs.org は到達するので npm パッケージとして
# グローバル導入する（AGENTS.md §6.1）。
if command -v bun >/dev/null 2>&1; then
  echo "[restore-sandbox-env] bun already installed: $(bun --version)"
else
  if [ -f package.json ]; then
    BUN_SPEC="$(node -e "
      try {
        const p = JSON.parse(require('fs').readFileSync('package.json','utf8'));
        const v = (p.devDependencies && p.devDependencies.bun) || (p.dependencies && p.dependencies.bun);
        console.log(v ? 'bun@' + v.replace(/^[\^~]/, '') : 'bun@latest');
      } catch { console.log('bun@latest'); }
    ")"
  else
    BUN_SPEC="bun@latest"
  fi
  echo "[restore-sandbox-env] installing bun (${BUN_SPEC}) globally via npm ..."
  npm install -g "${BUN_SPEC}" >/dev/null 2>&1
  echo "[restore-sandbox-env] bun: $(bun --version)"
fi

# ============================================================================
# 3. 依存インストール
# ============================================================================
if [ -f package.json ]; then
  echo "[restore-sandbox-env] installing dependencies (frozen-lockfile) ..."
  bun install --frozen-lockfile
  echo "[restore-sandbox-env] done. verify with: bun run test:unit"
else
  echo "[restore-sandbox-env] no package.json yet (pre Phase 0). skipping dependency install."
fi

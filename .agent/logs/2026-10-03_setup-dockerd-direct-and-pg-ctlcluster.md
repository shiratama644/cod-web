# 2026-10-03 setup: dockerd 直接起動フォールバック + pg_ctlcluster 起動

## 依頼(ユーザー実環境ログより)

実環境(Ubuntu resolute / arm64 / systemd なし / nala あり)で:

- `/etc/init.d/docker: 62: ulimit: error setting limit (Operation not permitted)` →
  init スクリプトが ulimit 引き上げで失敗し daemon 起動不可(proot/制限コンテナの兆候)。
- `PostgreSQL (apt) — provisioning 失敗`(詳細部分はユーザーのログ省略により未取得)。

nala 検出・daemon 起動試行・ヒント表示は 28510d1 の実装どおり動作していることを確認。

## 修正(scripts/setup.ts)

- `startDockerDaemon()` に第 2 フォールバック追加:
  service / systemctl で起動できない場合、
  `nohup "$(command -v dockerd || echo /usr/sbin/dockerd)" >> /var/log/dockerd.log 2>&1 &`
  で dockerd の直接起動を試し、最大 10 秒待つ(init スクリプトの ulimit 失敗を回避)。
  失敗時は `sudo tail /var/log/dockerd.log` の確認を案内。
- `printDockerDaemonHints()` に ulimit EPERM の説明を追加:
  proot/LXC 等では daemon 起動不可 → `bun run setup --no-docker` + apt PostgreSQL を案内。
- apt PostgreSQL: `pg_lsclusters` の行をパースし、**クラスタが存在するが down の場合に
  `pg_ctlcluster <ver> <name> start` で直接起動**(service が効かない環境向け)。
  クラスタ無しの場合の pg_createcluster は従来どおり。

## 検証

- biome / typecheck PASS
- `bun run setup --no-apt` 正常
- `bun run check:all` 7/7 PASS
- 制約: docker・postgres の実パスはサンドボックスで再現不可。ユーザー実環境の
  再実行結果([DB] セクションの詳細行)を待って次の対処を判断する。

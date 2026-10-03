# 2026-10-03 setup: daemon 起動試行の追加 + apt PostgreSQL provisioning 強化

## 依頼(ユーザー報告のセットアップ結果より)

- `Docker (公式リポジトリ) — インストール済み(daemon 未稼働)` のまま apt フォールバックへ。
- `PostgreSQL (apt) — provisioning 失敗`(ALTER USER 失敗)。

## 原因

1. `service docker start` を fail-soft で握りつぶしており、失敗理由が表示されない。
   systemd 環境では `systemctl` を使うべきケースもカバーしていなかった。
2. **CLI 導入済み + daemon 停止の状態で再実行すると、daemon 起動を試みるロジック自体が無く**、
   即 apt フォールバックに落ちていた。
3. apt PostgreSQL は `service postgresql start` 直後に即 ALTER USER しており、
   起動待ちが無い。クラスタ未作成(インストール時の locale 問題等)も未考慮。
   失敗時に stderr の要点が出ないため原因が分からなかった。

## 修正(scripts/setup.ts)

- `startDockerDaemon()` 追加: systemd 検出(`/run/systemd/system`)で
  `systemctl enable --now docker` / 非 systemd で `service docker start` →
  `waitForDockerDaemon(15)`。
- main 2a を再構成: **CLI 既存 + daemon 停止でも起動を試みる**(再実行時のパス)。
  新規インストール後も同じヘルパーで起動確認。
- `printDockerDaemonHints()` 追加: 到達不可時に原因ヒントを表示
  (sudo -n 不可 / `service docker status` 先頭行 / WSL→systemd=true + wsl --shutdown /
  非 systemd→service・dockerd 手動 / proot→daemon 不可なので apt PostgreSQL 利用)。
- apt PostgreSQL 強化:
  - `pg_lsclusters` でクラスタ有無を確認し、無ければ最新バージョンで
    `pg_createcluster <ver> main --start`。
  - `pg_isready` で最大 15 秒起動待ち。
  - ALTER USER 失敗時に stderr 先頭行と状態確認コマンドを表示。
- `runQuiet` が stderr も返すよう拡張。

## 検証

- biome check / typecheck PASS
- `bun run setup --no-apt` 正常(SKIP 経路)
- `bun run check:all` 7/7 PASS
- 制約: サンドボックスに docker・postgres・systemd が無いため、
  daemon 起動成功パス・pg_createcluster 修復パスは実環境での検証待ち。

# 2026-10-03 setup: Docker 導入直後の誤判定修正 + nala 対応

## 依頼

1. Docker のインストールが完了しているのに「docker が使えないため PostgreSQL は apt で
   セットアップします」と表示され apt フォールバックに落ちるのはおかしい。
2. nala が存在すれば apt-get の代わりに nala を使うこと。

## 原因

- `usermod -aG docker $USER` は**再ログインまで反映されない**ため、インストール直後の
  同一シェルでは `docker info` が権限エラーになり、`dockerDaemonUp()` が false を返していた。
- さらに `service docker start` 直後は socket 準備中で失敗する場合がある(待機なし)。
- フォールバック文言が main と `setupAptPostgres()` の両方にあり二重表示されていた。

## 修正(scripts/setup.ts)

- `dockerDaemonUp(): boolean` → `dockerAccess(): { up, viaSudo }` に変更。
  直接の `docker info` が失敗しても、非 root + sudo 環境では `sudo -n docker info` で再評価し、
  成功すれば `viaSudo: true` として「可用」扱いにする(`-n` でパスワード待ちハング防止)。
- `waitForDockerDaemon(timeoutSec)` を追加し、導入直後は最大 15 秒 daemon 到達をリトライ。
- `viaSudo` のときは compose pull を `sudo -n docker compose pull postgres` で実行し、
  サマリ・末尾に「再ログイン(または `newgrp docker`)まで sudo が必要」の案内を表示。
- apt フロントエンド: `const aptBin = Bun.which('nala') ? 'nala' : 'apt-get'` を導入し、
  update / ca-certificates / docker-ce / postgresql の全 apt 呼び出しを `aptBin` に統一。
  環境診断に `apt: あり(nala 使用)` 表示を追加。
- `setupAptPostgres()` 冒頭の重複ログ(「docker が見つからないため…」)を削除し、
  フォールバック文言は main 側の 1 行のみに統一。

## 修正(scripts/execute.ts)

- `startDatabase()` に同じ sudo フォールバックを追加: 直接 `docker info` が失敗し
  `sudo -n docker info` が成功する場合は `sudo -n docker compose up -d --wait postgres` で起動。
  これによりセットアップ直後(グループ未反映)でも `bun run start` が DB ありで動く。

## 検証

- `bunx biome check --write` 2 files fixed(折返しは意味の区切りで分割済みを確認)
- `bun run typecheck` PASS
- `bun run setup --no-apt` 実行: 診断〜サマリまで正常(docker なし環境のため SKIP 経路)
- `bun run check:all` 7/7 PASS
- 制約: サンドボックスに docker が無いため、docker 導入成功 → sudo 経由判定 →
  compose pull の実パスは実環境での検証待ち。

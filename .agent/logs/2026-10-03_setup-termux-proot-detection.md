# 2026-10-03 setup/execute: Termux proot-distro 対応(Web 調査に基づく)

## 依頼

proot-distro の docker を Web 検索で調べ、それに合わせて修正する(docker が使えるかの確認含む)。

## 調査結論(2026-10-03 時点の一次・二次情報)

- **proot-distro では Docker daemon は動作しない**。proot は ptrace によるユーザー空間の
  システムコール変換のみで、daemon が必要とする cgroups / kernel namespaces / overlayfs を
  Android カーネルが非 root アプリに公開しないため(termuxtools.com の proot-distro 解説、
  sitepoint の Termux+Docker ガイド)。
- Termux 開発者(sylirre)も「root 化 + cgroups フルセット + overlayfs + veth が必要」と明言
  (r/termux)。rootless Podman も proot 下では不可(termux-packages #11489)。
- 動作する代替: **udocker**(daemon 不要・proot エンジン)/ **QEMU VM**(Alpine 等)/
  **リモート daemon**(DOCKER_HOST=ssh://)。
- 結論: この環境の正解構成は「apt PostgreSQL をホスト直で動かし、アプリがそれを使う」。

## 修正(scripts/setup.ts)

- `isAndroidProot()` 追加: TERMUX_VERSION env / `uname -r` に android /
  /data/data/com.termux の存在(proot-distro は Termux prefix をバインドする)で検出。
- main 2a: Termux/proot 検出時(daemon 未到達時のみ)は **daemon 起動を試みず**、
  理由(カーネル制約)と代替(udocker / QEMU / DOCKER_HOST)を表示して
  apt PostgreSQL へ直行。サマリは `SKIP — Termux/proot: daemon 動作不可`。
- ヘッダコメント更新。

## 修正(scripts/execute.ts)

- `tcpOpen(host, port)` 追加(Bun.connect、1 秒タイムアウト)。
- `startDatabase()` を再構成: **最初に 127.0.0.1:5432(POSTGRES_PORT)への TCP 接続を確認し、
  既にローカル PostgreSQL が動いていれば Docker を一切使わず db:push だけ実行**。
  これで proot の apt PostgreSQL / ホスト直インストール構成でも `bun run start` が DB ありで動く。
- スキーマ反映を `applySchema()` に共通化。

## 検証

- biome / typecheck PASS
- tcpOpen 実テスト: 開放ポート true / 閉鎖ポート false を確認
- TERMUX_VERSION + fake nala/sudo で setup 実走: Termux 検出 → SKIP → apt 経路を確認
- `bun run check:all` 7/7 PASS
- 制約: 実機(Termux proot-distro)での apt PostgreSQL provisioning はユーザー環境での
  確認待ち(失敗時は `詳細:` 行が出るようになっている)。

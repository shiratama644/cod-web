# 2026-10-03 setup.ts: Docker を公式 apt リポジトリ経由で導入するよう拡張

## 目的
`bun run setup` の Docker インストールを公式手順(公式 apt リポジトリの設定)で
行うようにする(ユーザー要望)。

## 実施内容
- scripts/setup.ts に `installDockerOfficialRepo()` を追加(公式手順準拠):
  1. 前提: ca-certificates / curl
  2. GPG 鍵: download.docker.com/linux/<distro>/gpg → /etc/apt/keyrings/docker.asc
     (apt は armored .asc を signed-by でそのまま扱えるため gpg --dearmor 不要)
  3. /etc/apt/sources.list.d/docker.list(arch + signed-by + VERSION_CODENAME + stable)
  4. apt-get update → docker-ce / docker-ce-cli / containerd.io /
     docker-buildx-plugin / docker-compose-plugin
  5. service docker start(非 systemd 向け best effort)+ 非 root は usermod -aG docker
- distro 判定: /etc/os-release の ID(派生は ID_LIKE で debian/ubuntu に寄せる)。
  debian/ubuntu 系以外・codename 不明は WARN スキップ
- `dockerDaemonUp()`(docker info)で **CLI 有無ではなく daemon 可用性**を判定し、
  2b の分岐を変更: daemon 可用 → compose 任せ / 不可(導入失敗・proot 等)→
  apt postgresql フォールバック(従来挙動)
- 新フラグ `--no-docker`: 導入試行自体をスキップ(proot 等で ~100MB の無駄 DL を回避)
- ステップ 5 の compose pull も dockerUsable 基準に変更。README 更新

## 検証(Sandbox 実測)
- `bun run setup`: debian bookworm 検出 → prereq OK → GPG 取得失敗(ネットワーク制限)
  → WARN → apt postgresql フォールバック → WARN → bun install 以降続行、exit 0
- `bun run setup --no-docker`: 導入試行スキップ → フォールバック直行を確認
- docker.list は GPG 取得成功前に書かれない(手順順序どおり)ことを確認
- typecheck / biome / cspell(buildx/keyrings 追加)/ check:all 7/7: PASS
- 公式リポジトリからの実インストール成功パスは**実環境検証待ち**

## 知見
- Docker 公式手順(2024 以降)は keyring を .asc のまま使う(dearmor 不要)。
- daemon 可用性は `docker info --format {{.ServerVersion}}` が最も安価で確実。

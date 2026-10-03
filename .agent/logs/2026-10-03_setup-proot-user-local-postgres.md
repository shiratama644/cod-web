# 2026-10-03 setup/execute: proot 向けユーザーローカル PostgreSQL クラスタ

## 真因(ユーザー実環境ログで確定)

```
FATAL:  data directory "/var/lib/postgresql/18/main" has wrong ownership
HINT:   The server must be started by the user that owns the data directory.
```

proot はファイル所有権を**ログイン時の偽装 UID に固定して見せる**ため、
`sudo -u postgres` に切り替えても stat 上の所有者が一致せず、
initdb / サーバの所有権チェックが必ず失敗する。
→ **proot では postgres OS ユーザー方式(pg_createcluster)は原理的に不可能**。

## 対処方針

現在のユーザー自身で initdb する専用クラスタ `~/.cod-web/pgdata` を作成し
pg_ctl で起動する(所有者=実行者なのでチェックが通る)。

## 修正(scripts/setup.ts)

- `setupProotPostgres()` 追加:
  1. `nala/apt install postgresql postgresql-client`(冪等)
  2. `/usr/lib/postgresql/<最新ver>/bin/initdb -D ~/.cod-web/pgdata -U postgres
     --auth=trust -E UTF8 --locale=C.UTF-8`(PG_VERSION 存在時はスキップ)
  3. `pg_ctl -D ... -l ...}/log -o '-k /tmp' start`(status 確認で冪等。socket は /tmp)
  4. `pg_isready -h 127.0.0.1` で最大 15 秒待ち
  5. `ALTER USER postgres PASSWORD 'postgres'`(.env URL 互換) + `createdb app_db`
  6. `.env 生成 + db:push`(apt 経路と共通化: `finalizeDbEnvAndSchema()`)
- main 2b: `docker.up → compose / androidProot → setupProotPostgres / その他 → setupAptPostgres`。
- initdb 失敗時は「root ログインなら一般ユーザーを作って実行」ヒント
  (proot fake-root では PostgreSQL が uid 0 を拒否するため)。

## 修正(scripts/execute.ts)

- `tryStartUserLocalPostgres(port)` 追加: `~/.cod-web/pgdata/PG_VERSION` があれば
  pg_ctl で起動 → TCP 到達を最大 10 秒待つ。
- `startDatabase()` の順序: ①既存ローカル PG(TCP) → ②ユーザーローカルクラスタ起動 →
  ③docker compose。proot では再起動後も `bun run start` だけで DB ありになる。

## 検証

- biome / typecheck PASS
- TERMUX_VERSION + fake nala で setup 実走: proot 分岐 → setupProotPostgres 到達、
  バイナリ無し時の graceful WARN を確認
- `bun run check:all` 7/7 PASS
- 制約: initdb/pg_ctl の成功パスはサンドボックスに postgres バイナリが無く
  apt ミラー不達のため実行不可。ユーザー実機(Termux proot)での確認待ち。

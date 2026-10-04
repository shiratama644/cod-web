import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

// 組み込み SQLite(ファイル DB)。サーバ不要・設定不要で動く。
// 保存先は SQLITE_PATH で上書き可(既定: apps/web/.data/cod.sqlite)
const sqlitePath = process.env.SQLITE_PATH ?? resolve(process.cwd(), '.data/cod.sqlite')

/** SQLite は常に利用可能(旧 Postgres 構成との互換のため残しているフラグ)。 */
export const hasDb = true

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsSqlite?: {
    client: ReturnType<typeof createClient>
    db: ReturnType<typeof drizzle>
    ready: Promise<void> | null
  }
}

function getConn() {
  if (!globalForDb.__arenaNextJsSqlite) {
    mkdirSync(dirname(sqlitePath), { recursive: true })
    const client = createClient({ url: `file:${sqlitePath}` })
    globalForDb.__arenaNextJsSqlite = { client, db: drizzle(client), ready: null }
  }
  return globalForDb.__arenaNextJsSqlite
}

/** drizzle クライアント(SQLite)。 */
export function getDb() {
  return getConn().db
}

/**
 * スキーマの存在を保証する(初回アクセス時に CREATE TABLE IF NOT EXISTS)。
 * drizzle-kit push(db:push)と同じ定義。ルートは最初にこれを await する。
 */
export function dbReady(): Promise<void> {
  const conn = getConn()
  if (!conn.ready) {
    conn.ready = conn.client
      .execute(
        `CREATE TABLE IF NOT EXISTS loadouts (
          id integer PRIMARY KEY,
          data text NOT NULL,
          updated_at integer NOT NULL
        )`,
      )
      .then(() => undefined)
  }
  return conn.ready
}

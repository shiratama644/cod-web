import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const databaseUrl = process.env.DATABASE_URL

/** True when a PostgreSQL connection is configured. */
export const hasDb = Boolean(databaseUrl)

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool
}

let _db: ReturnType<typeof drizzle> | null = null

/**
 * Lazily create the drizzle client. Throws if DATABASE_URL is not set —
 * callers must check `hasDb` first (routes fall back to in-memory storage).
 */
export function getDb() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }
  if (_db) return _db
  const pool =
    globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
    })
  if (process.env.NODE_ENV !== 'production') {
    globalForDb.__arenaNextJsPostgresqlPool = pool
  }
  _db = drizzle(pool)
  return _db
}

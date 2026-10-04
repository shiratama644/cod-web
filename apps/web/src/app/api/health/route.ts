import { sql } from 'drizzle-orm'
import { dbReady, getDb } from '@/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await dbReady()
    await getDb().run(sql`select 1`)
    return Response.json({ ok: true, db: true, storage: 'sqlite' })
  } catch {
    return Response.json({ ok: false }, { status: 500 })
  }
}

import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { dbReady, getDb } from '@/db'
import { loadouts } from '@/db/schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await dbReady()
    const rows = await getDb().select().from(loadouts).where(eq(loadouts.id, 1))
    return NextResponse.json({ data: rows[0]?.data ?? null })
  } catch {
    return NextResponse.json({ data: null })
  }
}

export async function PUT(req: Request) {
  // JSON として解釈できないボディはクライアント起因 → 400(500 にしない)
  let body: { data: unknown }
  try {
    body = (await req.json()) as { data: unknown }
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  try {
    if (!body || typeof body !== 'object' || !('data' in body)) {
      return NextResponse.json({ error: 'invalid' }, { status: 400 })
    }
    await dbReady()
    await getDb()
      .insert(loadouts)
      .values({ id: 1, data: body.data })
      .onConflictDoUpdate({ target: loadouts.id, set: { data: body.data, updatedAt: new Date() } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

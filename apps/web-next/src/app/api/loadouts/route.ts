import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, hasDb } from "@/db";
import { loadouts } from "@/db/schema";

export const dynamic = "force-dynamic";

// In-memory fallback used when no DATABASE_URL is configured (e.g. sandbox
// preview). Loadouts survive for the lifetime of the dev-server process.
const globalForMem = globalThis as typeof globalThis & {
  __loadoutsMemStore?: { data: unknown } | null;
};

export async function GET() {
  if (!hasDb) {
    return NextResponse.json({ data: globalForMem.__loadoutsMemStore?.data ?? null });
  }
  try {
    const rows = await getDb().select().from(loadouts).where(eq(loadouts.id, 1));
    return NextResponse.json({ data: rows[0]?.data ?? null });
  } catch {
    return NextResponse.json({ data: null });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as { data: unknown };
    if (!body || typeof body !== "object" || !("data" in body)) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    if (!hasDb) {
      globalForMem.__loadoutsMemStore = { data: body.data };
      return NextResponse.json({ ok: true, storage: "memory" });
    }
    await getDb()
      .insert(loadouts)
      .values({ id: 1, data: body.data })
      .onConflictDoUpdate({ target: loadouts.id, set: { data: body.data, updatedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

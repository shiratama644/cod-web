import { sql } from "drizzle-orm";
import { getDb, hasDb } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDb) {
    // No database configured — app runs with in-memory loadout storage.
    return Response.json({ ok: true, db: false });
  }
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ ok: true, db: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}

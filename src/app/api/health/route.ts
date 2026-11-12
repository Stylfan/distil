import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

/** For the container's health check: up, and the database answers. Says nothing else. */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}

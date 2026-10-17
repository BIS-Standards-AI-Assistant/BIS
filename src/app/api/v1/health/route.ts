import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (err) {
    // Public endpoint: the raw driver error can name hosts, users or config
    // (e.g. a connection string problem), so it is logged, not returned.
    console.error("[api/v1/health]", err);
    return NextResponse.json({ status: "error", database: "unreachable" }, { status: 503 });
  }
}

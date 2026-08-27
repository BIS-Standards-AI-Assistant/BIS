import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (err) {
    return NextResponse.json(
      { status: "error", database: "unreachable", message: String(err) },
      { status: 503 },
    );
  }
}

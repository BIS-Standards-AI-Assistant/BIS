import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { documents } from "@/db/schema";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, id),
    with: { chunks: { orderBy: (c, { asc }) => [asc(c.createdAt)] } },
  });

  if (!doc) {
    return NextResponse.json({ error: "Standard not found" }, { status: 404 });
  }

  return NextResponse.json(doc);
}

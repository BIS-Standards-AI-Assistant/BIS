import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { documents } from "@/db/schema";

/**
 * `documents.id` is a uuid column, so a malformed id makes Postgres raise
 * `invalid input syntax for type uuid` rather than returning no rows. That
 * exception used to escape this handler, so `/api/v1/standards/anything`
 * answered 500 with an empty body instead of 404 — a caller could not tell
 * "no such standard" from "the service is broken", and the raw failure was
 * neither logged nor explained.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // An id that cannot be a uuid cannot identify a document, so this is a
  // 404 — the resource genuinely does not exist — not a 400 about syntax.
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Standard not found" }, { status: 404 });
  }

  try {
    const doc = await getDb().query.documents.findFirst({
      where: eq(documents.id, id),
      with: { chunks: { orderBy: (c, { asc }) => [asc(c.createdAt)] } },
    });

    if (!doc) {
      return NextResponse.json({ error: "Standard not found" }, { status: 404 });
    }
    return NextResponse.json(doc);
  } catch (err) {
    // Logged for diagnosis, but never returned: a database error message
    // can carry schema detail that has no business reaching a client.
    console.error("[api/v1/standards/[id]]", err);
    return NextResponse.json({ error: "Could not load this standard" }, { status: 500 });
  }
}

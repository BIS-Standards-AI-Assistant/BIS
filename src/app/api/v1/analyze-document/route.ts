import { NextRequest, NextResponse } from "next/server";
// pdf-parse's own index.js runs a debug/demo block at import time when
// `module.parent` isn't set the way it expects (true under Turbopack/
// webpack bundling, unlike plain Node/tsx) — importing the internal lib
// directly skips that buggy wrapper entirely. See scripts/pdf-parse.d.ts
// for the corresponding type declaration.
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { analyzeDocumentText } from "@/lib/document-analyzer";
import { rateLimitOrNull } from "@/lib/rate-limit-http";

/**
 * Document Analyzer upload endpoint (pfinal.md §8.1-8.2, §8.5). Every
 * validation step below rejects rather than guesses — an unsupported
 * format, oversized file, or unparseable PDF returns a clear error, never
 * a best-effort partial result presented as success. The uploaded file's
 * content is DATA throughout: it is parsed to plain text and handed to
 * analyzeDocumentText (deterministic identifier matching only) — it is
 * never passed to an LLM, so there is no prompt-injection surface here to
 * defend against beyond "don't do that" (§8.5's remaining items —
 * oversized files, malformed PDFs, unsupported formats — are handled by
 * the checks below).
 */

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB — user uploads get a tighter cap than the 25MB batch-ingestion ceiling
const ALLOWED_TYPES = new Set(["application/pdf", "text/plain"]);

// Lighter budget than /query — this does real file parsing work.
const RATE_LIMIT = { limit: 10, windowMs: 60_000 };

export async function POST(req: NextRequest) {
  const limited = rateLimitOrNull(req, "analyze-document", RATE_LIMIT);
  if (limited) return limited;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data with a 'file' field" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: `File exceeds the ${MAX_FILE_BYTES} byte limit`, sizeBytes: file.size }, { status: 413 });
  }

  const declaredType = file.type || "";
  const looksAllowedByExtension = /\.(pdf|txt)$/i.test(file.name || "");
  if (declaredType && !ALLOWED_TYPES.has(declaredType) && !looksAllowedByExtension) {
    return NextResponse.json({ error: "Unsupported file type — only PDF and plain text are accepted", declaredType }, { status: 415 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const isPdfMagic = buf.subarray(0, 5).toString("ascii") === "%PDF-";

  let text: string;
  try {
    if (isPdfMagic) {
      const parsed = await pdfParse(buf);
      text = parsed.text;
    } else if (declaredType === "application/pdf") {
      // Declared PDF but doesn't have the PDF magic bytes — a malformed
      // or mislabeled file. Reject rather than attempt a parse that will
      // fail unpredictably.
      return NextResponse.json({ error: "File declared as PDF but is not a valid PDF (missing %PDF- header)" }, { status: 422 });
    } else {
      text = buf.toString("utf-8");
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to parse document", message: err instanceof Error ? err.message : String(err) },
      { status: 422 },
    );
  }

  try {
    const result = await analyzeDocumentText(text);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/v1/analyze-document]", err);
    return NextResponse.json(
      { error: "Document analysis failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

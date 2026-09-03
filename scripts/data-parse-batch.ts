/**
 * Controlled-batch download + parse (docs/DATA_ACQUISITION_PLAN.md §4
 * step 4). Takes a small, hand-picked list of Product Manual PDF URLs —
 * ones already confirmed (scripts/tmp-find-new2.ts, live DB query) to
 * correspond to a standard already in the `standards` table that
 * currently has ZERO documents, i.e. real first-time evidence, not a
 * duplicate or a revision-conflict case. Downloads each PDF once,
 * checksums it, parses text with pdf-parse, and writes a per-file
 * quality report. Does NOT write to data/seed/manifest.json or touch
 * the database — that is a separate, explicit step after a human/this
 * session inspects extracted text quality.
 *
 * Usage: npx tsx scripts/data-parse-batch.ts
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import pdfParse from "pdf-parse";
import { politeFetch } from "./data-lib/rate-limit";

interface Candidate {
  url: string;
  isNumber: string;
  canonicalNumber: string;
}

const OUT_RAW_DIR = path.join(__dirname, "..", "data", "seed", "raw");
const REPORT_PATH = path.join(__dirname, "..", "data", "reports", "batch-parse-report.json");
const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25MB ceiling — reject anything absurd rather than silently accept

function safeFileStem(canonicalNumber: string): string {
  return canonicalNumber.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  const listPath = process.argv[2] ?? path.join(
    "C:/Users/chauh/AppData/Local/Temp/claude/C--Users-chauh-OneDrive-Desktop-BIS/fae8df79-4e08-4313-98a3-06262121e6d5/scratchpad",
    "pm-gap-fill.json",
  );
  const candidates: Candidate[] = JSON.parse(readFileSync(listPath, "utf-8"));
  if (!existsSync(OUT_RAW_DIR)) mkdirSync(OUT_RAW_DIR, { recursive: true });

  const report: Array<Record<string, unknown>> = [];

  for (const c of candidates) {
    const stem = safeFileStem(c.canonicalNumber);
    const entry: Record<string, unknown> = { standardNumber: c.canonicalNumber, sourceUrl: c.url };

    // Reject malformed URLs (e.g. a concatenated double-URL from
    // extraction) rather than silently truncating and guessing.
    let parsed: URL;
    try {
      parsed = new URL(c.url);
    } catch {
      entry.status = "REJECTED";
      entry.reason = "malformed URL";
      report.push(entry);
      console.log(`[REJECTED] ${c.canonicalNumber} — malformed URL: ${c.url}`);
      continue;
    }
    if ((c.url.match(/https:\/\//g) ?? []).length > 1) {
      entry.status = "REJECTED";
      entry.reason = "URL contains multiple https:// — likely a concatenation artifact from link extraction";
      report.push(entry);
      console.log(`[REJECTED] ${c.canonicalNumber} — concatenated URL artifact`);
      continue;
    }

    try {
      const res = await politeFetch(parsed.toString());
      if (!res.ok) {
        entry.status = "FETCH_FAILED";
        entry.reason = `HTTP ${res.status}`;
        report.push(entry);
        console.log(`[FETCH_FAILED] ${c.canonicalNumber} — HTTP ${res.status}`);
        continue;
      }
      const contentType = res.headers.get("content-type") ?? "";
      const buf = Buffer.from(await res.arrayBuffer());

      if (buf.byteLength > MAX_PDF_BYTES) {
        entry.status = "REJECTED";
        entry.reason = `exceeds ${MAX_PDF_BYTES} byte size limit (${buf.byteLength} bytes)`;
        report.push(entry);
        console.log(`[REJECTED] ${c.canonicalNumber} — too large`);
        continue;
      }
      const isPdfMagic = buf.subarray(0, 5).toString("ascii") === "%PDF-";
      if (!isPdfMagic) {
        entry.status = "REJECTED";
        entry.reason = `not a PDF (content-type: ${contentType}, magic bytes: ${buf.subarray(0, 5).toString("hex")})`;
        report.push(entry);
        console.log(`[REJECTED] ${c.canonicalNumber} — not a real PDF`);
        continue;
      }

      const checksum = createHash("sha256").update(buf).digest("hex");
      entry.checksum = checksum;
      entry.pdfBytes = buf.byteLength;

      let parsedPdf;
      try {
        parsedPdf = await pdfParse(buf);
      } catch (err) {
        entry.status = "PARSE_FAILED";
        entry.reason = err instanceof Error ? err.message : String(err);
        report.push(entry);
        console.log(`[PARSE_FAILED] ${c.canonicalNumber} — ${entry.reason}`);
        continue;
      }

      const text = parsedPdf.text.replace(/\r\n/g, "\n").trim();
      entry.numPages = parsedPdf.numpages;
      entry.extractedChars = text.length;
      // Crude but real quality signal: extremely short text relative to
      // page count usually means a scanned/image-only PDF that pdf-parse
      // could not OCR — flag rather than ingest garbage.
      const charsPerPage = parsedPdf.numpages > 0 ? text.length / parsedPdf.numpages : 0;
      entry.charsPerPage = Math.round(charsPerPage);

      if (text.length < 200 || charsPerPage < 50) {
        entry.status = "NEEDS_REVIEW";
        entry.reason = "extracted text too short — likely scanned/image PDF, not real text";
        report.push(entry);
        console.log(`[NEEDS_REVIEW] ${c.canonicalNumber} — only ${text.length} chars over ${parsedPdf.numpages} pages`);
        continue;
      }

      const rawFile = `${stem}.txt`;
      writeFileSync(path.join(OUT_RAW_DIR, rawFile), text, "utf-8");
      entry.status = "PARSED";
      entry.rawFile = rawFile;
      entry.title = parsedPdf.info?.Title ?? null;
      report.push(entry);
      console.log(`[PARSED] ${c.canonicalNumber} — ${text.length} chars, ${parsedPdf.numpages} pages -> ${rawFile}`);
    } catch (err) {
      entry.status = "ERROR";
      entry.reason = err instanceof Error ? err.message : String(err);
      report.push(entry);
      console.log(`[ERROR] ${c.canonicalNumber} — ${entry.reason}`);
    }
  }

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  const counts = report.reduce<Record<string, number>>((acc, r) => {
    const s = r.status as string;
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  console.log("\n--- Batch summary ---");
  console.log(counts);
  console.log(`Full report: ${REPORT_PATH}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

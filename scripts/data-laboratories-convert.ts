/**
 * Converts the source BIS recognised-laboratories CSV
 * (data/bis-standards-dataset/raw/bis-group1-recognised-laboratories.csv,
 * the official "Group 1" recognised-laboratory list) into a typed JSON
 * dataset consumed by src/lib/laboratories.ts.
 *
 * This is a plain field transcription — name/city split on the last comma,
 * state spelling normalized against a fixed typo/abbreviation table, and
 * current suspension status derived from the Remarks column (its status
 * events read newest-first; the first "revoked"/"suspended"/"deferred"
 * token in the string is therefore the current status). Nothing is
 * inferred beyond what the source row states — no coordinates, no
 * per-standard testing scope, no certification linkage — because the
 * source file contains none of that. See docs/ui/UI_DATA_AND_TRUTH_RULES.md.
 *
 * Usage: npx tsx scripts/data-laboratories-convert.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const RAW_PATH = path.join(__dirname, "../data/bis-standards-dataset/raw/bis-group1-recognised-laboratories.csv");
const OUT_PATH = path.join(__dirname, "../data/bis-standards-dataset/recognised-laboratories.json");

interface LabRecord {
  id: string;
  slNo: number;
  name: string;
  city: string | null;
  state: string;
  stateRaw: string;
  type: "Private" | "Government";
  oslCode: string;
  recognitionValidUpto: string | null; // ISO yyyy-mm-dd, or null if unparseable
  recognitionValidUptoRaw: string;
  currentStatus: "Active" | "Suspended" | "Deferred" | "Unknown";
  remarks: string | null;
}

// Minimal RFC 4180 parser — the source has quoted fields with embedded commas.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || r[0]?.trim());
}

const STATE_CANONICAL: Record<string, string> = {
  "u.p.": "Uttar Pradesh",
  "u.p": "Uttar Pradesh",
  up: "Uttar Pradesh",
  "uttar pradesh": "Uttar Pradesh",
  "m.p.": "Madhya Pradesh",
  "m.p": "Madhya Pradesh",
  mp: "Madhya Pradesh",
  "madhya pradesh": "Madhya Pradesh",
  "a.p.": "Andhra Pradesh",
  "a.p": "Andhra Pradesh",
  ap: "Andhra Pradesh",
  "andhra pradesh": "Andhra Pradesh",
  "w.b.": "West Bengal",
  "w.b": "West Bengal",
  "west bengal": "West Bengal",
  "h.p.": "Himachal Pradesh",
  "h.p": "Himachal Pradesh",
  "himachal pradesh": "Himachal Pradesh",
  tamilnadu: "Tamil Nadu",
  "tamil nadu": "Tamil Nadu",
  maharshtra: "Maharashtra",
  maharashtra: "Maharashtra",
  karnatka: "Karnataka",
  karnataka: "Karnataka",
  pubjab: "Punjab",
  punjab: "Punjab",
  harayana: "Haryana",
  haryana: "Haryana",
  uttrakhand: "Uttarakhand",
  uttarakhand: "Uttarakhand",
  orissa: "Odisha",
  odisha: "Odisha",
  delhi: "Delhi",
  gujarat: "Gujarat",
  kerala: "Kerala",
  rajasthan: "Rajasthan",
  telangana: "Telangana",
  bihar: "Bihar",
  assam: "Assam",
  tripura: "Tripura",
  jharkhand: "Jharkhand",
  chhattisgarh: "Chhattisgarh",
  daman: "Daman & Diu",
  "jammu & kashmir": "Jammu & Kashmir",
};

function normalizeState(raw: string): string {
  const key = raw.trim().toLowerCase();
  return STATE_CANONICAL[key] ?? raw.trim();
}

function normalizeType(raw: string): "Private" | "Government" {
  return /govt/i.test(raw) ? "Government" : "Private";
}

// "14.02.2027" / "31-12-2026" / "23-02-2029" -> "2027-02-14". Returns null
// if the string doesn't parse as a clean dd[.-]mm[.-]yyyy date.
function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  const m = trimmed.match(/^(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = dd.padStart(2, "0");
  const month = mm.padStart(2, "0");
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return null;
  return `${yyyy}-${month}-${day}`;
}

// Remarks read newest-event-first (verified against the source: every
// multi-event row lists a later date before an earlier one). The first
// status-change token therefore tells us the lab's current status.
function deriveStatus(remarks: string): LabRecord["currentStatus"] {
  const trimmed = remarks.trim();
  if (!trimmed || trimmed === ".") return "Active";

  const tokenPattern = /(suspension\s+revoked|revoked|deferred|suspended)/i;
  const match = trimmed.match(tokenPattern);
  if (!match) return "Active";

  const token = match[1].toLowerCase();
  if (token.includes("revoked")) return "Active";
  if (token === "deferred") return "Deferred";
  if (token === "suspended") return "Suspended";
  return "Unknown";
}

function splitNameCity(rawName: string): { name: string; city: string | null } {
  const trimmed = rawName.trim();
  const lastComma = trimmed.lastIndexOf(",");
  if (lastComma === -1) return { name: trimmed, city: null };
  return {
    name: trimmed.slice(0, lastComma).trim(),
    city: trimmed.slice(lastComma + 1).trim() || null,
  };
}

function main() {
  const csv = readFileSync(RAW_PATH, "utf-8");
  const rows = parseCsv(csv);
  const [header, ...dataRows] = rows;

  const idx = {
    slNo: header.indexOf("Sl.No"),
    name: header.indexOf("Name of Lab"),
    state: header.indexOf("State"),
    status: header.indexOf("Status"),
    oslCode: header.indexOf("OSL Code"),
    validUpto: header.indexOf("Recognition Valid Up To"),
    remarks: header.indexOf("Remarks"),
  };

  const records: LabRecord[] = dataRows
    .filter((r) => r[idx.slNo]?.trim())
    .map((r) => {
      const { name, city } = splitNameCity(r[idx.name] ?? "");
      const stateRaw = r[idx.state] ?? "";
      const remarksRaw = (r[idx.remarks] ?? "").trim();
      const validUptoRaw = (r[idx.validUpto] ?? "").trim();
      const oslCode = (r[idx.oslCode] ?? "").trim();

      return {
        id: oslCode || `lab-${r[idx.slNo]}`,
        slNo: Number(r[idx.slNo]),
        name,
        city,
        state: normalizeState(stateRaw),
        stateRaw,
        type: normalizeType(r[idx.status] ?? ""),
        oslCode,
        recognitionValidUpto: parseDate(validUptoRaw),
        recognitionValidUptoRaw: validUptoRaw,
        currentStatus: deriveStatus(remarksRaw),
        remarks: remarksRaw && remarksRaw !== "." ? remarksRaw : null,
      };
    });

  writeFileSync(OUT_PATH, JSON.stringify(records, null, 2) + "\n", "utf-8");

  const byStatus = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.currentStatus] = (acc[r.currentStatus] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Wrote ${records.length} laboratory records to ${OUT_PATH}`);
  console.log("By current status:", byStatus);
  console.log(`Distinct states: ${new Set(records.map((r) => r.state)).size}`);
}

main();

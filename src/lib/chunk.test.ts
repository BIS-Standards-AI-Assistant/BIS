import { describe, test, expect } from "vitest";
import { chunkDocument } from "./chunk";

// A sentence long enough that a few of them clear MIN_CHUNK_CHARS (200)
// without needing to know the exact constant in every test.
const SENTENCE = "The appliance shall be tested at rated voltage under normal operating conditions.";
const paragraph = (n: number) => Array.from({ length: n }, () => SENTENCE).join(" ");

describe("chunkDocument", () => {
  test("empty and whitespace-only input produce no chunks", () => {
    expect(chunkDocument("")).toEqual([]);
    expect(chunkDocument("   \n\n  \t\n")).toEqual([]);
  });

  test("a short document still yields one chunk rather than being dropped", () => {
    const chunks = chunkDocument("Scope of this standard.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual({ section: null, clause: null, page: null, text: "Scope of this standard." });
  });

  test("lines are trimmed and internal whitespace is collapsed", () => {
    const [chunk] = chunkDocument("  first   line  \n\n   second\tline  ");
    expect(chunk.text).toBe("first line second line");
  });

  test("tags each chunk with the first dotted clause number it references", () => {
    const [chunk] = chunkDocument(`As required by 4.2.1 and later 7.3, ${paragraph(3)}`);
    expect(chunk.clause).toBe("4.2.1");
  });

  test("a bare integer is not mistaken for a clause reference", () => {
    const [chunk] = chunkDocument(`Use 3 samples. ${paragraph(3)}`);
    expect(chunk.clause).toBeNull();
  });

  test("ANNEX / ANNEXURE headings become the section of the chunks that follow them", () => {
    const text = [paragraph(3), "ANNEX A", paragraph(3), "Annexure - 2 (Informative)", paragraph(3)].join("\n");
    const chunks = chunkDocument(text);
    expect(chunks.map((c) => c.section)).toEqual([null, "ANNEX A", "Annexure - 2 (Informative)"]);
  });

  test("the heading line itself is not included in any chunk's text", () => {
    const chunks = chunkDocument(["ANNEX B", paragraph(3)].join("\n"));
    for (const c of chunks) expect(c.text).not.toContain("ANNEX B");
  });

  test("long text is split so no chunk grows far past the 1200-character cap", () => {
    const lines = Array.from({ length: 60 }, () => SENTENCE).join("\n");
    const chunks = chunkDocument(lines);
    expect(chunks.length).toBeGreaterThan(1);
    // A chunk is flushed as soon as it reaches the cap, so it can overshoot
    // by at most one line — never by a whole paragraph.
    for (const c of chunks) expect(c.text.length).toBeLessThan(1200 + SENTENCE.length + 1);
  });

  test("a short trailing fragment is folded into the previous chunk instead of standing alone", () => {
    const text = [paragraph(3), "ANNEX C", "Tiny tail."].join("\n");
    const chunks = chunkDocument(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text.endsWith("Tiny tail.")).toBe(true);
    // Folding keeps the earlier chunk's section — the fragment never got a chunk of its own.
    expect(chunks[0].section).toBeNull();
  });

  test("no text is lost between input and output", () => {
    const text = [paragraph(5), "ANNEX D", paragraph(20), "short", paragraph(2)].join("\n");
    const words = (s: string) => s.split(/\s+/).filter(Boolean);
    const inputWords = words(text).filter((w) => w !== "ANNEX" && w !== "D");
    const outputWords = chunkDocument(text).flatMap((c) => words(c.text));
    expect(outputWords).toEqual(inputWords);
  });

  test("page is always null — the plain-text chunker has no page information", () => {
    for (const c of chunkDocument(paragraph(40))) expect(c.page).toBeNull();
  });
});

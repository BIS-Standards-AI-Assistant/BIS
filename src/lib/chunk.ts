export interface StructuredChunk {
  section: string | null;
  clause: string | null;
  page: number | null;
  text: string;
}

const SECTION_HEADING = /^\s*ANNEX(?:URE)?\s*[-–]?\s*[A-Z0-9]+\b.*$/i;
const CLAUSE_REF = /\b(\d{1,2}(?:\.\d{1,2}){1,3})\b/;
const MAX_CHUNK_CHARS = 1200;
const MIN_CHUNK_CHARS = 200;

/**
 * Structure-aware chunker for BIS product-manual text (see AGENTS.md §10).
 * Splits on blank-line-delimited paragraphs, tracks the nearest ANNEX/section
 * heading, and tags each chunk with the first clause number it references.
 * Paragraphs are merged up to MAX_CHUNK_CHARS so chunks stay a few sentences
 * long rather than one line at a time.
 */
export function chunkDocument(rawText: string): StructuredChunk[] {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const chunks: StructuredChunk[] = [];
  let currentSection: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join(" ").replace(/\s+/g, " ").trim();
    buffer = [];
    if (text.length < MIN_CHUNK_CHARS && chunks.length > 0) {
      // Too short to stand alone as evidence; fold into the previous chunk.
      const prev = chunks[chunks.length - 1];
      prev.text = `${prev.text} ${text}`.trim();
      return;
    }
    if (text.length === 0) return;
    const clauseMatch = text.match(CLAUSE_REF);
    chunks.push({
      section: currentSection,
      clause: clauseMatch ? clauseMatch[1] : null,
      page: null,
      text,
    });
  };

  for (const line of lines) {
    if (SECTION_HEADING.test(line)) {
      flush();
      currentSection = line;
      continue;
    }
    buffer.push(line);
    const bufferedLength = buffer.join(" ").length;
    if (bufferedLength >= MAX_CHUNK_CHARS) {
      flush();
    }
  }
  flush();

  return chunks;
}

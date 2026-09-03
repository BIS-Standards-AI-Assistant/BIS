/**
 * The reader's own source library: documents they add in the Sources
 * panel, and the Indian Standards those documents were found to cite.
 *
 * This is the shared knowledge base between the Sources panel and the
 * assistant. Both read this one store, so a standard identified in an
 * uploaded document is in scope for the chat without either surface
 * having to know about the other.
 *
 * What is shared is *identifiers*, never document text. Uploading runs
 * /api/v1/analyze-document, which extracts BIS standard numbers
 * deterministically and never sends the file to a model; those numbers
 * then travel to the chat exactly like the ones from a search, and the
 * server resolves the facts from the database. Shipping the document's
 * prose as chat input would re-open what src/lib/chat-context.ts closed,
 * and would also let an uploaded file's wording act on the assistant.
 *
 * Storage is per-browser and per-session: sessionStorage, not
 * localStorage, because these are the reader's own files and keeping
 * them beyond the tab's life is not something they asked for.
 */

export type SourceStatus = "analyzing" | "ready" | "failed";

export interface LibrarySource {
  id: string;
  name: string;
  sizeBytes: number;
  addedAt: number;
  status: SourceStatus;
  /** Whether this source is in scope for the assistant. */
  selected: boolean;
  /**
   * Every Indian Standard the document cites, whether or not this system
   * has it indexed — that is a fact about the document, and hiding the
   * unindexed ones would misrepresent what the reader uploaded.
   */
  citedNumbers: string[];
  /**
   * The subset that resolves to a standard in the knowledge base. Only
   * these are shared with the assistant, because only these are ones it
   * can actually answer from.
   */
  standardNumbers: string[];
  /** What the analyzer could not establish — shown, never hidden. */
  limitations: string[];
  /** Why the document could not be used, when status is "failed". */
  error?: string;
}

const STORAGE_KEY = "bis-source-library";
const EVENT = "bis-sources-updated";

function read(): LibrarySource[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(sources: LibrarySource[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  } catch {
    /* storage unavailable or full — non-critical */
  }
  invalidateSnapshotCache();
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* not in a browser */
  }
}

export function addSource(source: LibrarySource) {
  write([...read(), source]);
}

export function updateSource(id: string, patch: Partial<LibrarySource>) {
  write(read().map((s) => (s.id === id ? { ...s, ...patch } : s)));
}

export function removeSource(id: string) {
  write(read().filter((s) => s.id !== id));
}

export function toggleSourceSelected(id: string) {
  write(read().map((s) => (s.id === id ? { ...s, selected: !s.selected } : s)));
}

export function clearSources() {
  write([]);
}

/**
 * The standards the assistant should treat as in scope: those cited by
 * ready, selected documents. Deduplicated, because two documents citing
 * the same standard is one piece of context, not two.
 */
export function selectedStandardNumbers(sources: LibrarySource[]): string[] {
  const numbers = sources
    .filter((s) => s.status === "ready" && s.selected)
    .flatMap((s) => s.standardNumbers);
  return [...new Set(numbers)];
}

// ---------------------------------------------------------------- store

export function subscribeToSources(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

const EMPTY: LibrarySource[] = [];

let cachedRaw: string | null = null;
let cachedParsed: LibrarySource[] = EMPTY;

function invalidateSnapshotCache() {
  cachedRaw = null;
  cachedParsed = EMPTY;
}

/**
 * Runs during render via useSyncExternalStore, so it must return a
 * referentially stable value — hence the cache keyed on the raw string.
 * Storage throws in private mode; that falls back to an empty library
 * rather than taking down the page.
 */
export function getSourcesSnapshot(): LibrarySource[] {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      cachedParsed = Array.isArray(parsed) ? parsed : EMPTY;
    } catch {
      cachedParsed = EMPTY;
    }
  }
  return cachedParsed;
}

/** No library exists on the server; rendering one would hydrate-mismatch. */
export function getSourcesServerSnapshot(): LibrarySource[] {
  return EMPTY;
}

// ---------------------------------------------------------------- upload

/** Matches the limits /api/v1/analyze-document actually enforces. */
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_SOURCE_TYPES = ".pdf,.txt";

export function describeFileRejection(file: File): string | null {
  if (file.size === 0) return "File is empty";
  if (file.size > MAX_SOURCE_BYTES) return `File is larger than ${Math.round(MAX_SOURCE_BYTES / 1024 / 1024)} MB`;
  if (!/\.(pdf|txt)$/i.test(file.name)) return "Only PDF and plain-text files are supported";
  return null;
}

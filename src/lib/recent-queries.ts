import type { Confidence } from "@/types/api";

export interface RecentQueryEntry {
  query: string;
  standardNumbers: string[];
  confidence: Confidence;
  timestamp: number;
}

const STORAGE_KEY = "bis-recent-queries";
const MAX_ENTRIES = 10;

export function getRecentQueries(): RecentQueryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentQuery(entry: RecentQueryEntry) {
  try {
    const existing = getRecentQueries().filter(
      (e) => e.query.toLowerCase() !== entry.query.toLowerCase(),
    );
    const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("bis-queries-updated"));
  } catch {
    /* storage unavailable — non-critical */
  }
}

export function clearRecentQueries() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — non-critical */
  }
  // Invalidate the render snapshot cache and wake every subscriber, so a
  // caller never has to reach into this module's internals to make the
  // clear visible.
  invalidateSnapshotCache();
  try {
    window.dispatchEvent(new Event("bis-queries-updated"));
  } catch {
    /* not in a browser */
  }
}

/**
 * `useSyncExternalStore` bindings for the recent-query list, shared by
 * every surface that shows it (the homepage list and the workspace Studio
 * panel) so there is one implementation of the snapshot caching rather
 * than a copy per component.
 */
export function subscribeToRecentQueries(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener("bis-queries-updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("bis-queries-updated", callback);
  };
}

const EMPTY: RecentQueryEntry[] = [];

let cachedRaw: string | null = null;
let cachedParsed: RecentQueryEntry[] = [];

/**
 * Runs during render via useSyncExternalStore, so it must return a
 * referentially stable value — hence the cache keyed on the raw string,
 * rather than re-parsing (and re-allocating) on every render.
 *
 * Storage access throws in private mode or when site data is blocked, and
 * malformed JSON throws too; neither should take down the page. Both fall
 * back to "no history".
 */
export function getRecentQueriesSnapshot(): RecentQueryEntry[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      cachedParsed = Array.isArray(parsed) ? parsed : [];
    } catch {
      cachedParsed = [];
    }
  }
  return cachedParsed;
}

function invalidateSnapshotCache() {
  cachedRaw = null;
  cachedParsed = [];
}

/** No history exists on the server; rendering it there would hydrate-mismatch. */
export function getRecentQueriesServerSnapshot(): RecentQueryEntry[] {
  return EMPTY;
}

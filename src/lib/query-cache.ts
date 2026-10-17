import type { QueryResponse } from "@/types/api";

/**
 * Per-tab cache of home-page search results, so re-running a search (going
 * back, re-submitting, re-opening a shared link) doesn't re-run the whole
 * pipeline.
 *
 * Keyed by language as well as query: /api/v1/query answers in the
 * language it is asked for, so after switching the UI from English to
 * Hindi the same query has a different answer, and a cache keyed on the
 * query alone kept serving the English one.
 *
 * Bounded: results are large (evidence passages and all), and
 * sessionStorage is a small quota shared with the rest of the tab — the
 * Sources panel's document library lives there too. Unbounded, a long
 * session filled it and the library's writes started failing silently.
 */

const PREFIX = "bis-query-cache:";
const INDEX_KEY = "bis-query-cache-index";
export const MAX_CACHED_RESULTS = 20;

/** Answers the pipeline produced without a model are not worth keeping. */
const FALLBACK_MARKER = "No AI-generated explanation";

function cacheKey(query: string, language: string): string {
  return `${PREFIX}${language}:${query}`;
}

/** Cache keys, oldest first. */
function readIndex(): string[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(INDEX_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

function writeIndex(index: string[]) {
  try {
    sessionStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {
    /* storage unavailable */
  }
}

export function getCachedResult(query: string, language: string): QueryResponse | null {
  const key = cacheKey(query, language);
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QueryResponse;
    if (parsed.answer?.includes(FALLBACK_MARKER)) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setCachedResult(query: string, language: string, result: QueryResponse) {
  if (result.answer?.includes(FALLBACK_MARKER)) return;
  const key = cacheKey(query, language);
  let value: string;
  try {
    value = JSON.stringify(result);
  } catch {
    return;
  }

  // Most recently stored last; the oldest are evicted first.
  const index = readIndex().filter((k) => k !== key);
  for (;;) {
    while (index.length >= MAX_CACHED_RESULTS) evict(index);
    try {
      sessionStorage.setItem(key, value);
      index.push(key);
      break;
    } catch {
      // Over quota: make room by dropping the oldest result and retry.
      // With nothing left to drop, give up — caching is only an optimisation.
      if (index.length === 0) break;
      evict(index);
    }
  }
  writeIndex(index);
}

function evict(index: string[]) {
  const oldest = index.shift();
  if (!oldest) return;
  try {
    sessionStorage.removeItem(oldest);
  } catch {
    /* storage unavailable */
  }
}

/**
 * Decides what the assistant is given as context, and in what priority.
 *
 * The chat API accepts at most 10 standard numbers
 * (src/app/api/v1/chat/route.ts). Two things compete for those slots: the
 * standards the current search happened to return, and the standards cited
 * by documents the reader deliberately added in the Sources panel.
 *
 * They are not equal. A search result is something the system produced; an
 * added source is something the reader chose. Ordering results first — as
 * this did originally — meant a query returning ten or more standards
 * silently truncated every one of the reader's own sources out of the
 * assistant's context, with nothing in the UI to say so. The Sources panel
 * would claim the documents were in scope while the request carried none of
 * them.
 *
 * So: **added sources are never crowded out by search results.** They take
 * the slots they need, results fill what remains, and anything that had to
 * be dropped is reported so the UI can say so rather than quietly lying.
 */

/** The chat route's own ceiling. Kept here so the two cannot drift apart. */
export const MAX_SCOPE_STANDARDS = 10;

export interface ChatScope {
  /** What actually gets sent, sources first. */
  standardNumbers: string[];
  /** How many of those came from the reader's added documents. */
  fromSources: number;
  /** Search-result standards that did not fit. Never sources. */
  droppedResults: number;
}

export function buildChatScope(
  sourceStandardNumbers: string[],
  resultStandardNumbers: string[],
  limit: number = MAX_SCOPE_STANDARDS,
): ChatScope {
  // Sources first, deduplicated, and capped at the limit in the pathological
  // case where a reader has added more than ten standards' worth of
  // documents. Truncating their own sources is still wrong, but it is the
  // API's ceiling; the count is reported either way.
  const sources = [...new Set(sourceStandardNumbers)].slice(0, limit);

  const remaining = limit - sources.length;
  const results = [...new Set(resultStandardNumbers)].filter((n) => !sources.includes(n));
  const kept = remaining > 0 ? results.slice(0, remaining) : [];

  return {
    standardNumbers: [...sources, ...kept],
    fromSources: sources.length,
    droppedResults: results.length - kept.length,
  };
}

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
}

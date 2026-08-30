/**
 * Explicit search state machine — replaces the "isLoading / hasError /
 * hasResults / showSuggestions" scattered-boolean pattern the previous
 * SearchOverlay used. A discriminated union means only one state is ever
 * true at once, so the UI can't render two contradictory states (e.g.
 * loading AND error) at the same time by accident.
 *
 * This models the *overlay's* typeahead behavior specifically (not the
 * full results page, which already has its own loading/error/empty
 * handling in HomeClient.tsx and /search/page.tsx) — SUBMITTING/RESULTS
 * live there, not here, since the overlay always hands off to
 * /search?q=... rather than rendering full results itself.
 */

export type SearchState =
  | { kind: "empty" }
  | { kind: "focused" }
  | { kind: "typing"; query: string }
  | { kind: "suggestions"; query: string; suggestions: SearchSuggestion[] }
  | { kind: "no_results"; query: string }
  | { kind: "offline"; query: string };

export type SuggestionKind = "identifier" | "standard";

export interface SearchSuggestion {
  kind: SuggestionKind;
  label: string;
  sublabel?: string;
  href: string;
}

export function initialSearchState(): SearchState {
  return { kind: "empty" };
}

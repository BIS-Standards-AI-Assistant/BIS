/**
 * Human-readable label for a verification_status value. Deliberately
 * has no Node-only imports (unlike certification-schemes.ts, which reads
 * from the filesystem) so client components (e.g. SchemeExplorer.tsx)
 * can import it without pulling `fs`/`path` into the browser bundle.
 * Shared so a needs_review entry never renders as its raw snake_case DB
 * value in one place while reading "Needs review" in another.
 */
export const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  verified_accurate: "Verified",
  corrected: "Corrected",
  needs_review: "Needs review",
  unverified: "Unverified",
};

import { PROVENANCE, type Provenance } from "@/lib/provenance";

/**
 * States where a piece of information came from (§9, §41).
 *
 * Each provenance gets a distinct shape as well as a distinct colour, not
 * colour alone — §34 forbids relying on colour to carry meaning, and this is
 * the one distinction in the product where a colour-blind reader being
 * unable to tell official text from AI reasoning would actually matter.
 * Official is a solid filled tag; AI and inference are outlined, inference
 * dashed; user-provided is neutral.
 */

const STYLES: Record<Provenance, string> = {
  official: "border-transparent bg-navy text-white",
  user: "border-border-strong bg-surface-alt text-ink-soft",
  ai: "border-accent bg-accent-soft text-accent-ink",
  inference: "border-dashed border-ink-faint bg-transparent text-ink-faint",
};

export function SourceTag({
  provenance,
  className = "",
}: {
  provenance: Provenance;
  className?: string;
}) {
  const meta = PROVENANCE[provenance];
  return (
    <span
      // The description is the accessible name, so a screen reader hears what
      // the tag means, not just its label.
      title={meta.description}
      aria-label={`${meta.label}. ${meta.description}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STYLES[provenance]} ${className}`}
    >
      {meta.label}
    </span>
  );
}

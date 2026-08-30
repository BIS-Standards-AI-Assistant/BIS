import type { Conflict } from "@/types/api";
import { AlertTriangleIcon } from "@/components/ui/icons";

const TYPE_LABEL: Record<Conflict["type"], string> = {
  version_conflict: "Multiple editions retrieved",
  superseded_standard: "Possibly superseded standard",
  evidence_conflict: "Conflicting evidence",
};

/**
 * Conflicts are engine-detected (src/lib/conflict-detection.ts) — this
 * component never invents or elevates a conflict beyond what the engine's
 * description states. It also never calls something a "legal" conflict;
 * the copy below matches exactly what conflict-detection.ts's Conflict
 * objects actually assert.
 */
export function ConflictPanel({ conflicts }: { conflicts: Conflict[] }) {
  if (conflicts.length === 0) return null;

  return (
    <section className="rounded-lg border border-warning bg-warning-soft p-4">
      <div className="flex items-center gap-2">
        <AlertTriangleIcon className="h-4 w-4 shrink-0 text-warning" />
        <h2 className="text-[13px] font-semibold text-ink">Potential evidence conflict</h2>
      </div>
      <ul className="mt-2 space-y-2">
        {conflicts.map((c, i) => (
          <li key={i} className="text-[13px] leading-relaxed text-ink-soft">
            <span className="font-medium text-ink">{TYPE_LABEL[c.type]}</span>
            {c.affectedStandards.length > 0 && (
              <span className="text-ink-faint"> ({c.affectedStandards.join(", ")})</span>
            )}
            <p className="mt-0.5">{c.description}</p>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[12px] font-medium text-ink-faint">
        Review the cited sources before making a compliance decision.
      </p>
    </section>
  );
}

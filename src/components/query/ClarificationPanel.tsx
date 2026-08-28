/**
 * The backend surfaces missing-information as a flat list, not structured
 * multiple-choice options — so this stays an honest "here's what to add"
 * note rather than a fake interactive question form with buttons that
 * don't actually do anything yet.
 */
export function ClarificationPanel({ items }: { items: string[] }) {
  return (
    <div className="border border-warning/40 bg-warning-soft p-5">
      <h2 className="text-sm font-semibold text-warning">
        This answer would be more precise with one more detail
      </h2>
      <ul className="mt-3 space-y-1.5 text-sm text-ink">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-warning">•</span>
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-soft">
        Add these details to your question above and search again for a more precise result.
      </p>
    </div>
  );
}

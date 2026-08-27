const ITEMS = ["BIS standards", "Evidence-backed retrieval", "Source traceability", "AI-assisted discovery"];

export function TrustStrip() {
  return (
    <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-6">
      {ITEMS.map((item) => (
        <span key={item} className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          {item}
        </span>
      ))}
    </div>
  );
}

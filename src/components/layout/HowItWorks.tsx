const STEPS = [
  { title: "Describe your product", body: "Explain what you're making, in your own words — no need to know BIS terminology." },
  { title: "Discover relevant standards", body: "Hybrid search over official BIS documents surfaces candidates by meaning and keyword." },
  { title: "Inspect the evidence", body: "Every recommendation links back to the exact section and clause it came from." },
  { title: "Understand the next step", body: "See certification and testing pointers, and what's still uncertain." },
] as const;

export function HowItWorks() {
  return (
    <div className="grid grid-cols-1 gap-8 border-t border-border pt-10 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((step, i) => (
        <div key={step.title}>
          <span className="font-mono text-xs text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
          <h3 className="mt-2 text-sm font-semibold text-ink">{step.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{step.body}</p>
        </div>
      ))}
    </div>
  );
}

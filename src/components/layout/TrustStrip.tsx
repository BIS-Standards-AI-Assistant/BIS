import { DocumentIcon, SearchIcon, ShieldCheckIcon } from "@/components/ui/icons";

const FEATURES = [
  {
    icon: <SearchIcon className="h-[18px] w-[18px]" />,
    label: "Source-grounded",
    body: "Responses are generated using the available indexed BIS knowledge base.",
  },
  {
    icon: <DocumentIcon className="h-[18px] w-[18px]" />,
    label: "Traceable",
    body: "See the source documents used to support an answer.",
  },
  {
    icon: <ShieldCheckIcon className="h-[18px] w-[18px]" />,
    label: "Honest",
    body: "If sufficient information is not available, BIS Assistant clearly says so.",
  },
];

export function TrustStrip() {
  return (
    <section id="trust" className="border-t border-border pt-8">
      <h2 className="text-sm font-semibold text-navy">Answers backed by BIS sources</h2>
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.label} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy/10 text-navy">
              {f.icon}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink">{f.label}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{f.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

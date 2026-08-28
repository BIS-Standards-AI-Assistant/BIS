import Link from "next/link";

/**
 * Only the four things this application actually does. Certification and
 * testing information appear inside query results when the evidence
 * supports them — they are not separate standalone services, so they are
 * not listed here as if they were.
 */
const ACTIONS = [
  {
    href: "/",
    label: "Find applicable standard",
    body: "Describe a product or process and get evidence-backed standard recommendations.",
  },
  {
    href: "/search",
    label: "Search standards",
    body: "Look up standards directly by product, topic, or IS number.",
  },
  {
    href: "/standards",
    label: "Browse all standards",
    body: "See every Indian Standard currently in this system's knowledge base.",
  },
  {
    href: "/compare",
    label: "Compare standards",
    body: "Place two or more standards side by side to see sourced differences.",
  },
] as const;

export function ServiceActions() {
  return (
    <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {ACTIONS.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="group flex flex-col bg-surface-raised p-5 transition-colors hover:bg-surface-alt"
        >
          <span className="text-sm font-semibold text-ink group-hover:text-navy">{action.label}</span>
          <span className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{action.body}</span>
        </Link>
      ))}
    </div>
  );
}

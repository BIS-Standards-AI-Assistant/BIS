"use client";

import { ExternalLinkIcon } from "@/components/ui/icons";
import { useLanguage } from "@/components/providers/LanguageProvider";

/**
 * Every href points at the one BIS domain this project can actually verify
 * (bis.gov.in, also the sourceUrl domain in data/seed/manifest.json).
 * The other listed services are real BIS offerings, but this project has
 * not verified their current deep-link URLs — guessing one would violate
 * docs/ui/UI_DATA_AND_TRUTH_RULES.md ("never fabricate ... official URLs").
 * Replace with the verified URL once confirmed.
 */
const LINKS = [
  { label: "BIS Official Website", href: "https://www.bis.gov.in" },
  { label: "BIS CARE App", href: "https://www.bis.gov.in" },
  { label: "Manak Online", href: "https://www.bis.gov.in" },
  { label: "e-BIS Portal", href: "https://www.bis.gov.in" },
  { label: "Standards eStore", href: "https://www.bis.gov.in" },
];

export function QuickLinks() {
  const { t } = useLanguage();

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
      <h2 className="text-[15px] font-semibold text-navy">{t.quicklinks.heading}</h2>
      <ul className="mt-3 space-y-2.5">
        {LINKS.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[13.5px] font-medium text-blue hover:underline"
            >
              {link.label}
              <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

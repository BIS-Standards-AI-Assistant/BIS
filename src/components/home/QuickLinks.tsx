"use client";

import Link from "next/link";
import { ExternalLinkIcon } from "@/components/ui/icons";
import { useLanguage } from "@/components/providers/LanguageProvider";

/**
 * Quick links definitions.
 * Only the first link goes to the official external page.
 * The other links redirect internally to the "/coming-soon" page.
 */
const LINKS = [
  { label: "BIS Official Website", href: "https://www.bis.gov.in", external: true },
  { label: "BIS CARE App", href: "/coming-soon", external: false },
  { label: "Manak Online", href: "/coming-soon", external: false },
  { label: "e-BIS Portal", href: "/coming-soon", external: false },
  { label: "Standards eStore", href: "/coming-soon", external: false },
];

export function QuickLinks() {
  const { t } = useLanguage();

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
      <h2 className="text-[15px] font-bold text-navy">{t.quicklinks.heading}</h2>
      <ul className="mt-4 space-y-3">
        {LINKS.map((link) => (
          <li key={link.label} className="border-b border-border last:border-0 pb-2.5 last:pb-0">
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-[13.5px] font-bold text-blue hover:text-navy transition-colors"
              >
                <span>{link.label}</span>
                <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
              </a>
            ) : (
              <Link
                href={link.href}
                className="flex items-center justify-between text-[13.5px] font-bold text-blue hover:text-navy transition-colors"
              >
                <span>{link.label}</span>
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-orange/10 text-orange border border-orange/15 transition-transform group-hover:scale-95">
                  Demo
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

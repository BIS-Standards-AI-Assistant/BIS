"use client";

import Link from "next/link";
import { ExternalLinkIcon } from "@/components/ui/icons";
import { useLanguage } from "@/components/providers/LanguageProvider";

/**
 * Quick links definitions pointing to verified official BIS portals.
 */
const LINKS = [
  { label: "BIS Official Website", href: "https://www.bis.gov.in", external: true },
  { label: "BIS CARE App", href: "https://www.bis.gov.in/bis-apps/?lang=hi", external: true },
  { label: "Manak Online", href: "https://www.manakonline.in", external: true },
  { label: "Compulsory Certification (QCOs)", href: "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/?lang=en", external: true },
  { label: "Standards & Quality Directory", href: "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/?lang=en", external: true },
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
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

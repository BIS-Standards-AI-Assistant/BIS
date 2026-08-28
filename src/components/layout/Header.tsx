"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * Only routes the application actually implements are linked here.
 * The BIS service taxonomy also includes Certification, Testing,
 * Resources, e-Services, and About BIS — those are not shown because
 * this app has no real content for them yet. Adding placeholder links
 * would violate the project's own truthfulness rule (never present an
 * unsupported destination as if it were a working feature).
 */
const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/standards", label: "Standards" },
  { href: "/search", label: "Search" },
  { href: "/compare", label: "Compare" },
] as const;

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="border-b border-border">
      <div className="bg-navy-deep text-white/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-1.5 text-[11.5px]">
          <span>Government of India · Ministry of Consumer Affairs, Food &amp; Public Distribution</span>
          <a href="https://bis.gov.in" target="_blank" rel="noopener noreferrer" className="hover:underline">
            bis.gov.in
          </a>
        </div>
      </div>

      <header className="bg-surface-raised">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-sm bg-navy text-[13px] font-bold text-white"
            >
              BIS
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[15px] font-semibold text-ink">Standards Navigator</span>
              <span className="text-[11.5px] text-ink-faint">Bureau of Indian Standards</span>
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-sm px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "text-navy" : "text-ink-soft hover:text-ink"
                  }`}
                  style={active ? { boxShadow: "inset 0 -2px 0 0 var(--color-navy)" } : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-sm border border-border px-3 py-1.5 text-sm font-medium text-ink-soft md:hidden"
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>

        {menuOpen && (
          <nav id="mobile-nav" aria-label="Primary" className="border-t border-border px-6 py-2 md:hidden">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block py-2.5 text-sm font-medium text-ink-soft hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
    </div>
  );
}

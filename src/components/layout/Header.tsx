"use client";

import { useState } from "react";
import Link from "next/link";
import { BisLogo } from "@/components/ui/BisLogo";
import { ChevronDownIcon, MenuIcon, CloseIcon, SearchIcon } from "@/components/ui/icons";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function Header() {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  const navItems: { label: string; href: string; hasMenu?: boolean }[] = [
    { label: t.nav.standards, href: "/search", hasMenu: true },
    { label: t.nav.certification, href: "/#services", hasMenu: true },
    { label: t.nav.testing, href: "/#services", hasMenu: true },
    { label: t.nav.resources, href: "/#footer", hasMenu: true },
    { label: t.nav.eservices, href: "/#services", hasMenu: true },
    { label: t.nav.about, href: "/#footer", hasMenu: true },
    { label: t.nav.contact, href: "/#footer" },
  ];

  return (
    <header className="border-b border-border bg-surface-raised">
      <div className="mx-auto flex h-[86px] max-w-[1380px] items-center justify-between gap-6 px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <BisLogo className="h-11 w-11 shrink-0" />
          <span className="leading-tight">
            <span className="block text-[17px] font-semibold tracking-tight text-navy">
              भारतीय मानक ब्यूरो
            </span>
            <span className="block text-[13px] font-bold uppercase tracking-wide text-ink">
              Bureau of Indian Standards
            </span>
            <span className="block text-[11px] text-ink-faint">{t.header.tagline}</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-1 text-[14px] font-medium text-ink-soft transition-colors hover:text-blue"
            >
              {item.label}
              {item.hasMenu && <ChevronDownIcon className="h-3.5 w-3.5 text-ink-faint" />}
            </Link>
          ))}
          <button
            type="button"
            aria-label={t.nav.search}
            className="rounded-full p-2 text-ink-soft transition-colors hover:bg-surface-alt hover:text-blue"
          >
            <SearchIcon className="h-[18px] w-[18px]" />
          </button>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="rounded-md p-2 text-navy lg:hidden"
        >
          {open ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav aria-label="Primary mobile" className="border-t border-border bg-surface-raised px-6 py-3 lg:hidden">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-2.5 text-[15px] font-medium text-ink-soft hover:bg-surface-alt hover:text-blue"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

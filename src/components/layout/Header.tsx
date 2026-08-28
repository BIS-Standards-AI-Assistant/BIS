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
    <header className="sticky top-0 z-30 border-b border-border bg-surface-raised/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-[90px] max-w-[1380px] items-center justify-between gap-6 px-6">
        {/* Bilingual Logo Branding Block */}
        <Link href="/" className="group flex shrink-0 items-center gap-3.5">
          <BisLogo className="h-13 w-13 shrink-0 transform transition-transform duration-500 group-hover:rotate-12" />
          <div className="flex flex-col justify-center border-l border-border pl-3.5 leading-tight">
            <span className="text-[17px] font-bold tracking-tight text-navy transition-colors group-hover:text-blue">
              भारतीय मानक ब्यूरो
            </span>
            <span className="text-[13px] font-extrabold uppercase tracking-wider text-navy">
              Bureau of Indian Standards
            </span>
            <span className="text-[10px] font-medium tracking-wide text-ink-faint">
              The National Standards Body of India
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav aria-label="Primary" className="hidden items-center gap-5 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group flex items-center gap-1 text-[13.5px] font-semibold text-ink-soft transition-colors hover:text-blue"
            >
              {item.label}
              {item.hasMenu && (
                <ChevronDownIcon className="h-3 w-3 text-ink-faint transition-transform duration-300 group-hover:translate-y-0.5 group-hover:text-blue" />
              )}
            </Link>
          ))}
          
          <span className="h-4 w-px bg-border-strong" aria-hidden="true" />
          
          <button
            type="button"
            aria-label={t.nav.search}
            className="rounded-full p-2 text-ink-soft transition-all hover:bg-surface-alt hover:text-blue"
          >
            <SearchIcon className="h-[18px] w-[18px] stroke-[2]" />
          </button>
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="rounded-md p-2 text-navy lg:hidden hover:bg-surface-alt"
        >
          {open ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <nav aria-label="Primary mobile" className="border-t border-border bg-surface-raised px-6 py-4 shadow-inner lg:hidden">
          <ul className="flex flex-col gap-1.5">
            {navItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-[14.5px] font-semibold text-ink-soft hover:bg-surface-alt hover:text-blue"
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


"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BisLogo } from "@/components/ui/BisLogo";
import { ChevronDownIcon, MenuIcon, CloseIcon, SearchIcon } from "@/components/ui/icons";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { MegaMenu } from "@/components/layout/MegaMenu";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { NAV_SECTIONS, navItemHref, type NavSection } from "@/lib/navigation";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const { t } = useLanguage();

  const sectionByKey = new Map<string, NavSection>(NAV_SECTIONS.map((s) => [s.key, s]));

  const navItems: { key: string; label: string; href: string; section?: NavSection }[] = [
    { key: "standards", label: t.nav.standards, href: "/standards", section: sectionByKey.get("standards") },
    { key: "certification", label: t.nav.certification, href: "/certification", section: sectionByKey.get("certification") },
    { key: "testing", label: t.nav.testing, href: "/testing", section: sectionByKey.get("testing") },
    { key: "resources", label: t.nav.resources, href: "/resources", section: sectionByKey.get("resources") },
    { key: "e-services", label: t.nav.eservices, href: "/e-services", section: sectionByKey.get("e-services") },
    { key: "about", label: t.nav.about, href: "/about", section: sectionByKey.get("about") },
    { key: "contact", label: t.nav.contact, href: "/contact" },
  ];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenSection(null);
      // "/" opens global search, matching common site-search conventions —
      // but never when the user is already typing in a text field, so it
      // doesn't hijack a literal "/" character mid-query elsewhere on the page.
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    function onClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenSection(null);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  const activeSection = openSection ? sectionByKey.get(openSection) : null;

  return (
    <header ref={navRef} className="relative border-b border-border bg-surface-raised">
      <div className="mx-auto flex h-[86px] max-w-[1380px] items-center justify-between gap-6 px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3" onClick={() => setOpenSection(null)}>
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
          {navItems.map((item) =>
            item.section ? (
              <button
                key={item.key}
                type="button"
                aria-expanded={openSection === item.key}
                aria-controls={`megamenu-${item.key}`}
                onClick={() => setOpenSection((cur) => (cur === item.key ? null : item.key))}
                className="flex items-center gap-1 text-[14px] font-medium text-ink-soft transition-colors hover:text-blue"
              >
                {item.label}
                <ChevronDownIcon
                  className={`h-3.5 w-3.5 text-ink-faint transition-transform ${openSection === item.key ? "rotate-180" : ""}`}
                />
              </button>
            ) : (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setOpenSection(null)}
                className="text-[14px] font-medium text-ink-soft transition-colors hover:text-blue"
              >
                {item.label}
              </Link>
            ),
          )}
          <button
            type="button"
            aria-label={t.nav.search}
            onClick={() => setSearchOpen(true)}
            className="rounded-full p-2 text-ink-soft transition-colors hover:bg-surface-alt hover:text-blue"
          >
            <SearchIcon className="h-[18px] w-[18px]" />
          </button>
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          className="rounded-md p-2 text-navy lg:hidden"
        >
          {mobileOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </div>

      {activeSection && <MegaMenu section={activeSection} id={`megamenu-${activeSection.key}`} />}

      {mobileOpen && (
        <nav aria-label="Primary mobile" className="border-t border-border bg-surface-raised px-6 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              setSearchOpen(true);
            }}
            className="mb-2 flex w-full items-center gap-2 rounded-md border border-border-strong px-3 py-2.5 text-[14px] font-medium text-ink-soft"
          >
            <SearchIcon className="h-4 w-4" />
            {t.nav.search}
          </button>
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.key}>
                {item.section ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setMobileExpanded((cur) => (cur === item.key ? null : item.key))}
                      aria-expanded={mobileExpanded === item.key}
                      className="flex w-full items-center justify-between rounded-md px-2 py-2.5 text-left text-[15px] font-medium text-ink-soft hover:bg-surface-alt hover:text-blue"
                    >
                      {item.label}
                      <ChevronDownIcon
                        className={`h-4 w-4 transition-transform ${mobileExpanded === item.key ? "rotate-180" : ""}`}
                      />
                    </button>
                    {mobileExpanded === item.key && (
                      <div className="ml-2 border-l border-border pl-3">
                        {item.section.groups.map((group) => (
                          <div key={group.title} className="py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                              {group.title}
                            </p>
                            <ul className="mt-1.5 space-y-1.5">
                              {group.items.map((navItem) => (
                                <li key={navItem.label}>
                                  <Link
                                    href={navItemHref(item.section!, navItem)}
                                    onClick={() => setMobileOpen(false)}
                                    className="block py-1 text-[13.5px] text-ink-soft hover:text-blue"
                                  >
                                    {navItem.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-md px-2 py-2.5 text-[15px] font-medium text-ink-soft hover:bg-surface-alt hover:text-blue"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}

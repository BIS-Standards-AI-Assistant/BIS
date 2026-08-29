"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { BisLogo } from "@/components/ui/BisLogo";
import { ChevronDownIcon, MenuIcon, CloseIcon, SearchIcon, ChevronRightIcon } from "@/components/ui/icons";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { NavbarModal, type NavModalType } from "@/components/layout/NavbarModal";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aboutDropdownOpen, setAboutDropdownOpen] = useState(false);
  const [mobileAboutExpanded, setMobileAboutExpanded] = useState(false);
  const [activeModal, setActiveModal] = useState<NavModalType>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAboutDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAboutDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const bureauLinks = [
    { label: "Overview", href: "/about#overview" },
    { label: "Organization & Structure", href: "/about#overview" },
    { label: "Origin Of BIS (1947)", href: "/about#origin" },
    { label: "BIS Glory & Milestones", href: "/about#origin" },
    { label: "BIS Act, Rules & Regulations", href: "/about#acts" },
    { label: "Certification Schemes (ISI/CRS)", href: "/about#schemes" },
    { label: "National Significance & Pillars", href: "/about#significance" },
  ];

  const directoryLinks = [
    { label: "General Enquiry & Contact", href: "/about#directory" },
    { label: "HeadQuarter (Manak Bhavan)", href: "/about#directory" },
    { label: "5 Regional Offices (N/W/E/S/C)", href: "/about#directory" },
    { label: "Branch & Sales Offices", href: "/about#directory" },
    { label: "Laboratory Testing Network", href: "/about#directory" },
    { label: "BIS CARE App & Portals", href: "/about#apps" },
    { label: "Gold Hallmarking (HUID) Guidelines", href: "/about#schemes" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-surface-raised/95 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-[90px] max-w-[1380px] items-center justify-between gap-6 px-6">
          {/* Bilingual Logo Branding Block */}
          <Link href="/" className="group flex shrink-0 items-center gap-3.5">
            <BisLogo className="h-12 w-12 shrink-0 transform transition-transform duration-500 group-hover:rotate-6" />
            <div className="flex flex-col justify-center border-l border-border pl-3.5 leading-tight">
              <span className="text-[17px] font-bold tracking-tight text-navy transition-colors group-hover:text-blue">
                भारतीय मानक ब्यूरो
              </span>
              <span className="text-[13px] font-extrabold uppercase tracking-wider text-navy">
                Bureau of Indian Standards
              </span>
              <span className="text-[10px] font-medium tracking-wide text-ink-faint">
                {t.header.tagline}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
            <button
              type="button"
              onClick={() => setActiveModal("standards")}
              className="text-[14px] font-medium text-ink-soft transition-colors hover:text-blue"
            >
              {t.nav.standards}
            </button>

            <button
              type="button"
              onClick={() => setActiveModal("certification")}
              className="text-[14px] font-medium text-ink-soft transition-colors hover:text-blue"
            >
              {t.nav.certification}
            </button>

            <button
              type="button"
              onClick={() => setActiveModal("testing")}
              className="text-[14px] font-medium text-ink-soft transition-colors hover:text-blue"
            >
              {t.nav.testing}
            </button>

            <button
              type="button"
              onClick={() => setActiveModal("resources")}
              className="text-[14px] font-medium text-ink-soft transition-colors hover:text-blue"
            >
              {t.nav.resources}
            </button>

            <button
              type="button"
              onClick={() => setActiveModal("eservices")}
              className="text-[14px] font-medium text-ink-soft transition-colors hover:text-blue"
            >
              {t.nav.eservices}
            </button>

            {/* About BIS with Mega Menu Dropdown */}
            <div
              ref={dropdownRef}
              className="relative"
              onMouseEnter={() => setAboutDropdownOpen(true)}
              onMouseLeave={() => setAboutDropdownOpen(false)}
            >
              <div className="flex items-center gap-1">
                <Link
                  href="/about"
                  className={`flex items-center gap-1 text-[14px] font-medium transition-colors ${
                    aboutDropdownOpen ? "text-blue font-semibold" : "text-ink-soft hover:text-blue"
                  }`}
                >
                  {t.nav.about}
                </Link>
                <button
                  type="button"
                  onClick={() => setAboutDropdownOpen((v) => !v)}
                  aria-expanded={aboutDropdownOpen}
                  aria-haspopup="true"
                  aria-label="Toggle About BIS menu"
                  className="p-1 text-ink-faint hover:text-blue"
                >
                  <ChevronDownIcon
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      aboutDropdownOpen ? "rotate-180 text-blue" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Official Two-Column Mega Menu */}
              {aboutDropdownOpen && (
                <div className="absolute right-0 top-full pt-2 w-[590px] max-w-[calc(100vw-2rem)] z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="rounded-xl border border-border bg-surface-raised p-6 shadow-2xl ring-1 ring-black/5">
                    <div className="grid grid-cols-2 gap-8">
                      {/* The Bureau Column */}
                      <div>
                        <div className="flex items-center justify-between border-b-2 border-orange pb-2">
                          <span className="text-[15px] font-bold text-navy">The Bureau</span>
                        </div>
                        <ul className="mt-3 space-y-2">
                          {bureauLinks.map((item) => (
                            <li key={item.label}>
                              <Link
                                href={item.href}
                                onClick={() => setAboutDropdownOpen(false)}
                                className="group flex items-center justify-between text-[13px] font-medium text-ink-soft transition-colors hover:text-blue"
                              >
                                <span>{item.label}</span>
                                <ChevronRightIcon className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 text-blue" />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Directory Column */}
                      <div>
                        <div className="flex items-center justify-between border-b-2 border-orange pb-2">
                          <span className="text-[15px] font-bold text-navy">Directory</span>
                        </div>
                        <ul className="mt-3 space-y-2">
                          {directoryLinks.map((item) => (
                            <li key={item.label}>
                              <Link
                                href={item.href}
                                onClick={() => setAboutDropdownOpen(false)}
                                className="group flex items-center justify-between text-[13px] font-medium text-ink-soft transition-colors hover:text-blue"
                              >
                                <span>{item.label}</span>
                                <ChevronRightIcon className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 text-blue" />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                      <span className="text-xs text-ink-faint">
                        Established under BIS Act, 2016 • ISO/IEC Member
                      </span>
                      <Link
                        href="/about"
                        onClick={() => setAboutDropdownOpen(false)}
                        className="text-xs font-bold text-blue hover:underline"
                      >
                        View Complete Overview →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveModal("contact")}
              className="text-[14px] font-medium text-ink-soft transition-colors hover:text-blue"
            >
              {t.nav.contact}
            </button>

            <Link
              href="/search"
              aria-label={t.nav.search}
              className="rounded-full p-2 text-ink-soft transition-colors hover:bg-surface-alt hover:text-blue"
            >
              <SearchIcon className="h-[18px] w-[18px]" />
            </Link>
          </nav>

          {/* Mobile Menu Button */}
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

        {/* Mobile Drawer Menu */}
        {mobileOpen && (
          <nav aria-label="Primary mobile" className="border-t border-border bg-surface-raised px-6 py-4 lg:hidden">
            <ul className="flex flex-col gap-2">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    setActiveModal("standards");
                  }}
                  className="w-full text-left block rounded-md px-2 py-2 text-[15px] font-medium text-ink-soft hover:bg-surface-alt hover:text-blue"
                >
                  {t.nav.standards}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    setActiveModal("certification");
                  }}
                  className="w-full text-left block rounded-md px-2 py-2 text-[15px] font-medium text-ink-soft hover:bg-surface-alt hover:text-blue"
                >
                  {t.nav.certification}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    setActiveModal("testing");
                  }}
                  className="w-full text-left block rounded-md px-2 py-2 text-[15px] font-medium text-ink-soft hover:bg-surface-alt hover:text-blue"
                >
                  {t.nav.testing}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    setActiveModal("resources");
                  }}
                  className="w-full text-left block rounded-md px-2 py-2 text-[15px] font-medium text-ink-soft hover:bg-surface-alt hover:text-blue"
                >
                  {t.nav.resources}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    setActiveModal("eservices");
                  }}
                  className="w-full text-left block rounded-md px-2 py-2 text-[15px] font-medium text-ink-soft hover:bg-surface-alt hover:text-blue"
                >
                  {t.nav.eservices}
                </button>
              </li>

              {/* Mobile About Dropdown Accordion */}
              <li className="border-y border-border py-1">
                <div className="flex items-center justify-between">
                  <Link
                    href="/about"
                    onClick={() => setMobileOpen(false)}
                    className="block flex-1 rounded-md px-2 py-2 text-[15px] font-bold text-navy hover:bg-surface-alt hover:text-blue"
                  >
                    {t.nav.about}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMobileAboutExpanded((v) => !v)}
                    className="p-2 text-ink-faint hover:text-blue"
                    aria-label="Expand About BIS Submenu"
                  >
                    <ChevronDownIcon
                      className={`h-4 w-4 transition-transform duration-200 ${
                        mobileAboutExpanded ? "rotate-180 text-blue" : ""
                      }`}
                    />
                  </button>
                </div>

                {mobileAboutExpanded && (
                  <div className="mt-2 space-y-3 pl-4">
                    <div className="text-xs font-bold uppercase text-orange">The Bureau</div>
                    <ul className="space-y-1.5 pl-2">
                      {bureauLinks.map((item) => (
                        <li key={item.label}>
                          <Link
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className="block text-xs font-medium text-ink-soft hover:text-blue"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 text-xs font-bold uppercase text-orange">Directory</div>
                    <ul className="space-y-1.5 pl-2">
                      {directoryLinks.map((item) => (
                        <li key={item.label}>
                          <Link
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className="block text-xs font-medium text-ink-soft hover:text-blue"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    setActiveModal("contact");
                  }}
                  className="w-full text-left block rounded-md px-2 py-2 text-[15px] font-medium text-ink-soft hover:bg-surface-alt hover:text-blue"
                >
                  {t.nav.contact}
                </button>
              </li>
            </ul>
          </nav>
        )}
      </header>

      {/* Interactive Navbar Modal Dialog */}
      <NavbarModal
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        onSelectTab={(tab) => setActiveModal(tab)}
      />
    </>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  CloseIcon,
  DocumentIcon,
  ShieldCheckIcon,
  FlaskIcon,
  ExternalLinkIcon,
  BadgeCheckIcon,
  GlobeIcon,
  SearchIcon,
  ArrowRightIcon,
} from "@/components/ui/icons";

export type NavModalType =
  | "standards"
  | "certification"
  | "testing"
  | "resources"
  | "eservices"
  | "contact"
  | null;

interface NavbarModalProps {
  activeModal: NavModalType;
  onClose: () => void;
  onSelectTab: (tab: NavModalType) => void;
}

export function NavbarModal({ activeModal, onClose, onSelectTab }: NavbarModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (activeModal) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [activeModal, onClose]);

  if (!activeModal) return null;

  const tabs: { id: NavModalType; label: string }[] = [
    { id: "standards", label: "Standards" },
    { id: "certification", label: "Certification" },
    { id: "testing", label: "Testing" },
    { id: "resources", label: "Resources" },
    { id: "eservices", label: "e-Services" },
    { id: "contact", label: "Contact Us" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-navy-deep/70 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between border-b border-border bg-surface-alt px-6 py-3.5">
          {/* Quick Tab Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  activeModal === tab.id
                    ? "bg-navy text-white shadow-sm"
                    : "text-ink-soft hover:bg-surface-sunken hover:text-navy"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog (Esc)"
            className="group ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-ink-soft transition-colors hover:bg-danger hover:text-white"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {/* 1. STANDARDS MODAL */}
          {activeModal === "standards" && (
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-md bg-blue/10 px-2.5 py-1 text-xs font-bold text-blue">
                  <DocumentIcon className="h-3.5 w-3.5" />
                  <span>TECHNICAL DIVISIONS &amp; CATALOG</span>
                </div>
                <h2 className="mt-2.5 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
                  Bureau of Indian Standards (BIS) Technical Divisions &amp; Scope
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">
                  India&apos;s national standardisation catalog encompasses over <strong>21,000 active Indian Standards (IS Codes)</strong> categorized across 15 technical departments.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-blue">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue">ETD</div>
                  <h3 className="mt-1 text-base font-bold text-navy">Electrotechnical</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                    Electrical safety, home appliances (IS 302 series), transformers, motors, switchgear, and national electrical grid systems.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-blue">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue">LITD</div>
                  <h3 className="mt-1 text-base font-bold text-navy">Electronics &amp; IT</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                    Computing hardware, portable batteries, cyber security, and regional language support on mobile handsets (IS 13252, IS 16046, IS 16333).
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-blue">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue">CED</div>
                  <h3 className="mt-1 text-base font-bold text-navy">Civil Engineering</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                    Structural steel, cement specifications (IS 269), reinforced concrete, building safety codes, and National Building Code (NBC).
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-blue">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue">FAD</div>
                  <h3 className="mt-1 text-base font-bold text-navy">Food &amp; Agriculture</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                    Packaged drinking water (IS 14543), natural mineral water (IS 13428), infant milk formulations (IS 1165), and food safety testing protocols.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-blue">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue">MED</div>
                  <h3 className="mt-1 text-base font-bold text-navy">Mechanical Engineering</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                    Domestic pressure cookers (IS 2347), gas cylinders, domestic pumps, and industrial manufacturing machinery.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-blue">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue">TED</div>
                  <h3 className="mt-1 text-base font-bold text-navy">Transport &amp; Safety</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                    Protective two-wheeler headgear (IS 4151), industrial safety helmets (IS 2925), automotive safety components, and EV charging interfaces.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface-alt p-4">
                <div className="text-xs text-ink-soft">
                  Want to explore indexed Gazette standards or search technical clauses?
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/standards"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue"
                  >
                    <span>Browse All Standards</span>
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/search"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-4 py-2 text-xs font-semibold text-ink-soft transition-colors hover:text-blue"
                  >
                    <SearchIcon className="h-3.5 w-3.5" />
                    <span>Search with AI</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 2. CERTIFICATION MODAL */}
          {activeModal === "certification" && (
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-md bg-blue/10 px-2.5 py-1 text-xs font-bold text-blue">
                  <BadgeCheckIcon className="h-3.5 w-3.5" />
                  <span>CONFORMITY ASSESSMENT SCHEMES</span>
                </div>
                <h2 className="mt-2.5 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
                  Official BIS Conformity Assessment Schemes
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">
                  BIS operates formal certification schemes defined under the <strong>BIS (Conformity Assessment) Regulations, 2018</strong> to ensure consumer safety and product reliability.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-surface p-5">
                  <div className="inline-block rounded bg-blue/10 px-2 py-0.5 text-xs font-bold text-blue">
                    Scheme-I
                  </div>
                  <h3 className="mt-2 text-base font-bold text-navy">ISI Mark Certification</h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    Requires comprehensive factory audit, in-house laboratory testing setup, and continuous third-party market surveillance.
                  </p>
                  <div className="mt-3 border-t border-border pt-2 text-xs font-medium text-ink">
                    Mandatory for: Cement, structural steel, helmets, pressure cookers, and domestic electricals.
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-5">
                  <div className="inline-block rounded bg-blue/10 px-2 py-0.5 text-xs font-bold text-blue">
                    Scheme-II
                  </div>
                  <h3 className="mt-2 text-base font-bold text-navy">Compulsory Registration Scheme (CRS)</h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    Self-Declaration of Conformity (SDoC) based on safety test reports issued by BIS-recognized NABL laboratories.
                  </p>
                  <div className="mt-3 border-t border-border pt-2 text-xs font-medium text-ink">
                    Mandatory for: Laptops, mobile phones, power banks, LED lamps, and solar PV modules.
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-5">
                  <div className="inline-block rounded bg-blue/10 px-2 py-0.5 text-xs font-bold text-blue">
                    Scheme-IV / FMCS
                  </div>
                  <h3 className="mt-2 text-base font-bold text-navy">Foreign Manufacturers Certification</h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    Grants ISI mark licenses to overseas manufacturing plants exporting regulated goods to India after on-site plant verification.
                  </p>
                  <div className="mt-3 border-t border-border pt-2 text-xs font-medium text-ink">
                    Requires: Factory inspection abroad, Indian resident agent, and local testing verification.
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-5">
                  <div className="inline-block rounded bg-blue/10 px-2 py-0.5 text-xs font-bold text-blue">
                    Hallmarking Scheme
                  </div>
                  <h3 className="mt-2 text-base font-bold text-navy">Gold &amp; Silver Hallmarking (AHC &amp; HUID)</h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    Mandatory 6-digit alphanumeric Hallmark Unique Identification (HUID) laser marking through accredited Assaying and Hallmarking Centres.
                  </p>
                  <div className="mt-3 border-t border-border pt-2 text-xs font-medium text-ink">
                    Covers: 14K, 18K, 20K, 22K, 23K, and 24K gold articles with 100% consumer traceability.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface-alt p-4">
                <div className="text-xs text-ink-soft">
                  Need to check which certification route applies to your product?
                </div>
                <Link
                  href="/about#schemes"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue"
                >
                  <span>Explore All Schemes</span>
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* 3. TESTING MODAL */}
          {activeModal === "testing" && (
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-md bg-blue/10 px-2.5 py-1 text-xs font-bold text-blue">
                  <FlaskIcon className="h-3.5 w-3.5" />
                  <span>DIAGNOSTICS &amp; LAB NETWORK</span>
                </div>
                <h2 className="mt-2.5 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
                  BIS Central Laboratory Network &amp; Diagnostics
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">
                  BIS maintains world-class laboratory infrastructure and diagnostic facilities to verify product conformity against rigorous technical tolerances.
                </p>
              </div>

              {/* Lab Locations */}
              <div className="rounded-xl border border-border bg-surface p-5">
                <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
                  Laboratory Network Overview
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs text-ink-soft">
                  <div className="rounded-lg bg-surface-raised p-3 border border-border">
                    <span className="font-bold text-navy block">Central Laboratory (CL)</span>
                    <span>Sahibabad (Ghaziabad, Uttar Pradesh) — Apex Testing Hub</span>
                  </div>
                  <div className="rounded-lg bg-surface-raised p-3 border border-border">
                    <span className="font-bold text-navy block">Western Regional Lab</span>
                    <span>Mumbai (Andheri East, Maharashtra)</span>
                  </div>
                  <div className="rounded-lg bg-surface-raised p-3 border border-border">
                    <span className="font-bold text-navy block">Southern Regional Lab</span>
                    <span>Chennai (CIT Campus, Taramani, Tamil Nadu)</span>
                  </div>
                  <div className="rounded-lg bg-surface-raised p-3 border border-border">
                    <span className="font-bold text-navy block">Eastern Regional Lab</span>
                    <span>Kolkata (Salt Lake, West Bengal)</span>
                  </div>
                  <div className="rounded-lg bg-surface-raised p-3 border border-border">
                    <span className="font-bold text-navy block">Northern Regional Lab</span>
                    <span>Chandigarh (Industrial Area Phase-I)</span>
                  </div>
                  <div className="rounded-lg bg-surface-raised p-3 border border-border">
                    <span className="font-bold text-navy block">Southern Branch Lab</span>
                    <span>Bengaluru (Peenya Industrial Area, Karnataka)</span>
                  </div>
                </div>
              </div>

              {/* Core Testing Protocols */}
              <div>
                <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
                  Core Testing Protocols &amp; Diagnostics
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⚡</span>
                      <h4 className="text-sm font-bold text-navy">Electrical Breakdown &amp; Dielectric</h4>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                      Up to 5000V AC insulation breakdown, leakage current measurements, and high-voltage earth continuity tests for household and IT electronics.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🔨</span>
                      <h4 className="text-sm font-bold text-navy">Mechanical &amp; Impact Attenuation</h4>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                      Drop tower acceleration testing (g-force measurement for IS 4151 helmets), hydrostatic bursting pressure (IS 2347), and tensile yield assessments.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🧪</span>
                      <h4 className="text-sm font-bold text-navy">Spectrometry &amp; Chemical Assay</h4>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                      Fire assay cupellation for precious metals, XRF elemental screening, atomic absorption spectrometry, and heavy metal chromatography.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-base">💻</span>
                      <h4 className="text-sm font-bold text-navy">LIMS Digital Integration</h4>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                      Real-time digital test sample tracking, barcoded verification, and automated NABL-accredited reporting via the BIS Laboratory Information Management System.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. RESOURCES MODAL */}
          {activeModal === "resources" && (
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-md bg-blue/10 px-2.5 py-1 text-xs font-bold text-blue">
                  <DocumentIcon className="h-3.5 w-3.5" />
                  <span>REGULATORY GAZETTES &amp; MSME SUPPORT</span>
                </div>
                <h2 className="mt-2.5 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
                  Official Gazette Quality Control Orders (QCOs) &amp; MSME Incentives
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">
                  Authoritative policy instruments, legal gazette circulars, and government incentives empowering micro, small, and medium enterprises.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-surface p-5">
                  <div className="text-2xl">📜</div>
                  <h3 className="mt-2 text-base font-bold text-navy">Mandatory Gazette QCOs</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                    Published under the BIS Act, 2016 by <strong>DPIIT, MeitY, MoRTH, and Ministry of Steel</strong> to enforce non-negotiable safety benchmarks across Indian manufacturing and imports.
                  </p>
                  <a
                    href="https://www.bis.gov.in/product-certification/products-under-compulsory-certification/?lang=en"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue hover:underline"
                  >
                    <span>Official Gazette QCO Directory</span>
                    <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                </div>

                <div className="rounded-xl border border-border bg-surface p-5">
                  <div className="text-2xl">🚀</div>
                  <h3 className="mt-2 text-base font-bold text-navy">MSME &amp; Startup Concessions</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                    <strong>80% fee concession</strong> on application and licensing fees for micro-enterprises, women entrepreneurs, and DPIIT-recognized startups to foster inclusive industrial growth.
                  </p>
                  <Link
                    href="/about#significance"
                    onClick={onClose}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue hover:underline"
                  >
                    <span>Learn About MSME Benefits</span>
                    <ArrowRightIcon className="h-3 w-3" />
                  </Link>
                </div>

                <div className="rounded-xl border border-border bg-surface p-5">
                  <div className="text-2xl">📋</div>
                  <h3 className="mt-2 text-base font-bold text-navy">Scheme of Testing (STI)</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                    Prescribes factory quality control checklists, routine in-house sampling frequencies, and maintenance of test records before product dispatch.
                  </p>
                  <Link
                    href="/standards"
                    onClick={onClose}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue hover:underline"
                  >
                    <span>View Product Manuals</span>
                    <ArrowRightIcon className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 5. E-SERVICES MODAL */}
          {activeModal === "eservices" && (
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-md bg-blue/10 px-2.5 py-1 text-xs font-bold text-blue">
                  <GlobeIcon className="h-3.5 w-3.5" />
                  <span>CITIZEN UTILITIES &amp; DIGITAL PORTALS</span>
                </div>
                <h2 className="mt-2.5 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
                  Official BIS Digital Portals &amp; Citizen Utilities
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">
                  Single-window digital public infrastructure for standard purchases, license applications, and real-time consumer verification.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <a
                  href="https://www.manakonline.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-xl border border-border bg-surface p-5 transition-all hover:border-blue hover:shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <span className="rounded bg-blue/10 px-2 py-0.5 text-xs font-bold text-blue">
                      manakonline.in
                    </span>
                    <ExternalLinkIcon className="h-4 w-4 text-ink-faint group-hover:text-blue" />
                  </div>
                  <h3 className="mt-3 text-base font-bold text-navy group-hover:text-blue">
                    Manakonline Portal
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                    Comprehensive digital platform for standard formulation, e-sale of IS codes, and Scheme-I ISI online license tracking and renewal.
                  </p>
                </a>

                <a
                  href="https://www.crsbis.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-xl border border-border bg-surface p-5 transition-all hover:border-blue hover:shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <span className="rounded bg-blue/10 px-2 py-0.5 text-xs font-bold text-blue">
                      crsbis.in
                    </span>
                    <ExternalLinkIcon className="h-4 w-4 text-ink-faint group-hover:text-blue" />
                  </div>
                  <h3 className="mt-3 text-base font-bold text-navy group-hover:text-blue">
                    CRS Portal (Scheme-II)
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                    Electronic self-declaration registration and test report submissions for electronics, IT hardware, and solar photovoltaic products.
                  </p>
                </a>

                <a
                  href="https://www.bis.gov.in/bis-apps/?lang=hi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-xl border border-border bg-surface p-5 transition-all hover:border-blue hover:shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <span className="rounded bg-blue/10 px-2 py-0.5 text-xs font-bold text-blue">
                      Official Mobile App
                    </span>
                    <ExternalLinkIcon className="h-4 w-4 text-ink-faint group-hover:text-blue" />
                  </div>
                  <h3 className="mt-3 text-base font-bold text-navy group-hover:text-blue">
                    BIS CARE Mobile App (Android / iOS)
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                    Official mobile utility for citizens to verify ISI license numbers, check jeweller HUID authenticity, and register consumer grievances.
                  </p>
                </a>

                <a
                  href="https://www.bis.gov.in/product-certification/products-under-compulsory-certification/?lang=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-xl border border-border bg-surface p-5 transition-all hover:border-blue hover:shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <span className="rounded bg-blue/10 px-2 py-0.5 text-xs font-bold text-blue">
                      bis.gov.in
                    </span>
                    <ExternalLinkIcon className="h-4 w-4 text-ink-faint group-hover:text-blue" />
                  </div>
                  <h3 className="mt-3 text-base font-bold text-navy group-hover:text-blue">
                    e-BIS Standards &amp; Quality Directory
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                    Official national repository to discover, verify, and access Gazette-notified Indian Standards and products under compulsory certification.
                  </p>
                </a>
              </div>
            </div>
          )}

          {/* 6. CONTACT US MODAL */}
          {activeModal === "contact" && (
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-md bg-blue/10 px-2.5 py-1 text-xs font-bold text-blue">
                  <ShieldCheckIcon className="h-3.5 w-3.5" />
                  <span>HEADQUARTERS &amp; GRIEVANCE PORTAL</span>
                </div>
                <h2 className="mt-2.5 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
                  Bureau of Indian Standards — Headquarters &amp; Support
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">
                  Connect with BIS national offices, administrative secretariats, and consumer grievance channels.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-surface p-5">
                  <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
                    National Headquarters
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    Manak Bhavan
                  </p>
                  <p className="text-xs leading-relaxed text-ink-soft">
                    9 Bahadur Shah Zafar Marg, New Delhi – 110002, India.
                  </p>

                  <div className="mt-4 space-y-1.5 border-t border-border pt-3 text-xs">
                    <div className="text-ink-soft">
                      <span className="font-bold text-navy">Helplines:</span> +91-11-23230131 / 23231842 / 23233375
                    </div>
                    <div className="text-ink-soft">
                      <span className="font-bold text-navy">EPABX:</span> +91-11-23230131 (Ext. 401/402)
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-5">
                  <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
                    Official Inquiries &amp; Support
                  </h3>
                  <ul className="mt-3 space-y-2 text-xs">
                    <li className="flex items-center justify-between border-b border-border pb-1.5">
                      <span className="text-ink-soft">General Information:</span>
                      <a href="mailto:info@bis.gov.in" className="font-mono font-bold text-blue hover:underline">
                        info@bis.gov.in
                      </a>
                    </li>
                    <li className="flex items-center justify-between border-b border-border pb-1.5">
                      <span className="text-ink-soft">Product Registration:</span>
                      <a href="mailto:registration@bis.org.in" className="font-mono font-bold text-blue hover:underline">
                        registration@bis.org.in
                      </a>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-ink-soft">Management Systems:</span>
                      <a href="mailto:mscd@bis.gov.in" className="font-mono font-bold text-blue hover:underline">
                        mscd@bis.gov.in
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Public Grievance CPGRAMS Card */}
              <div className="rounded-xl border border-border bg-surface-alt p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="inline-block rounded bg-navy text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                      Citizen Redressal
                    </span>
                    <h3 className="mt-1.5 text-base font-bold text-navy">
                      Public Grievance Redressal (CPGRAMS)
                    </h3>
                    <p className="mt-1 text-xs text-ink-soft">
                      Direct integration with the Centralized Public Grievance Redress and Monitoring System for consumer compliance, misuse of standard mark, and counterfeit complaints.
                    </p>
                  </div>
                  <a
                    href="https://pgportal.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-navy"
                  >
                    <span>Lodge Grievance</span>
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

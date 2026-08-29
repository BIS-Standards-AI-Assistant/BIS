"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AshokaChakra } from "@/components/ui/AshokaChakra";
import { BisLogo } from "@/components/ui/BisLogo";
import {
  ShieldCheckIcon,
  BadgeCheckIcon,
  FlaskIcon,
  DocumentIcon,
  CalendarIcon,
  ExternalLinkIcon,
  GlobeIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from "@/components/ui/icons";

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState<string>("overview");

  const timelineEvents = [
    {
      year: "1947",
      title: "Foundation of ISI (6 January 1947)",
      desc: "Registered under the Societies Registration Act, 1860 as the Indian Standards Institution (ISI) with the mandate to build industrial self-reliance and establish technical quality benchmarks for independent India.",
      tag: "Establishment",
    },
    {
      year: "1952",
      title: "ISI Certification Marks Act",
      desc: "Enacted by Parliament to grant authority for certifying conformity to Indian Standards, empowering industries to display the certification symbol.",
      tag: "Legislation",
    },
    {
      year: "1955",
      title: "Launch of the Iconic ISI Mark",
      desc: "The ISI Mark was officially introduced, becoming India's most recognized hallmark for product safety, reliability, and consumer protection.",
      tag: "Milestone",
    },
    {
      year: "1986",
      title: "Bureau of Indian Standards Act (Act 63 of 1986)",
      desc: "Reconstituted the Indian Standards Institution as the Bureau of Indian Standards (BIS) on 1 April 1987, granting statutory status as the National Standards Body of India.",
      tag: "Statutory Body",
    },
    {
      year: "2000",
      title: "Gold Hallmarking Scheme Launched",
      desc: "Voluntary Hallmarking of gold jewellery was introduced to protect consumers against adulteration and guarantee declared fineness.",
      tag: "Consumer Protection",
    },
    {
      year: "2016",
      title: "Modern BIS Act, 2016 (Act No. 11 of 2016)",
      desc: "Came into force on 12 October 2017. Modernized regulatory powers, introduced mandatory Quality Control Orders (QCOs), simplified conformity assessment, and strengthened legal penalties for counterfeits.",
      tag: "Modern Act",
    },
    {
      year: "2021+",
      title: "Mandatory 6-Digit HUID Laser Hallmarking",
      desc: "Implemented mandatory digital Hallmark Unique Identification (HUID) on gold jewellery, enabling citizens to verify purity and authenticity via the BIS CARE App.",
      tag: "Digital Governance",
    },
  ];

  const corePillars = [
    {
      title: "Standards Formulation",
      desc: "Formulates Indian Standards across 15 technical divisions, covering engineering, chemicals, food, IT, textiles, electro-technology, and emerging green energy sectors.",
      stat: "22,000+",
      statLabel: "Active Standards",
      icon: DocumentIcon,
    },
    {
      title: "Product Certification (ISI Mark)",
      desc: "Operates Scheme-I (Product Certification) ensuring products comply through factory inspection audits and third-party laboratory testing.",
      stat: "41,000+",
      statLabel: "Active Licences",
      icon: BadgeCheckIcon,
    },
    {
      title: "Compulsory Registration (CRS)",
      desc: "Scheme-II covering electronic & IT goods based on self-declaration backed by test reports from BIS-recognized labs (under MeitY & BIS mandates).",
      stat: "100+",
      statLabel: "Electronic Categories",
      icon: ShieldCheckIcon,
    },
    {
      title: "Hallmarking & HUID",
      desc: "Guarantees purity of gold and silver articles through third-party Assaying & Hallmarking Centres (AHCs) and laser-engraved 6-digit HUID.",
      stat: "1,500+",
      statLabel: "Assaying Centres",
      icon: CheckCircleIcon,
    },
    {
      title: "Laboratory Network",
      desc: "Operates a state-of-the-art testing infrastructure including Central Laboratory Sahibabad, 4 Regional Labs, 3 Branch Labs, and 200+ recognized labs.",
      stat: "8+",
      statLabel: "Dedicated BIS Labs",
      icon: FlaskIcon,
    },
    {
      title: "International Collaboration",
      desc: "Represents India as a founding member of the International Organization for Standardization (ISO) and the International Electrotechnical Commission (IEC).",
      stat: "Global",
      statLabel: "ISO & IEC Member",
      icon: GlobeIcon,
    },
  ];

  const regionalOffices = [
    {
      name: "Central Laboratory & HQ",
      location: "Manak Bhavan, New Delhi / Sahibabad",
      area: "National Headquarters, Apex Testing, Policy & International Secretariat",
      contact: "info@bis.gov.in | 011-23230131",
    },
    {
      name: "Northern Regional Office (NRO)",
      location: "Chandigarh",
      area: "Punjab, Haryana, Himachal Pradesh, Jammu & Kashmir, Ladakh, UT Chandigarh",
      contact: "nro@bis.gov.in",
    },
    {
      name: "Western Regional Office (WRO)",
      location: "Mumbai (Andheri East)",
      area: "Maharashtra, Gujarat, Goa, Madhya Pradesh, Daman & Diu, Dadra & Nagar Haveli",
      contact: "wro@bis.gov.in",
    },
    {
      name: "Eastern Regional Office (ERO)",
      location: "Kolkata (Salt Lake)",
      area: "West Bengal, Bihar, Jharkhand, Odisha, Assam & North-Eastern States",
      contact: "ero@bis.gov.in",
    },
    {
      name: "Southern Regional Office (SRO)",
      location: "Chennai (CIT Campus, Taramani)",
      area: "Tamil Nadu, Karnataka, Kerala, Andhra Pradesh, Telangana, Puducherry",
      contact: "sro@bis.gov.in",
    },
    {
      name: "Central Regional Office (CRO)",
      location: "New Delhi",
      area: "Delhi NCR, Uttar Pradesh, Uttarakhand, Rajasthan",
      contact: "cro@bis.gov.in",
    },
  ];

  const digitalTools = [
    {
      title: "BIS CARE Mobile App",
      desc: "Verify ISI Mark licence numbers, CRS registration details, and 6-digit HUID gold hallmarking authenticity. File complaints directly to BIS vigilance.",
      link: "https://www.bis.gov.in/bis-apps/?lang=hi",
      tag: "Consumer App",
    },
    {
      title: "Manakonline Portal",
      desc: "Single-window digital platform for e-services: product certification applications, laboratory testing requests, hallmarking centre licensing, and standard comments.",
      link: "https://www.manakonline.in",
      tag: "e-Services",
    },
    {
      title: "Standards & Quality Directory",
      desc: "Authoritative digital portal for discovering, verifying, and downloading Gazette-notified Indian Standards and products under compulsory certification.",
      link: "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/?lang=en",
      tag: "Official Portal",
    },
    {
      title: "Know Your Standard (KYS)",
      desc: "Free public discovery tool providing access to simplified product manuals, test methods, and Gazette Quality Control Orders (QCOs).",
      link: "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/?lang=en",
      tag: "Public Access",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-b border-border bg-gradient-to-b from-surface-alt to-surface-raised px-6 py-12 lg:py-16">
          <div className="mx-auto max-w-[1380px]">
            <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-navy">
                  <AshokaChakra className="h-4 w-4" />
                  <span>Ministry of Consumer Affairs, Food & Public Distribution</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl lg:text-5xl">
                  About Bureau of Indian Standards
                </h1>
                <p className="text-lg font-medium text-ink-soft sm:text-xl">
                  The National Standards Body of India — Safeguarding Consumer Welfare, Industrial Quality, and National Benchmarks since 1947.
                </p>
                <p className="text-sm leading-relaxed text-ink-faint sm:text-base">
                  Established under the statutory authority of the <strong>Bureau of Indian Standards Act, 2016</strong>, BIS operates harmonious standard formulation, product quality marking (ISI Mark), Compulsory Registration (CRS), and gold Hallmarking across India.
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-center rounded-2xl border border-border bg-surface-raised p-6 shadow-sm">
                <BisLogo className="h-20 w-20 text-navy" />
                <span className="mt-3 text-sm font-bold text-navy">मानक: पथप्रदर्शक:</span>
                <span className="text-xs text-ink-faint">&ldquo;Standards Guide the Path&rdquo;</span>
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-surface-alt px-3 py-1.5 text-xs font-medium text-blue">
                  <CheckCircleIcon className="h-4 w-4 text-success" />
                  <span>Statutory National Body</span>
                </div>
              </div>
            </div>

            {/* Quick Anchor Navigation */}
            <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
              {[
                { id: "overview", label: "Overview & Mandate" },
                { id: "origin", label: "Origin & History (1947–2016)" },
                { id: "acts", label: "BIS Acts & Powers" },
                { id: "schemes", label: "Certification Schemes" },
                { id: "significance", label: "National Significance" },
                { id: "directory", label: "Directory & Regional Labs" },
                { id: "apps", label: "Digital Apps & Portals" },
              ].map((tab) => (
                <a
                  key={tab.id}
                  href={`#${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors sm:text-sm ${
                    activeTab === tab.id
                      ? "bg-navy text-white shadow-sm"
                      : "border border-border bg-surface-raised text-ink-soft hover:bg-surface-alt hover:text-blue"
                  }`}
                >
                  {tab.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Content Container */}
        <div className="mx-auto max-w-[1380px] space-y-16 px-6 py-12">
          {/* Section 1: Overview & What is BIS */}
          <section id="overview" className="scroll-mt-24">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue">
                  <ShieldCheckIcon className="h-4 w-4" />
                  <span>National Mandate</span>
                </div>
                <h2 className="text-2xl font-bold text-navy sm:text-3xl">
                  What is BIS and Why does it exist?
                </h2>
                <p className="text-base leading-relaxed text-ink">
                  The <strong>Bureau of Indian Standards (BIS)</strong> is the National Standards Body of India, operating under the aegis of the <strong>Ministry of Consumer Affairs, Food & Public Distribution</strong>, Government of India.
                </p>
                <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
                  In India, manufactured and imported goods—from infant milk, helmets, pressure cookers, and solar inverters to steel rebar—must satisfy stringent quality, safety, and health benchmarks. BIS was created to eliminate sub-standard, hazardous products, protect public health, and give Indian industry world-class competitiveness through standardized manufacturing specifications.
                </p>

                <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-surface-raised p-4">
                    <h3 className="text-sm font-bold text-navy">For Consumers</h3>
                    <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                      Guarantees product safety, protects from hazardous counterfeits (*Manak Se Suraksha*), and ensures gold purity via 6-digit HUID.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-raised p-4">
                    <h3 className="text-sm font-bold text-navy">For Manufacturers & MSMEs</h3>
                    <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                      Provides standardized blueprints, technical testing criteria, and global acceptance for the &ldquo;Make in India&rdquo; initiative.
                    </p>
                  </div>
                </div>
              </div>

              {/* Core Pillars Cards */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {corePillars.slice(0, 4).map((pillar, i) => {
                  const Icon = pillar.icon;
                  return (
                    <div key={i} className="rounded-xl border border-border bg-surface-raised p-4 shadow-sm">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-alt text-blue">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="mt-3 text-lg font-bold text-navy">{pillar.stat}</div>
                      <div className="text-xs font-semibold text-ink-faint">{pillar.statLabel}</div>
                      <div className="mt-1 text-xs font-medium text-ink">{pillar.title}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Section 2: Origin & Historical Timeline */}
          <section id="origin" className="scroll-mt-24 rounded-2xl border border-border bg-surface-raised p-8 shadow-sm">
            <div className="max-w-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue">
                <CalendarIcon className="h-4 w-4" />
                <span>Historical Evolution</span>
              </div>
              <h2 className="text-2xl font-bold text-navy sm:text-3xl">
                Origin of BIS: From ISI (1947) to Modern BIS
              </h2>
              <p className="text-sm text-ink-soft sm:text-base">
                Explore the 75+ year journey of standardization in independent India.
              </p>
            </div>

            <div className="relative mt-10 space-y-6 before:absolute before:bottom-0 before:left-4 before:top-3 before:w-0.5 before:bg-border sm:before:left-6">
              {timelineEvents.map((evt, i) => (
                <div key={i} className="relative flex items-start gap-4 pl-10 sm:gap-6 sm:pl-14">
                  <div className="absolute left-2.5 top-1.5 flex h-3.5 w-3.5 -translate-x-1/2 items-center justify-center rounded-full border-2 border-surface-raised bg-blue ring-4 ring-surface-alt sm:left-4.5" />
                  <div className="flex-1 rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-blue">{evt.year}</span>
                        <h3 className="text-base font-bold text-navy">{evt.title}</h3>
                      </div>
                      <span className="rounded-full bg-surface-alt px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
                        {evt.tag}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-ink-soft sm:text-sm">
                      {evt.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: BIS Acts & Regulatory Powers */}
          <section id="acts" className="scroll-mt-24">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue">
                <DocumentIcon className="h-4 w-4" />
                <span>Legal Framework</span>
              </div>
              <h2 className="text-2xl font-bold text-navy sm:text-3xl">
                Statutory Acts & Quality Control Orders (QCOs)
              </h2>
              <p className="text-sm text-ink-soft sm:text-base">
                How Indian law empowers mandatory compliance for consumer health, safety, and security.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface-raised p-6 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wide text-ink-faint">Principal Legislation</div>
                <h3 className="mt-2 text-lg font-bold text-navy">BIS Act, 2016 (Act 11 of 2016)</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft sm:text-sm">
                  Repealed and replaced the 1986 Act. Established BIS as the National Standards Body of India with wider powers to notify mandatory standards for goods, services, systems, and processes.
                </p>
                <ul className="mt-4 space-y-1.5 text-xs text-ink-soft">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue" />
                    <span>Empowers Central Govt to issue mandatory QCOs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue" />
                    <span>Recall of non-conforming products & penal compensation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue" />
                    <span>Strict penalties for misuse of standard marks</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-surface-raised p-6 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wide text-ink-faint">Executive Orders</div>
                <h3 className="mt-2 text-lg font-bold text-navy">Quality Control Orders (QCOs)</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft sm:text-sm">
                  Issued by central ministries (DPIIT, MeitY, MoRTH, MoPNG, Steel Ministry) under Section 16 of the BIS Act. Makes BIS certification mandatory before manufacturing, importing, or selling in India.
                </p>
                <ul className="mt-4 space-y-1.5 text-xs text-ink-soft">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue" />
                    <span>Strict prohibition of non-standard manufacture/import</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue" />
                    <span>Customs clearance tied to valid BIS licence/CRS</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue" />
                    <span>Search, seizure, and legal prosecution for violations</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-surface-raised p-6 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wide text-ink-faint">Standard Rules</div>
                <h3 className="mt-2 text-lg font-bold text-navy">Conformity Assessment Regulations</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft sm:text-sm">
                  BIS (Conformity Assessment) Regulations, 2018 defines the formal schemes for licensing, auditing, testing protocols, factory surveillance, and market sample verifications.
                </p>
                <ul className="mt-4 space-y-1.5 text-xs text-ink-soft">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue" />
                    <span>Scheme I (ISI Mark Certification)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue" />
                    <span>Scheme II (Compulsory Registration Scheme - CRS)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue" />
                    <span>Scheme IV (Foreign Manufacturers Scheme - FMCS)</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 4: Certification Schemes */}
          <section id="schemes" className="scroll-mt-24">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue">
                <BadgeCheckIcon className="h-4 w-4" />
                <span>Certification Routes</span>
              </div>
              <h2 className="text-2xl font-bold text-navy sm:text-3xl">
                Major BIS Certification Schemes
              </h2>
              <p className="text-sm text-ink-soft sm:text-base">
                Understanding how different product categories achieve conformity.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-raised p-5">
                <div>
                  <div className="inline-block rounded-md bg-blue/10 px-2.5 py-1 text-xs font-bold text-blue">
                    Scheme-I
                  </div>
                  <h3 className="mt-3 text-base font-bold text-navy">ISI Mark Scheme</h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    Comprehensive scheme involving factory quality management evaluation, initial factory sample testing, and ongoing market surveillance.
                  </p>
                </div>
                <div className="mt-4 border-t border-border pt-3 text-xs text-ink-faint">
                  Examples: Pressure Cookers, Helmets, Cement, Packaged Water.
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-raised p-5">
                <div>
                  <div className="inline-block rounded-md bg-blue/10 px-2.5 py-1 text-xs font-bold text-blue">
                    Scheme-II
                  </div>
                  <h3 className="mt-3 text-base font-bold text-navy">Compulsory Registration (CRS)</h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    Self-declaration of conformity by manufacturers based on safety test reports issued by BIS-recognized laboratories.
                  </p>
                </div>
                <div className="mt-4 border-t border-border pt-3 text-xs text-ink-faint">
                  Examples: Mobile phones, LED lamps, Laptops, Power adapters.
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-raised p-5">
                <div>
                  <div className="inline-block rounded-md bg-blue/10 px-2.5 py-1 text-xs font-bold text-blue">
                    Scheme-IV
                  </div>
                  <h3 className="mt-3 text-base font-bold text-navy">Foreign Manufacturers (FMCS)</h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    Enables overseas manufacturers to obtain BIS licence to use the standard ISI Mark on products exported to India.
                  </p>
                </div>
                <div className="mt-4 border-t border-border pt-3 text-xs text-ink-faint">
                  Requires factory inspection abroad & Indian resident agent.
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-raised p-5">
                <div>
                  <div className="inline-block rounded-md bg-blue/10 px-2.5 py-1 text-xs font-bold text-blue">
                    Hallmarking
                  </div>
                  <h3 className="mt-3 text-base font-bold text-navy">Gold & Silver Hallmarking</h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    Purity verification featuring the BIS Logo, Purity Grade in Karats/Fineness, and 6-digit alphanumeric HUID laser code.
                  </p>
                </div>
                <div className="mt-4 border-t border-border pt-3 text-xs text-ink-faint">
                  Mandatory for 14k, 18k, 20k, 22k, 23k, 24k gold jewelry.
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: National Significance */}
          <section id="significance" className="scroll-mt-24 rounded-2xl border border-border bg-surface-alt p-8">
            <div className="max-w-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue">
                <GlobeIcon className="h-4 w-4" />
                <span>National & Cultural Significance</span>
              </div>
              <h2 className="text-2xl font-bold text-navy sm:text-3xl">
                Pillars of Impact: Building a Quality Conscious Nation
              </h2>
              <p className="text-sm text-ink-soft sm:text-base">
                How BIS standards touch every aspect of life, industry, and governance.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-surface-raised p-5 shadow-sm">
                <div className="text-2xl">🛡️</div>
                <h3 className="mt-3 text-base font-bold text-navy">Consumer Safety</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  <em>&ldquo;Manak Se Suraksha&rdquo;</em> — strict enforcement against substandard items that risk fire, electrocution, or toxic contamination.
                </p>
              </div>

              <div className="rounded-xl bg-surface-raised p-5 shadow-sm">
                <div className="text-2xl">🇮🇳</div>
                <h3 className="mt-3 text-base font-bold text-navy">Make in India & MSMEs</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  Provides micro and small industries with world-class standard specifications, boosting domestic manufacturing and export competitiveness.
                </p>
              </div>

              <div className="rounded-xl bg-surface-raised p-5 shadow-sm">
                <div className="text-2xl">✨</div>
                <h3 className="mt-3 text-base font-bold text-navy">Gold Transparency (HUID)</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  Empowered millions of Indian households by eliminating gold under-caratage through 100% traceable laser hallmarking.
                </p>
              </div>

              <div className="rounded-xl bg-surface-raised p-5 shadow-sm">
                <div className="text-2xl">🗣️</div>
                <h3 className="mt-3 text-base font-bold text-navy">Linguistic Inclusivity</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  Enforces standards like <strong>IS 16333 (Part 3)</strong> across all mobile handsets in India to natively support 22 scheduled Indian languages.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Directory & Laboratory Network */}
          <section id="directory" className="scroll-mt-24">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue">
                <FlaskIcon className="h-4 w-4" />
                <span>Pan-India Presence</span>
              </div>
              <h2 className="text-2xl font-bold text-navy sm:text-3xl">
                Directory: Headquarters, Regional Offices & Labs
              </h2>
              <p className="text-sm text-ink-soft sm:text-base">
                BIS operates across 5 regions, 34+ branch offices, and an extensive laboratory testing network.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {regionalOffices.map((office, i) => (
                <div key={i} className="flex flex-col justify-between rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
                  <div>
                    <span className="inline-block rounded bg-surface-alt px-2 py-0.5 text-[11px] font-bold text-navy">
                      {office.location}
                    </span>
                    <h3 className="mt-2 text-base font-bold text-navy">{office.name}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                      {office.area}
                    </p>
                  </div>
                  <div className="mt-4 border-t border-border pt-3 font-mono text-xs text-blue">
                    {office.contact}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 7: Digital Portals & Apps */}
          <section id="apps" className="scroll-mt-24 rounded-2xl border border-border bg-surface-raised p-8 shadow-sm">
            <div className="max-w-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue">
                <ExternalLinkIcon className="h-4 w-4" />
                <span>Digital Ecosystem</span>
              </div>
              <h2 className="text-2xl font-bold text-navy sm:text-3xl">
                Official Digital Portals & Mobile Apps
              </h2>
              <p className="text-sm text-ink-soft sm:text-base">
                Access official BIS digital public infrastructure for verification, licensing, and purchasing.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {digitalTools.map((tool, i) => (
                <div key={i} className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5">
                  <div>
                    <span className="rounded bg-navy/10 px-2 py-0.5 text-xs font-bold text-navy">
                      {tool.tag}
                    </span>
                    <h3 className="mt-3 text-base font-bold text-navy">{tool.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                      {tool.desc}
                    </p>
                  </div>
                  <a
                    href={tool.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue hover:underline"
                  >
                    <span>Visit Official Portal</span>
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Banner */}
          <section className="rounded-2xl bg-gradient-to-r from-navy-deep to-navy p-8 text-white sm:p-10">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="max-w-2xl space-y-2">
                <h2 className="text-2xl font-bold sm:text-3xl">
                  Need to find a standard for your product?
                </h2>
                <p className="text-sm text-white/80 sm:text-base">
                  Use our AI-powered BIS Standards Navigator to discover applicable IS codes, mandatory QCOs, testing parameters, and certification pathways.
                </p>
              </div>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-bold text-navy transition-transform hover:scale-105"
              >
                <span>Search Standards</span>
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

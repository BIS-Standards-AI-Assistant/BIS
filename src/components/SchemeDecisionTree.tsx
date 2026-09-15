"use client";

import { useState, useEffect, useCallback } from "react";
import { ExternalLinkIcon, ShieldCheckIcon, CloseIcon } from "@/components/ui/icons";

export type ManufacturingOrigin = "domestic" | "foreign";
export type ProductCategory = "electronics" | "jewellery" | "industrial" | "unregulated";
export type LabCapability = "in_house" | "third_party";

export interface SchemeResult {
  id: string;
  badge: string;
  title: string;
  routeSummary: string;
  scopeSummary: string;
  msmeBenefit: string;
  portalName: string;
  portalUrl: string;
  badgeColorClass: string;
}

export const SCHEME_RESULTS: Record<string, SchemeResult> = {
  fmcs: {
    id: "fmcs",
    badge: "Scheme-IV (FMCS)",
    title: "Foreign Manufacturers Certification Scheme (FMCS) — ISI Mark",
    routeSummary: "Nominated Authorized Indian Representative (AIR) + Mandatory BIS Factory Audit Abroad + Independent Sample Testing in BIS-Recognized Labs in India.",
    scopeSummary: "Mandatory for foreign manufacturing units exporting goods covered under Quality Control Orders (QCOs) to India. The factory premises outside India are audited by BIS inspecting officers before the Standard Mark licence is granted.",
    msmeBenefit: "Foreign manufacturers do not qualify for domestic MSME concessions, but may utilize SAARC bilateral concessions or streamlined multi-unit documentation where applicable.",
    portalName: "Manakonline (FMCS Portal)",
    portalUrl: "https://www.manakonline.in",
    badgeColorClass: "bg-blue/15 text-blue border-blue/30 dark:bg-blue/20 dark:text-blue dark:border-blue/40",
  },
  crs: {
    id: "crs",
    badge: "Scheme-II (CRS)",
    title: "Compulsory Registration Scheme (CRS) — Self-Declaration of Conformity",
    routeSummary: "Self-Declaration of Conformity (SDoC) based on formal test reports from BIS-recognized/NABL-accredited domestic test laboratories. No initial factory inspection required prior to grant.",
    scopeSummary: "Administered under MeitY & MNRE notifications covering electronics, IT hardware (laptops, mobile phones, tablets), solar PV inverters, and battery storage products.",
    msmeBenefit: "80% concession on application and processing fees for DPIIT-recognized Startups and Micro/Small Enterprises (MSMEs) with valid Udyam registration.",
    portalName: "BIS CRS Portal (crsbis.in)",
    portalUrl: "https://www.crsbis.in",
    badgeColorClass: "bg-orange/15 text-orange border-orange/30 dark:bg-orange/20 dark:text-orange dark:border-orange/40",
  },
  hallmarking: {
    id: "hallmarking",
    badge: "BIS Hallmarking (HUID)",
    title: "Mandatory Hallmarking Scheme — 6-Digit Alphanumeric HUID",
    routeSummary: "One-Time Jeweller Registration with BIS + Assaying & Laser Engraving at BIS-Recognized Assaying & Hallmarking Centres (AHC).",
    scopeSummary: "Mandatory purity certification for 14k, 18k, 20k, 22k, 23k, and 24k gold jewellery and artefacts under IS 1417. Each article is laser-inscribed with a unique HUID verifiable via the BIS Care App.",
    msmeBenefit: "Zero registration fee for micro artisans and small jewellers with an annual turnover of under ₹40 Lakhs. 80% subsidized test and marking charges for artisanal cooperatives.",
    portalName: "Manakonline (Hallmarking Module)",
    portalUrl: "https://www.manakonline.in",
    badgeColorClass: "bg-gold/20 text-gold-ink border-gold/40 dark:bg-gold-soft/30 dark:text-gold dark:border-gold/50",
  },
  scheme_1_standard: {
    id: "scheme_1_standard",
    badge: "Scheme-I (ISI Mark) — Standard Route",
    title: "Scheme-I Product Certification — Standard In-House Testing Route",
    routeSummary: "Preliminary Factory Audit by BIS Technical Officers + Verification of In-House Laboratory against Scheme of Testing & Inspection (STI) + Independent Sample Testing.",
    scopeSummary: "Applicable to industrial goods, structural steel (IS 1786, IS 2062), cement (IS 269, IS 1489), pressure cookers, helmets (IS 4151), and electrical cables covered under mandatory QCOs.",
    msmeBenefit: "80% fee discount for Micro-enterprises and Startups on application, processing, and minimum annual marking fees, lowering initial compliance overhead.",
    portalName: "Manakonline (e-BIS Portal)",
    portalUrl: "https://www.manakonline.in",
    badgeColorClass: "bg-navy/15 text-navy border-navy/30 dark:bg-navy/25 dark:text-navy dark:border-navy/40",
  },
  scheme_1_simplified: {
    id: "scheme_1_simplified",
    badge: "Scheme-I (ISI Mark) — Simplified Fast-Track",
    title: "Scheme-I Simplified Procedure — Fast-Track for MSMEs & Startups",
    routeSummary: "Pre-testing of sample at BIS-approved or NABL-accredited independent laboratory + Document submission with satisfactory test report + Rapid grant of licence within 30 days, followed by verification audit.",
    scopeSummary: "Engineered by BIS specifically to support domestic MSMEs lacking complete in-house testing equipment. Allows licence issuance on the basis of third-party NABL test reports, with deferred factory inspection.",
    msmeBenefit: "80% fee discount on application & marking fees for Micro-enterprises and Startups (50% for Small Enterprises). MSMEs are permitted to utilize cluster testing centers or recognized external labs.",
    portalName: "Manakonline (Simplified Scheme-I)",
    portalUrl: "https://www.manakonline.in",
    badgeColorClass: "bg-success/15 text-success border-success/30 dark:bg-success/20 dark:text-success dark:border-success/40",
  },
  voluntary: {
    id: "voluntary",
    badge: "Voluntary Certification / No QCO",
    title: "Voluntary Standard Compliance — ISI Mark Optional",
    routeSummary: "Voluntary application for Scheme-I ISI Mark licence to demonstrate superior quality, or self-conformity to applicable Indian Standards for commercial tenders.",
    scopeSummary: "No compulsory Quality Control Order (QCO) currently prohibits manufacturing or marketing without a BIS licence for these products. Certification remains voluntary but grants GeM portal preference and consumer trust.",
    msmeBenefit: "80% fee discount for Micro-enterprises and Startups applies if choosing voluntary Scheme-I certification. Also eligible for Central Government ZED (Zero Defect Zero Effect) scheme subsidies.",
    portalName: "Manakonline (Voluntary Application)",
    portalUrl: "https://www.manakonline.in",
    badgeColorClass: "bg-surface-sunken text-ink-soft border-border-strong dark:bg-surface-alt dark:text-ink-soft dark:border-border",
  },
};

export interface SchemeDecisionTreeProps {
  mode?: "inline" | "modal";
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export function SchemeDecisionTree({
  mode = "inline",
  isOpen = true,
  onClose,
  className = "",
}: SchemeDecisionTreeProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [origin, setOrigin] = useState<ManufacturingOrigin | null>(null);
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [labCapability, setLabCapability] = useState<LabCapability | null>(null);
  const [result, setResult] = useState<SchemeResult | null>(null);

  // Close modal on Escape
  useEffect(() => {
    if (mode !== "modal" || !isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, isOpen, onClose]);

  // Restart wizard
  const handleRestart = useCallback(() => {
    setCurrentStep(1);
    setOrigin(null);
    setCategory(null);
    setLabCapability(null);
    setResult(null);
  }, []);

  // Back button handler
  const handleBack = () => {
    if (result) {
      // Step back from result
      if (origin === "foreign") {
        setResult(null);
        setCurrentStep(1);
      } else if (category === "industrial") {
        setResult(null);
        setCurrentStep(3);
      } else {
        setResult(null);
        setCurrentStep(2);
      }
      return;
    }

    if (currentStep === 3) {
      setLabCapability(null);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCategory(null);
      setCurrentStep(1);
    }
  };

  // Step 1: Manufacturing Origin Selection
  const handleSelectOrigin = (selected: ManufacturingOrigin) => {
    setOrigin(selected);
    if (selected === "foreign") {
      setResult(SCHEME_RESULTS.fmcs);
    } else {
      setCurrentStep(2);
    }
  };

  // Step 2: Category Selection
  const handleSelectCategory = (selected: ProductCategory) => {
    setCategory(selected);
    if (selected === "electronics") {
      setResult(SCHEME_RESULTS.crs);
    } else if (selected === "jewellery") {
      setResult(SCHEME_RESULTS.hallmarking);
    } else if (selected === "unregulated") {
      setResult(SCHEME_RESULTS.voluntary);
    } else if (selected === "industrial") {
      setCurrentStep(3);
    }
  };

  // Step 3: In-House Lab Selection
  const handleSelectLab = (selected: LabCapability) => {
    setLabCapability(selected);
    if (selected === "in_house") {
      setResult(SCHEME_RESULTS.scheme_1_standard);
    } else {
      setResult(SCHEME_RESULTS.scheme_1_simplified);
    }
  };

  if (mode === "modal" && !isOpen) {
    return null;
  }

  // Total steps in the process
  const totalSteps = 3;
  // Progress computation
  const activeStepNumber = result ? totalSteps : currentStep;
  const progressPercent = Math.round((activeStepNumber / totalSteps) * 100);

  const content = (
    <div
      className={`rounded-2xl border border-border-strong/80 bg-surface-raised p-6 sm:p-8 shadow-md transition-all duration-300 ${className}`}
      data-testid="scheme-decision-tree"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-bold text-navy dark:bg-navy/20">
              Interactive Compliance Wizard
            </span>
            <span className="text-xs font-semibold text-ink-faint">
              BIS Act 2016 Conformity
            </span>
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-navy sm:text-2xl">
            Certification Route Finder
          </h2>
        </div>

        {mode === "modal" && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close wizard dialog"
            className="rounded-lg p-2 text-ink-soft hover:bg-surface-alt hover:text-navy transition-colors"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Stepper Progress Bar */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-semibold text-ink-soft mb-2">
          <span>
            {result ? "Result Determined" : `Step ${currentStep} of ${totalSteps}`}
          </span>
          <span className="font-mono text-blue font-bold">
            {result ? "100%" : `${progressPercent}%`}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="h-full bg-gradient-to-r from-navy via-blue to-orange transition-all duration-500 ease-out"
            style={{ width: `${result ? 100 : progressPercent}%` }}
            role="progressbar"
            aria-valuenow={result ? 100 : progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        {/* Step Indicators */}
        <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-ink-faint">
          <span className={currentStep >= 1 ? "font-bold text-navy" : ""}>
            1. Origin
          </span>
          <span className="text-border-strong">•</span>
          <span className={currentStep >= 2 ? "font-bold text-navy" : ""}>
            2. Product Category
          </span>
          <span className="text-border-strong">•</span>
          <span className={currentStep >= 3 || result ? "font-bold text-navy" : ""}>
            3. Testing & Scheme
          </span>
        </div>
      </div>

      {/* Wizard Body */}
      <div className="mt-7 min-h-[320px]">
        {/* RESULT VIEW */}
        {result ? (
          <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6" data-testid="scheme-result-card">
            {/* Top Badge & Title */}
            <div className="rounded-xl border border-border/80 bg-surface-alt/70 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${result.badgeColorClass}`}
                >
                  {result.badge}
                </span>
                <span className="text-xs font-semibold text-ink-faint">
                  Conformity Assessment Scheme
                </span>
              </div>
              <h3 className="mt-3 text-lg sm:text-xl font-extrabold text-navy">
                {result.title}
              </h3>

              {/* Assessment Pathway Trail */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-faint">
                <span className="font-semibold text-ink-soft">Assessment Pathway:</span>
                <span className="rounded bg-surface-raised px-2 py-0.5 border border-border text-ink-soft">
                  {origin === "foreign" ? "Foreign Manufacturing" : "Domestic Manufacturing"}
                </span>
                {category && (
                  <>
                    <span>&rarr;</span>
                    <span className="rounded bg-surface-raised px-2 py-0.5 border border-border text-ink-soft">
                      {category === "electronics"
                        ? "IT & Electronics"
                        : category === "jewellery"
                        ? "Gold/Silver Jewellery"
                        : category === "industrial"
                        ? "Industrial / Mandatory QCO"
                        : "Voluntary / Unregulated"}
                    </span>
                  </>
                )}
                {labCapability && (
                  <>
                    <span>&rarr;</span>
                    <span className="rounded bg-surface-raised px-2 py-0.5 border border-border text-ink-soft">
                      {labCapability === "in_house" ? "In-House Lab" : "MSME Third-Party"}
                    </span>
                  </>
                )}
              </div>

              {/* Route Summary */}
              <div className="mt-4 rounded-lg bg-surface-raised p-4 border border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                  Certification Route Summary
                </h4>
                <p className="mt-1.5 text-sm sm:text-[14.5px] leading-relaxed text-ink font-medium">
                  {result.routeSummary}
                </p>
              </div>

              {/* Regulatory Guidance / Scope Summary */}
              <div className="mt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                  Regulatory Guidance &amp; Scope Summary
                </h4>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-ink-soft">
                  {result.scopeSummary}
                </p>
              </div>

              {/* MSME Benefit / Fee Concession */}
              <div className="mt-4 rounded-lg border border-gold/40 bg-gold-soft/40 dark:bg-gold-soft/20 p-4">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-ink text-white dark:text-gold-soft font-bold text-xs">
                    %
                  </span>
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-gold-ink dark:text-gold">
                      MSME Benefit &amp; Fee Concession (80% Discount)
                    </h5>
                    <p className="mt-1 text-xs leading-relaxed text-ink font-medium">
                      {result.msmeBenefit}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 border-t border-border/80 pt-5">
              <button
                type="button"
                onClick={handleRestart}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-border-strong px-4 py-2.5 text-xs sm:text-sm font-semibold text-ink-soft hover:bg-surface-alt hover:text-navy transition-colors cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Restart Wizard
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3.5 py-2.5 text-xs sm:text-sm font-medium text-ink-soft hover:bg-surface-alt hover:text-navy transition-colors cursor-pointer"
                >
                  &larr; Back
                </button>

                <a
                  href={result.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-navy-deep transition-colors shadow-xs"
                >
                  <span>Apply on {result.portalName}</span>
                  <ExternalLinkIcon className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* STEP QUESTIONS */
          <div className="animate-in fade-in duration-200">
            {/* STEP 1 */}
            {currentStep === 1 && (
              <div className="space-y-5" data-testid="wizard-step-1">
                <div className="border-b border-border pb-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue">
                    Question 1 of 3
                  </p>
                  <h3 className="mt-1 text-lg sm:text-xl font-bold text-navy">
                    Where is your product manufactured?
                  </h3>
                  <p className="mt-1 text-xs text-ink-soft">
                    Select your manufacturing location to determine jurisdictional certification regulations under the BIS Act 2016.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleSelectOrigin("domestic")}
                    className="flex flex-col items-start rounded-xl border border-border-strong/70 bg-surface-alt/40 p-4 text-left transition-all hover:border-navy hover:bg-surface-alt hover:shadow-xs focus:ring-2 focus:ring-navy cursor-pointer group"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy/10 text-navy group-hover:bg-navy group-hover:text-white transition-colors">
                      <ShieldCheckIcon className="h-5 w-5" />
                    </div>
                    <span className="mt-3 text-sm sm:text-base font-bold text-ink group-hover:text-navy">
                      Domestic (Manufactured inside India)
                    </span>
                    <span className="mt-1 text-xs text-ink-soft leading-relaxed">
                      Units located inside Indian territory eligible for domestic Scheme-I (ISI Mark) or Scheme-II (CRS) routes.
                    </span>
                    <span className="mt-3 inline-flex items-center text-xs font-bold text-navy group-hover:underline">
                      Proceed to Category &rarr;
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectOrigin("foreign")}
                    className="flex flex-col items-start rounded-xl border border-border-strong/70 bg-surface-alt/40 p-4 text-left transition-all hover:border-navy hover:bg-surface-alt hover:shadow-xs focus:ring-2 focus:ring-navy cursor-pointer group"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy/10 text-navy group-hover:bg-navy group-hover:text-white transition-colors">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 010 18 14 14 0 010-18z" />
                      </svg>
                    </div>
                    <span className="mt-3 text-sm sm:text-base font-bold text-ink group-hover:text-navy">
                      Foreign (Importing into India)
                    </span>
                    <span className="mt-1 text-xs text-ink-soft leading-relaxed">
                      Manufacturing facilities located overseas intending to export mandatory QCO products to India.
                    </span>
                    <span className="mt-3 inline-flex items-center text-xs font-bold text-navy group-hover:underline">
                      Direct to Scheme-IV (FMCS) &rarr;
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {currentStep === 2 && (
              <div className="space-y-5" data-testid="wizard-step-2">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue">
                      Question 2 of 3
                    </p>
                    <h3 className="mt-1 text-lg sm:text-xl font-bold text-navy">
                      Select Product Category
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-navy cursor-pointer"
                  >
                    &larr; Back to Origin
                  </button>
                </div>
                <p className="text-xs text-ink-soft">
                  Certification requirements differ by sector — electronics, precious metals, industrial goods, or general consumer goods.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleSelectCategory("electronics")}
                    className="flex flex-col items-start rounded-xl border border-border-strong/70 bg-surface-alt/40 p-4 text-left transition-all hover:border-navy hover:bg-surface-alt hover:shadow-xs focus:ring-2 focus:ring-navy cursor-pointer group"
                  >
                    <span className="rounded-full bg-orange/15 px-2.5 py-0.5 text-[11px] font-bold text-orange">
                      MeitY / MNRE Regulated
                    </span>
                    <span className="mt-2 text-sm font-bold text-ink group-hover:text-navy">
                      IT Hardware, Laptops, Mobile Handsets, or Solar PV
                    </span>
                    <span className="mt-1 text-xs text-ink-soft leading-relaxed">
                      Electronic goods, power adapters, smartphones, tablets, LED lighting, and solar modules.
                    </span>
                    <span className="mt-2 text-xs font-bold text-navy group-hover:underline">
                      Route to Scheme-II (CRS) &rarr;
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectCategory("jewellery")}
                    className="flex flex-col items-start rounded-xl border border-border-strong/70 bg-surface-alt/40 p-4 text-left transition-all hover:border-navy hover:bg-surface-alt hover:shadow-xs focus:ring-2 focus:ring-navy cursor-pointer group"
                  >
                    <span className="rounded-full bg-gold/25 px-2.5 py-0.5 text-[11px] font-bold text-gold-ink dark:text-gold">
                      Precious Metals
                    </span>
                    <span className="mt-2 text-sm font-bold text-ink group-hover:text-navy">
                      Gold or Silver Jewellery &amp; Artefacts
                    </span>
                    <span className="mt-1 text-xs text-ink-soft leading-relaxed">
                      Gold and silver jewellery items subject to mandatory purity assaying and HUID marking.
                    </span>
                    <span className="mt-2 text-xs font-bold text-navy group-hover:underline">
                      Route to BIS Hallmarking &rarr;
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectCategory("industrial")}
                    className="flex flex-col items-start rounded-xl border border-border-strong/70 bg-surface-alt/40 p-4 text-left transition-all hover:border-navy hover:bg-surface-alt hover:shadow-xs focus:ring-2 focus:ring-navy cursor-pointer group"
                  >
                    <span className="rounded-full bg-navy/15 px-2.5 py-0.5 text-[11px] font-bold text-navy">
                      Mandatory QCO Industrial
                    </span>
                    <span className="mt-2 text-sm font-bold text-ink group-hover:text-navy">
                      Industrial Products, Pressure Cookers, Helmets, Steel, Cement, or Electrical Appliances
                    </span>
                    <span className="mt-1 text-xs text-ink-soft leading-relaxed">
                      Reinforcement bars, Portland cement, domestic appliances, protective gear, and chemical products.
                    </span>
                    <span className="mt-2 text-xs font-bold text-navy group-hover:underline">
                      Proceed to Lab Check &rarr;
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectCategory("unregulated")}
                    className="flex flex-col items-start rounded-xl border border-border-strong/70 bg-surface-alt/40 p-4 text-left transition-all hover:border-navy hover:bg-surface-alt hover:shadow-xs focus:ring-2 focus:ring-navy cursor-pointer group"
                  >
                    <span className="rounded-full bg-surface-sunken px-2.5 py-0.5 text-[11px] font-bold text-ink-soft">
                      Voluntary Scope
                    </span>
                    <span className="mt-2 text-sm font-bold text-ink group-hover:text-navy">
                      Textiles, Furniture, or General Unregulated Consumer Goods
                    </span>
                    <span className="mt-1 text-xs text-ink-soft leading-relaxed">
                      Apparel, office furniture, non-notified toys, handicrafts, and non-mandatory consumer articles.
                    </span>
                    <span className="mt-2 text-xs font-bold text-navy group-hover:underline">
                      Route to Voluntary Route &rarr;
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {currentStep === 3 && (
              <div className="space-y-5" data-testid="wizard-step-3">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue">
                      Question 3 of 3
                    </p>
                    <h3 className="mt-1 text-lg sm:text-xl font-bold text-navy">
                      Do you have an in-house factory testing laboratory matching BIS STI requirements?
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-navy cursor-pointer"
                  >
                    &larr; Back to Categories
                  </button>
                </div>
                <p className="text-xs text-ink-soft">
                  The Scheme of Testing &amp; Inspection (STI) outlines mandatory factory test benches. MSMEs without in-house equipment can leverage the Simplified Procedure.
                </p>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleSelectLab("in_house")}
                    className="flex flex-col items-start rounded-xl border border-border-strong/70 bg-surface-alt/40 p-4 text-left transition-all hover:border-navy hover:bg-surface-alt hover:shadow-xs focus:ring-2 focus:ring-navy cursor-pointer group"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy/10 text-navy group-hover:bg-navy group-hover:text-white transition-colors">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <span className="mt-3 text-sm sm:text-base font-bold text-ink group-hover:text-navy">
                      Yes, we have full in-house testing equipment
                    </span>
                    <span className="mt-1 text-xs text-ink-soft leading-relaxed">
                      Factory possesses calibrated test apparatus matching standard STI parameters for internal lot verification.
                    </span>
                    <span className="mt-3 inline-flex items-center text-xs font-bold text-navy group-hover:underline">
                      View Scheme-I Standard Procedure &rarr;
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectLab("third_party")}
                    className="flex flex-col items-start rounded-xl border border-border-strong/70 bg-surface-alt/40 p-4 text-left transition-all hover:border-navy hover:bg-surface-alt hover:shadow-xs focus:ring-2 focus:ring-navy cursor-pointer group"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success group-hover:bg-success group-hover:text-white transition-colors">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <span className="mt-3 text-sm sm:text-base font-bold text-ink group-hover:text-navy">
                      No, we are an MSME relying on third-party test reports
                    </span>
                    <span className="mt-1 text-xs text-ink-soft leading-relaxed">
                      Micro, Small, or Medium Enterprise utilizing independent BIS-recognized or NABL-accredited labs.
                    </span>
                    <span className="mt-3 inline-flex items-center text-xs font-bold text-success group-hover:underline">
                      View Simplified Fast-Track for MSMEs &rarr;
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (mode === "modal") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-navy-deep/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-modal-title"
      >
        <div
          className="fixed inset-0"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="relative z-10 w-full max-w-2xl my-auto">
          {content}
        </div>
      </div>
    );
  }

  return content;
}

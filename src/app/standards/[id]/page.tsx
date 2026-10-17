import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { EvidenceExcerpt } from "@/components/evidence/EvidenceExcerpt";
import { findCertificationSchemeForStandard } from "@/lib/certification-schemes";
import { VERIFICATION_STATUS_LABELS } from "@/lib/verification-status";
import { ExternalLinkIcon, SearchIcon, CompareIcon, ChevronRightIcon } from "@/components/ui/icons";
import { getStandardDetail } from "@/lib/standard-detail";

export default async function StandardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const standard = await getStandardDetail(id);
  if (!standard) notFound();

  const scheme = await findCertificationSchemeForStandard(standard.standardNumber);

  const askQuery = encodeURIComponent(`Tell me about ${standard.standardNumber ?? standard.title}`);

  const hasIndexedDocument = standard.chunks.length > 0;
  // A reference-dataset record's passages summarise the dataset's fields;
  // its document text is not indexed, and the page must not say it is.
  const isReferenceRecord = standard.recordSource === "reference_dataset";
  const isMandatory = scheme?.mandatoryQco === true;
  // Without a reference-dataset entry there is no evidence either way, so
  // nothing below may claim "verified", "voluntary" or a scheme
  // (docs/ui/UI_DATA_AND_TRUTH_RULES.md: never fabricate certification
  // requirements; say the information is not verified instead).
  const NOT_VERIFIED = "Not verified";
  const verificationLabel = scheme?.verificationStatus
    ? (VERIFICATION_STATUS_LABELS[scheme.verificationStatus] ?? scheme.verificationStatus)
    : NOT_VERIFIED;
  const regulatoryStatus = !scheme ? NOT_VERIFIED : isMandatory ? "Compulsory / QCO" : "Voluntary Reference";

  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink antialiased">
      <Header />

      <main id="main-content" className="flex-1 pb-16 pt-6">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb & Dossier Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center justify-between border-b border-border/80 pb-3 text-xs">
            <div className="flex items-center gap-2 text-ink-faint">
              <Link href="/" className="font-semibold text-navy hover:underline">
                Home
              </Link>
              <ChevronRightIcon className="h-3 w-3" />
              <Link href="/standards" className="font-semibold text-navy hover:underline">
                Standards Register
              </Link>
              <ChevronRightIcon className="h-3 w-3" />
              <span className="font-mono font-bold text-ink">{standard.standardNumber ?? "Standard Record"}</span>
            </div>

            <Link
              href="/standards"
              className="hidden sm:inline-flex items-center gap-1 font-semibold text-navy hover:underline"
            >
              <span>&larr;</span> Back to Standards
            </Link>
          </nav>

          {/* =======================================================
              EDITORIAL DOSSIER HEADER (Signature Archival Index Bar)
             ======================================================= */}
          <header className="mt-7 border-l-4 border-l-navy pl-5 sm:pl-7">
            {/* Institutional Eyebrow */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[10.5px] font-black uppercase tracking-widest text-navy/90">
                BUREAU OF INDIAN STANDARDS · STANDARDS REGISTER
              </span>
              <span className="text-border-strong" aria-hidden="true">|</span>
              <span className="font-mono text-[10.5px] font-bold text-ink-faint">
                RECORD ID: {standard.id}
              </span>
            </div>

            {/* Standard Number (Authoritative Monospace Display) */}
            <div className="mt-2.5 flex flex-wrap items-baseline gap-3.5">
              <h1 className="font-mono text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-navy-deep dark:text-white">
                {standard.standardNumber ?? "Unnumbered Reference"}
              </h1>
              {standard.version && (
                <span className="font-mono text-base sm:text-lg font-semibold text-ink-soft">
                  (Edition {standard.version})
                </span>
              )}
            </div>

            {/* Standard Title */}
            <p className="mt-2 max-w-4xl text-xl sm:text-2xl font-bold leading-snug text-ink">
              {standard.title}
            </p>

            {/* Restrained Status Stamp */}
            <div className="mt-3.5 flex flex-wrap items-center gap-3 text-xs">
              {scheme ? (
                <div className="inline-flex items-center gap-2 rounded-sm border border-emerald-700/30 bg-emerald-50 px-2.5 py-1 font-mono font-bold uppercase tracking-wider text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-600/40 dark:text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                  <span>{verificationLabel}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-sm border border-border-strong bg-surface-alt px-2.5 py-1 font-mono font-bold uppercase tracking-wider text-ink-soft">
                  <span className="h-2 w-2 rounded-full bg-ink-faint" />
                  <span>Certification status not verified</span>
                </div>
              )}

              {isMandatory && (
                <div className="inline-flex items-center gap-1.5 rounded-sm border border-navy/25 bg-navy/5 px-2.5 py-1 font-mono font-bold uppercase tracking-wider text-navy dark:border-navy/40 dark:text-blue-200">
                  <span>Mandatory QCO Gazetted</span>
                </div>
              )}

              {isReferenceRecord ? (
                <span className="font-mono text-xs font-medium text-amber-750 dark:text-amber-400">
                  ● Reference Record · Document Full Text Not Indexed
                </span>
              ) : hasIndexedDocument ? (
                <span className="font-mono text-xs font-medium text-ink-soft">
                  ● Full-Text Evidence Indexed ({standard.chunks.length} Passages)
                </span>
              ) : (
                <span className="font-mono text-xs font-medium text-amber-750 dark:text-amber-400">
                  ● Technical Record Verified · Document Unindexed
                </span>
              )}
            </div>
          </header>

          {/* =======================================================
              TECHNICAL IDENTITY STRIP / DOCKET TITLE BLOCK
             ======================================================= */}
          <section className="mt-8 border-y-2 border-border-strong bg-surface-raised/80 font-mono">
            <div className="grid grid-cols-2 divide-x divide-y sm:divide-y-0 sm:grid-cols-3 lg:grid-cols-6 divide-border text-xs">
              <div className="p-3.5 sm:p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink-faint">Standard No.</p>
                <p className="mt-1 font-bold text-navy truncate">{standard.standardNumber ?? "N/A"}</p>
              </div>

              <div className="p-3.5 sm:p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink-faint">Category</p>
                <p className="mt-1 font-bold text-ink truncate">
                  {standard.documentType ? standard.documentType.replaceAll("_", " ") : "Technical Standard"}
                </p>
              </div>

              <div className="p-3.5 sm:p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink-faint">Edition Year</p>
                <p className="mt-1 font-bold text-ink">{standard.version || standard.publicationDate || NOT_VERIFIED}</p>
              </div>

              <div className="p-3.5 sm:p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink-faint">Regulatory Status</p>
                <p className="mt-1 font-bold text-ink">{regulatoryStatus}</p>
              </div>

              <div className="p-3.5 sm:p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink-faint">Certification</p>
                <p className="mt-1 font-bold text-ink truncate">{scheme?.scheme ?? NOT_VERIFIED}</p>
              </div>

              <div className="p-3.5 sm:p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink-faint">Issuing Authority</p>
                <p className="mt-1 font-bold text-ink truncate">{standard.sourceOrg}</p>
              </div>
            </div>
          </section>

          {/* =======================================================
              ASYMMETRIC DOSSIER GRID: Main Column (68%) + Record Rail (32%)
             ======================================================= */}
          <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_340px] items-start">
            {/* Left / Primary Dossier Column */}
            <div className="space-y-12">
              {/* 01 / SPECIFICATION SCOPE */}
              <section id="scope" className="scroll-mt-6">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <span className="font-mono text-xs font-black text-navy">01</span>
                  <h2 className="text-xs font-black uppercase tracking-widest text-navy">
                    Specification Scope &amp; Applicable Requirements
                  </h2>
                </div>

                <div className="mt-4 text-sm leading-relaxed text-ink space-y-3.5">
                  <p className="font-medium text-ink-soft">
                    {standard.scopeSummary ||
                      "A scope summary is not available for this record. See the evidence passages below and the official document."}
                  </p>

                  {/* Verification / Archival reconciliation note if present */}
                  {standard.verificationNote && (
                    <div className="rounded-sm border-l-2 border-amber-600 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-950 dark:text-amber-200">
                      <span className="font-bold uppercase tracking-wide">Archival Gazette Note: </span>
                      {standard.verificationNote}
                    </div>
                  )}

                  {/* Sourced key testing parameters if available */}
                  {standard.keyTestingParameters && standard.keyTestingParameters.length > 0 && (
                    <div className="mt-5 border border-border/80 bg-surface-alt/50 p-4">
                      <p className="font-mono text-xs font-bold uppercase tracking-wider text-navy mb-2.5">
                        Key Testing &amp; Verification Parameters:
                      </p>
                      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 text-xs font-medium text-ink">
                        {standard.keyTestingParameters.map((param, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 bg-navy shrink-0" />
                            <span>{param}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>

              {/* 02 / REGULATORY CONTEXT & CERTIFICATION */}
              <section id="regulatory-context" className="scroll-mt-6">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <span className="font-mono text-xs font-black text-navy">02</span>
                  <h2 className="text-xs font-black uppercase tracking-widest text-navy">
                    Regulatory Context &amp; Certification Architecture
                  </h2>
                </div>

                <div className="mt-4 border border-border-strong bg-surface-raised overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-surface-alt font-mono text-[10.5px] uppercase tracking-wider text-ink-faint border-b border-border">
                      <tr>
                        <th className="py-2.5 px-4 font-bold">Regulatory Parameter</th>
                        <th className="py-2.5 px-4 font-bold">Gazetted Record</th>
                        <th className="py-2.5 px-4 font-bold hidden sm:table-cell">Legal Classification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium">
                      <tr>
                        <td className="py-3 px-4 font-bold text-navy">Compulsory QCO Status</td>
                        <td className="py-3 px-4 text-ink font-semibold">
                          {!scheme
                            ? "Information not verified from the available sources"
                            : isMandatory
                              ? "Mandatory Quality Control Order (QCO)"
                              : "Voluntary Standard Reference"}
                        </td>
                        <td className="py-3 px-4 text-ink-soft hidden sm:table-cell">
                          {!scheme ? "—" : isMandatory ? "Section 16, BIS Act 2016" : "Voluntary Conformity"}
                        </td>
                      </tr>

                      {scheme?.scheme && (
                        <tr>
                          <td className="py-3 px-4 font-bold text-navy">Certification Scheme</td>
                          <td className="py-3 px-4 text-ink font-semibold">{scheme.scheme}</td>
                          <td className="py-3 px-4 text-ink-soft hidden sm:table-cell">Bureau Mark Scheme</td>
                        </tr>
                      )}

                      {scheme?.certificationRoute && (
                        <tr>
                          <td className="py-3 px-4 font-bold text-navy">Certification Route</td>
                          <td className="py-3 px-4 text-ink font-semibold">{scheme.certificationRoute}</td>
                          <td className="py-3 px-4 text-ink-soft hidden sm:table-cell">Audited Pathway</td>
                        </tr>
                      )}

                      {standard.legalGazette?.order && (
                        <tr>
                          <td className="py-3 px-4 font-bold text-navy">Applicable QCO Order</td>
                          <td className="py-3 px-4 text-ink font-semibold">{standard.legalGazette.order}</td>
                          <td className="py-3 px-4 text-ink-soft hidden sm:table-cell">Gazette Order</td>
                        </tr>
                      )}

                      {standard.legalGazette?.notification && (
                        <tr>
                          <td className="py-3 px-4 font-bold text-navy">Gazette Notification No.</td>
                          <td className="py-3 px-4 text-ink font-mono">{standard.legalGazette.notification}</td>
                          <td className="py-3 px-4 text-ink-soft hidden sm:table-cell">Official Record</td>
                        </tr>
                      )}

                      {standard.legalGazette?.ministry && (
                        <tr>
                          <td className="py-3 px-4 font-bold text-navy">Issuing Ministry</td>
                          <td className="py-3 px-4 text-ink">{standard.legalGazette.ministry}</td>
                          <td className="py-3 px-4 text-ink-soft hidden sm:table-cell">Line Ministry</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 03 / SOURCED DOCUMENTARY EVIDENCE */}
              <section id="evidence" className="scroll-mt-6">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-navy">03</span>
                    <h2 className="text-xs font-black uppercase tracking-widest text-navy">
                      Sourced Documentary Evidence
                    </h2>
                  </div>
                  <span className="font-mono text-xs font-bold text-ink-faint">
                    {isReferenceRecord
                      ? `${standard.chunks.length} Reference Summar${standard.chunks.length !== 1 ? "ies" : "y"}`
                      : `${standard.chunks.length} Primary Passage${standard.chunks.length !== 1 ? "s" : ""}`}
                  </span>
                </div>

                {hasIndexedDocument ? (
                  <div className="mt-5 space-y-4">
                    {standard.chunks.map((c) => (
                      <EvidenceExcerpt
                        key={c.id}
                        standardNumber={standard.standardNumber}
                        documentTitle={standard.title}
                        section={c.section}
                        clause={c.clause}
                        page={c.page}
                        text={c.text}
                        sourceUrl={standard.sourceUrl}
                      />
                    ))}
                  </div>
                ) : (
                  /* THE "DOCUMENT NOT INDEXED" STATE — A CALM TRUST FEATURE */
                  <div className="mt-5 border border-border-strong bg-surface-raised p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-surface-alt font-mono text-xs font-bold text-ink-soft border border-border">
                        DOC
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                          Document Full-Text Not Indexed
                        </h3>
                        <p className="text-xs leading-relaxed text-ink-soft">
                          The Standards Navigator has verified this standard&apos;s legal identity, regulatory QCO
                          status, and factual parameters. However, the authoritative full-text specification document
                          is not currently indexed in the local retrieval engine.
                        </p>
                        <p className="text-xs text-ink-faint italic">
                          Technical testing limits and specific sub-clauses cannot be inferred without the primary
                          source document.
                        </p>
                        <div className="pt-2">
                          <a
                            href={standard.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-sm border border-navy px-3.5 py-1.5 text-xs font-bold text-navy hover:bg-navy hover:text-white transition-colors"
                          >
                            <span>Access Official BIS Portal Directorate</span>
                            <ExternalLinkIcon className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* 04 / PROVENANCE & RECORD INTEGRITY */}
              <section id="provenance" className="scroll-mt-6">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <span className="font-mono text-xs font-black text-navy">04</span>
                  <h2 className="text-xs font-black uppercase tracking-widest text-navy">
                    Dossier Provenance &amp; Verification Record
                  </h2>
                </div>

                <div className="mt-4 border border-border bg-surface-raised p-5 font-mono text-xs space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-ink-faint block text-[10.5px] uppercase">Record Source:</span>
                      <span className="font-bold text-ink">{standard.sourceOrg}</span>
                    </div>
                    <div>
                      <span className="text-ink-faint block text-[10.5px] uppercase">Verification Status:</span>
                      <span className={scheme ? "font-bold text-emerald-800 dark:text-emerald-300" : "font-bold text-ink-soft"}>
                  {verificationLabel}
                </span>
                    </div>
                    <div>
                      <span className="text-ink-faint block text-[10.5px] uppercase">Ingestion Checksum:</span>
                      <span className="text-ink-soft truncate block">{standard.checksum}</span>
                    </div>
                    <div>
                      <span className="text-ink-faint block text-[10.5px] uppercase">Database Sync Timestamp:</span>
                      <span className="text-ink-soft block">{standard.retrievedAt}</span>
                    </div>
                  </div>

                  {standard.sourceNote && (
                    <div className="mt-3 pt-2.5 border-t border-border/70 text-[11px] text-ink-faint">
                      <span className="font-bold text-ink">Source Registry Note:</span> {standard.sourceNote}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right / Sticky Technical Record Rail (32%) */}
            <aside className="space-y-6 lg:sticky lg:top-8">
              {/* Official Actions Panel */}
              <div className="border border-border-strong bg-surface-raised p-5">
                <h3 className="font-mono text-xs font-black uppercase tracking-wider text-navy mb-3.5 pb-2 border-b border-border">
                  Standard Actions
                </h3>
                <div className="space-y-2.5 text-xs">
                  <Link
                    href={`/?q=${askQuery}`}
                    className="flex w-full items-center justify-center gap-2 rounded-sm bg-navy px-4 py-2.5 font-bold text-white shadow-2xs hover:bg-navy-deep transition-colors"
                  >
                    <SearchIcon className="h-3.5 w-3.5" />
                    <span>Ask Questions in Chat</span>
                  </Link>

                  <Link
                    href={`/compare?ids=${encodeURIComponent(standard.id)}`}
                    className="flex w-full items-center justify-center gap-2 rounded-sm border border-border-strong bg-surface-alt px-4 py-2.5 font-semibold text-ink hover:border-navy hover:text-navy transition-colors"
                  >
                    <CompareIcon className="h-3.5 w-3.5" />
                    <span>Add to Comparison Matrix</span>
                  </Link>

                  <a
                    href={standard.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-sm border border-border-strong px-4 py-2 font-medium text-navy hover:underline transition-colors"
                  >
                    {/* sourceUrl is the document's recorded source, or the BIS
                        compulsory-certification list when none is recorded —
                        never verified as a Gazette publication. */}
                    <span>Open source page</span>
                    <span className="sr-only"> (opens in a new tab)</span>
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* Standard Relationships Panel */}
              <div className="border border-border bg-surface-raised p-5 text-xs">
                <h3 className="font-mono text-xs font-black uppercase tracking-wider text-navy mb-2.5 pb-2 border-b border-border">
                  Related Standards
                </h3>
                <p className="text-ink-faint leading-relaxed">
                  BIS Navigator does not yet have verified standard-to-standard relationship data (referenced by,
                  supersedes, amended by) for this record.
                </p>
              </div>

              {/* Archival Notice */}
              <div className="border border-border/80 bg-surface-alt/70 p-4 font-mono text-[11px] text-ink-faint space-y-1.5">
                <p className="font-bold uppercase tracking-wider text-ink">
                  Record Verification Integrity
                </p>
                <p className="leading-normal">
                  Facts on this page come from indexed BIS documents and the project&apos;s fact-checked reference
                  dataset. Anything not found there is marked as not verified rather than filled in. Confirm against
                  the official link before relying on it.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

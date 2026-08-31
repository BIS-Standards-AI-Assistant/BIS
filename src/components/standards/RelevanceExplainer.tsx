import Link from "next/link";
import { ChevronRightIcon, CheckCircleIcon, AlertTriangleIcon, SearchIcon } from "@/components/ui/icons";

/**
 * Real documentation of this system's own relevance/evidence mechanism —
 * not a placeholder. "Why is this Standard Relevant?" describes a feature
 * this app already has (see RecommendationCard.tsx, RelevanceMeter.tsx,
 * CoveragePanel.tsx, src/lib/grounding.ts), so routing it through
 * PlaceholderPage's "not covered yet" framing was wrong: there was nothing
 * missing to explain, and no BIS page could answer "how do I read this
 * app's own UI" anyway. Every claim below is a direct description of the
 * cited source file — keep them in sync if that mechanism changes.
 */
export function RelevanceExplainer() {
  return (
    <div className="mx-auto max-w-[860px] px-6 py-14">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-faint">
        <Link href="/" className="hover:text-blue hover:underline">Home</Link>
        <span className="flex items-center gap-1.5">
          <ChevronRightIcon className="h-3 w-3" />
          <Link href="/standards" className="hover:text-blue hover:underline">Standards</Link>
        </span>
        <span className="flex items-center gap-1.5">
          <ChevronRightIcon className="h-3 w-3" />
          <span>Why is this Standard Relevant?</span>
        </span>
      </nav>

      <h1 className="text-[28px] font-semibold tracking-tight text-navy">Why is this Standard Relevant?</h1>
      <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
        Every recommendation this system returns comes with four things next to it: a relevance meter, a
        grounding badge, a written reason, and the underlying evidence. Here is what each one actually
        means and how it&apos;s computed — so you can judge a recommendation instead of just trusting it.
      </p>

      <section className="mt-8 space-y-6">
        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">1. Relevance meter</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex gap-0.5" aria-hidden="true">
              <span className="h-1.5 w-4 bg-success" />
              <span className="h-1.5 w-4 bg-success" />
              <span className="h-1.5 w-4 bg-success" />
            </div>
            <span className="text-xs font-medium text-success">High relevance</span>
          </div>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
            Shown as one of three bands — High, Moderate, or Low relevance — never as a raw percentage.
            That&apos;s deliberate: the underlying score is model-estimated, not a calibrated statistic, so
            showing &ldquo;87% relevant&rdquo; would claim a precision it doesn&apos;t have.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">2. Grounding badge</p>
          <ul className="mt-3 space-y-2.5">
            <li className="flex items-start gap-2.5">
              <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <div>
                <span className="text-[13.5px] font-semibold text-ink">Directly supported by evidence</span>
                <p className="text-[13px] leading-relaxed text-ink-soft">The retrieved evidence itself establishes this standard applies.</p>
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div>
                <span className="text-[13.5px] font-semibold text-ink">Inferred from related evidence</span>
                <p className="text-[13px] leading-relaxed text-ink-soft">The evidence is related but doesn&apos;t directly confirm every detail of the match.</p>
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <div>
                <span className="text-[13.5px] font-semibold text-ink">Evidence doesn&apos;t fully establish this</span>
                <p className="text-[13px] leading-relaxed text-ink-soft">The most honest of the three — shown rather than hiding a weak match or inventing certainty.</p>
              </div>
            </li>
          </ul>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
            This state is computed deterministically — from retrieval strength, whether a standard number
            you asked for actually matches, how much of your query the evidence addresses, and whether the
            source is BIS itself. The answer-writing model never decides it and cannot override it; it only
            writes the explanation sentence underneath the badge.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">3. Coverage check</p>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
            A checklist against the specific things your query mentioned — product, material, intended
            use, target user, sector, testing requirement, certification requirement, standard identifier.
            Only the dimensions you actually asked about are shown; one you didn&apos;t mention is left off
            rather than marked as a false gap.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
            <span className="flex items-center gap-1.5 text-success"><CheckCircleIcon className="h-3.5 w-3.5" /> Material</span>
            <span className="flex items-center gap-1.5 text-warning"><AlertTriangleIcon className="h-3.5 w-3.5" /> Testing requirement</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">4. Evidence excerpts</p>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
            The actual retrieved text the recommendation is based on — with the standard number, section
            and clause where available, page number, and a link back to the source document. This is the
            part worth checking yourself: read the excerpt, not just the badge above it.
          </p>
        </div>
      </section>

      <div className="mt-8 border-t border-border pt-6">
        <p className="text-[13px] font-semibold text-navy">See it on a real query</p>
        <div className="mt-3 flex flex-wrap gap-3 text-[13.5px]">
          <Link
            href="/?focus=search"
            className="inline-flex items-center gap-2 rounded-lg bg-blue px-4 py-2.5 font-semibold text-white transition-colors hover:bg-navy-deep"
          >
            <SearchIcon className="h-4 w-4" />
            Ask about a Standard
          </Link>
          <Link href="/standards" className="rounded-md border border-border-strong px-3.5 py-2 font-medium text-ink-soft transition-colors hover:border-blue hover:text-blue">
            Browse Standards
          </Link>
        </div>
      </div>
    </div>
  );
}

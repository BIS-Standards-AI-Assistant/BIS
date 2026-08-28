/**
 * Institutional, quiet — never visually dominant. Only facts already
 * verified elsewhere in this project appear here: the BIS office address
 * is taken verbatim from the official product-manual PDFs ingested into
 * the knowledge base (see data/seed/raw), not invented for this footer.
 */
export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-alt">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-ink">Bureau of Indian Standards</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Manak Bhawan, 9 Bahadur Shah Zafar Marg
              <br />
              New Delhi – 110002
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Official resources
            </p>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>
                <a href="https://bis.gov.in" target="_blank" rel="noopener noreferrer" className="text-navy hover:underline">
                  Official BIS website (bis.gov.in)
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">About this service</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              An AI-assisted discovery tool built on ingested BIS product manuals and
              specifications. It is not an official BIS system and does not itself issue
              certification decisions — always confirm applicability with BIS directly.
            </p>
          </div>
        </div>
        <p className="mt-8 border-t border-border pt-4 text-xs text-ink-faint">
          Standards Navigator · An evidence-first discovery aid for Indian Standards, built for SIH26107.
        </p>
      </div>
    </footer>
  );
}

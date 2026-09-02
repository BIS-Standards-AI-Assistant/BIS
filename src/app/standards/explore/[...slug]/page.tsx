import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { RelevanceExplainer } from "@/components/standards/RelevanceExplainer";
import { STANDARDS_SECTION, findNavItem } from "@/lib/navigation";
import { getOfficialLinks } from "@/lib/official-links";
import { getPageFacts } from "@/lib/page-facts";

export const dynamic = "force-dynamic";

export default async function StandardsExplorePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const found = findNavItem("standards", slug);
  if (!found) notFound();

  // "Why is this Standard Relevant?" documents a feature this app already
  // has (see RelevanceExplainer.tsx) — it isn't a BIS topic PlaceholderPage's
  // "not covered yet" / official-links treatment could ever answer, since no
  // BIS page explains this app's own UI. Every other Standards item is a
  // genuine external-information gap and still goes through PlaceholderPage.
  if (found.item.slug === "why-relevant") {
    return (
      <div className="flex min-h-screen flex-col bg-surface">
        <Header />
        <main className="flex-1">
          <RelevanceExplainer />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <PlaceholderPage
      crumbs={[
        { label: STANDARDS_SECTION.label, href: STANDARDS_SECTION.rootHref },
        { label: found.item.label, href: `/standards/explore/${slug.join("/")}` },
      ]}
      title={found.item.label}
      description={found.item.description}
      links={getOfficialLinks("standards", found.item.slug)}
      facts={getPageFacts("standards", found.item.slug)}
    />
  );
}

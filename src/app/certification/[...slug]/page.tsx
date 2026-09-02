import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { CERTIFICATION_SECTION, findNavItem } from "@/lib/navigation";
import { getOfficialLinks } from "@/lib/official-links";
import { getPageFacts } from "@/lib/page-facts";

export const dynamic = "force-dynamic";

export default async function CertificationSubPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const found = findNavItem("certification", slug);
  if (!found) notFound();

  return (
    <PlaceholderPage
      crumbs={[
        { label: CERTIFICATION_SECTION.label, href: CERTIFICATION_SECTION.rootHref },
        { label: found.item.label, href: `${CERTIFICATION_SECTION.rootHref}/${slug.join("/")}` },
      ]}
      title={found.item.label}
      description={found.item.description}
      links={getOfficialLinks("certification", found.item.slug)}
      facts={getPageFacts("certification", found.item.slug)}
    />
  );
}

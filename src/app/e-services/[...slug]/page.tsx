import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { ESERVICES_SECTION, findNavItem } from "@/lib/navigation";
import { getOfficialLinks } from "@/lib/official-links";

export const dynamic = "force-dynamic";

export default async function EServicesSubPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const found = findNavItem("e-services", slug);
  if (!found) notFound();

  return (
    <PlaceholderPage
      crumbs={[
        { label: ESERVICES_SECTION.label, href: ESERVICES_SECTION.rootHref },
        { label: found.item.label, href: `${ESERVICES_SECTION.rootHref}/${slug.join("/")}` },
      ]}
      title={found.item.label}
      description={found.item.description}
      links={getOfficialLinks("e-services", found.item.slug)}
    />
  );
}

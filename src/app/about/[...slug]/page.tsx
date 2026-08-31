import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { ABOUT_SECTION, findNavItem } from "@/lib/navigation";
import { getOfficialLinks } from "@/lib/official-links";

export const dynamic = "force-dynamic";

export default async function AboutSubPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const found = findNavItem("about", slug);
  if (!found) notFound();

  return (
    <PlaceholderPage
      crumbs={[
        { label: ABOUT_SECTION.label, href: ABOUT_SECTION.rootHref },
        { label: found.item.label, href: `${ABOUT_SECTION.rootHref}/${slug.join("/")}` },
      ]}
      title={found.item.label}
      description={found.item.description}
      links={getOfficialLinks("about", found.item.slug)}
    />
  );
}

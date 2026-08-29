import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { RESOURCES_SECTION, findNavItem } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function ResourcesSubPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const found = findNavItem("resources", slug);
  if (!found) notFound();

  return (
    <PlaceholderPage
      crumbs={[
        { label: RESOURCES_SECTION.label, href: RESOURCES_SECTION.rootHref },
        { label: found.item.label, href: `${RESOURCES_SECTION.rootHref}/${slug.join("/")}` },
      ]}
      title={found.item.label}
      description={found.item.description}
    />
  );
}

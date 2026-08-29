import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { STANDARDS_SECTION, findNavItem } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function StandardsExplorePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const found = findNavItem("standards", slug);
  if (!found) notFound();

  return (
    <PlaceholderPage
      crumbs={[
        { label: STANDARDS_SECTION.label, href: STANDARDS_SECTION.rootHref },
        { label: found.item.label, href: `/standards/explore/${slug.join("/")}` },
      ]}
      title={found.item.label}
      description={found.item.description}
    />
  );
}

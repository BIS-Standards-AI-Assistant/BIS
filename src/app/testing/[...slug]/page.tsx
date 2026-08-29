import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { TESTING_SECTION, findNavItem } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function TestingSubPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const found = findNavItem("testing", slug);
  if (!found) notFound();

  return (
    <PlaceholderPage
      crumbs={[
        { label: TESTING_SECTION.label, href: TESTING_SECTION.rootHref },
        { label: found.item.label, href: `${TESTING_SECTION.rootHref}/${slug.join("/")}` },
      ]}
      title={found.item.label}
      description={found.item.description}
    />
  );
}

import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { CERTIFICATION_SECTION, findNavItem } from "@/lib/navigation";

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
    />
  );
}

import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { CERTIFICATION_SECTION } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default function CertificationPage() {
  return (
    <PlaceholderPage
      crumbs={[{ label: CERTIFICATION_SECTION.label, href: CERTIFICATION_SECTION.rootHref }]}
      title={CERTIFICATION_SECTION.rootLabel}
      description={CERTIFICATION_SECTION.rootDescription}
    />
  );
}

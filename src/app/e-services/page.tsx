import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { ESERVICES_SECTION } from "@/lib/navigation";
import { getOfficialLinks } from "@/lib/official-links";

export const dynamic = "force-dynamic";

export default function EServicesPage() {
  return (
    <PlaceholderPage
      crumbs={[{ label: ESERVICES_SECTION.label, href: ESERVICES_SECTION.rootHref }]}
      title={ESERVICES_SECTION.rootLabel}
      description={ESERVICES_SECTION.rootDescription}
      links={getOfficialLinks("e-services", "")}
    />
  );
}

import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { RESOURCES_SECTION } from "@/lib/navigation";
import { getOfficialLinks } from "@/lib/official-links";

export const dynamic = "force-dynamic";

export default function ResourcesPage() {
  return (
    <PlaceholderPage
      crumbs={[{ label: RESOURCES_SECTION.label, href: RESOURCES_SECTION.rootHref }]}
      title={RESOURCES_SECTION.rootLabel}
      description={RESOURCES_SECTION.rootDescription}
      links={getOfficialLinks("resources", "")}
    />
  );
}

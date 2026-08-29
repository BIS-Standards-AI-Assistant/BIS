import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { TESTING_SECTION } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default function TestingPage() {
  return (
    <PlaceholderPage
      crumbs={[{ label: TESTING_SECTION.label, href: TESTING_SECTION.rootHref }]}
      title={TESTING_SECTION.rootLabel}
      description={TESTING_SECTION.rootDescription}
    />
  );
}

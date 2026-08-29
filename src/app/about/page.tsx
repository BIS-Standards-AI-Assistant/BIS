import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { ABOUT_SECTION } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default function AboutPage() {
  return (
    <PlaceholderPage
      crumbs={[{ label: ABOUT_SECTION.label, href: ABOUT_SECTION.rootHref }]}
      title={ABOUT_SECTION.rootLabel}
      description={ABOUT_SECTION.rootDescription}
    />
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PolicyPageView } from "@/components/layout/PolicyPageView";
import { getPolicyPage } from "@/lib/policy-pages";

export const metadata: Metadata = {
  title: "Accessibility Statement | BIS Standards Navigator",
  description: "The Bureau of Indian Standards accessibility statement, reproduced from bis.gov.in.",
};

export default function AccessibilityStatementPage() {
  const page = getPolicyPage("accessibility-statement");
  if (!page) notFound();
  return <PolicyPageView page={page} />;
}

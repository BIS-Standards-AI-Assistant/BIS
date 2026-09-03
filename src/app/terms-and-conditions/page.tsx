import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PolicyPageView } from "@/components/layout/PolicyPageView";
import { getPolicyPage } from "@/lib/policy-pages";

export const metadata: Metadata = {
  title: "Terms & Conditions | BIS Standards Navigator",
  description: "The Bureau of Indian Standards terms and conditions, reproduced from bis.gov.in.",
};

export default function TermsAndConditionsPage() {
  const page = getPolicyPage("terms-and-conditions");
  if (!page) notFound();
  return <PolicyPageView page={page} />;
}

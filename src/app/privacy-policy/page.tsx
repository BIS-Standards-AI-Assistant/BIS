import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PolicyPageView } from "@/components/layout/PolicyPageView";
import { getPolicyPage } from "@/lib/policy-pages";

export const metadata: Metadata = {
  title: "Privacy Policy | BIS Standards Navigator",
  description: "The Bureau of Indian Standards privacy policy, reproduced from bis.gov.in.",
};

export default function PrivacyPolicyPage() {
  const page = getPolicyPage("privacy-policy");
  if (!page) notFound();
  return <PolicyPageView page={page} />;
}

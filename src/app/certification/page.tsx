import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CertificationPageBody } from "@/components/certification/CertificationPageBody";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Certification | BIS Navigator",
  description:
    "Find applicable BIS certification schemes, requirements, testing information, and related Indian Standards.",
};

export default function CertificationPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main className="flex-1">
        <CertificationPageBody />
      </main>
      <Footer />
    </div>
  );
}

import type { Metadata } from "next";
import { SearchPageClient } from "./SearchPageClient";

export const metadata: Metadata = {
  title: "Search Indian Standards | BIS Standards Navigator",
  description: "Search directly by product, standard number, or topic across the BIS document corpus.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const initialQuery = (q ?? "").trim();
  return <SearchPageClient initialQuery={initialQuery} />;
}

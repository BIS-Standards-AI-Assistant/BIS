"use client";

import dynamic from "next/dynamic";
import type { LaboratoryItem } from "@/lib/laboratories";

// Leaflet touches `window` at import time, so it can only load client-side
// — `ssr: false` is only valid from within a Client Component (this file),
// not from the Server Component page that renders it.
const LaboratoriesMap = dynamic(() => import("./LaboratoriesMap").then((m) => m.LaboratoriesMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] items-center justify-center rounded-lg border border-border bg-surface-alt/40 text-[12.5px] text-ink-faint">
      Loading map…
    </div>
  ),
});

export function LaboratoriesMapLoader({ laboratories, heightClass }: { laboratories: LaboratoryItem[]; heightClass?: string }) {
  return <LaboratoriesMap laboratories={laboratories} heightClass={heightClass} />;
}

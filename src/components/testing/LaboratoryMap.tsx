"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import type { LaboratoryItem } from "@/lib/laboratories";

/**
 * Leaflet reads `window`/`document` at import time (tile layer setup, icon
 * defaults), so it cannot run during Next's server render — loaded via
 * next/dynamic with ssr:false, gated on a client-only mount check so the
 * server-rendered HTML and first client paint agree (no hydration
 * mismatch) before the real map takes over.
 */
const DynamicLaboratoryMapInner = dynamic(
  () => import("./LaboratoryMapInner").then((mod) => mod.LaboratoryMapInner),
  {
    ssr: false,
    loading: () => <MapLoadingPlaceholder />,
  },
);

function MapLoadingPlaceholder() {
  return (
    <div className="flex h-[400px] items-center justify-center border border-border bg-surface-alt text-sm text-ink-faint">
      Loading map…
    </div>
  );
}

export function LaboratoryMap({ laboratories }: { laboratories: LaboratoryItem[] }) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isMounted) return <MapLoadingPlaceholder />;

  return <DynamicLaboratoryMapInner laboratories={laboratories} />;
}

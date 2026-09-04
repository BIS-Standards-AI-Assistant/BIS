"use client";

import React, { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import type { ComplianceMap } from "@/types/api";

const DynamicLaboratoryMapInner = dynamic(
  () => import("./LaboratoryMapInner").then((mod) => mod.LaboratoryMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-500 font-medium text-sm">
        Loading map...
      </div>
    ),
  }
);

interface LaboratoryMapProps {
  laboratories: ComplianceMap["laboratories"];
}

export function LaboratoryMap({ laboratories }: LaboratoryMapProps) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isMounted) {
    return (
      <div className="h-[400px] bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-500 font-medium text-sm">
        Loading map...
      </div>
    );
  }

  return <DynamicLaboratoryMapInner laboratories={laboratories} />;
}

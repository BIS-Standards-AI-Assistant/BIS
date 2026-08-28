"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface StandardSummary {
  id: string;
  standardNumber: string | null;
  title: string;
  documentType: string;
  version: string | null;
  chunkCount: number;
}

export function StandardsListClient({ standards }: { standards: StandardSummary[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function goCompare() {
    router.push(`/compare?ids=${[...selected].join(",")}`);
  }

  return (
    <div>
      <div className="divide-y divide-border border border-border">
        {standards.map((s) => (
          <div key={s.id} className="flex items-start gap-4 bg-surface-raised p-4">
            <label className="mt-0.5 flex items-center">
              <span className="sr-only">Select {s.standardNumber ?? s.title} for comparison</span>
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggle(s.id)}
                className="h-4 w-4 accent-[var(--color-navy)]"
              />
            </label>
            <div className="flex-1">
              <p className="font-mono text-sm text-navy">{s.standardNumber ?? "Unnumbered reference"}</p>
              <Link href={`/standards/${s.id}`} className="mt-0.5 block text-[15px] font-medium text-ink hover:underline">
                {s.title}
              </Link>
              <p className="mt-1 text-xs text-ink-faint">
                {s.documentType.replace("_", " ")}
                {s.version ? ` · ${s.version}` : ""} ·{" "}
                {s.chunkCount > 0
                  ? `${s.chunkCount} indexed section${s.chunkCount === 1 ? "" : "s"}`
                  : "not yet ingested into the retrieval index"}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={goCompare}
          disabled={selected.size < 2}
          className="rounded-sm bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Compare selected ({selected.size})
        </button>
        {selected.size < 2 && (
          <span className="text-xs text-ink-faint">Select at least 2 standards to compare.</span>
        )}
      </div>
    </div>
  );
}

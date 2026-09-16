"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Badge } from "@/components/ui/Badge";
import type { LaboratoryItem } from "@/lib/laboratories";

// Leaflet's default marker icon paths break under bundlers that fingerprint
// asset URLs (the class references image files by name that Webpack/
// Turbopack renames) — this is the standard react-leaflet fix, not an app
// customization.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const STATUS_TONE: Record<LaboratoryItem["currentStatus"], "success" | "danger" | "warning" | "neutral"> = {
  Active: "success",
  Suspended: "danger",
  Deferred: "warning",
  Unknown: "neutral",
};

/** A geocoded lab — the subset of LaboratoryItem this component actually needs, with lat/lng narrowed to non-null. */
type GeocodedLab = LaboratoryItem & { lat: number; lng: number };

export function LaboratoryMapInner({ laboratories }: { laboratories: LaboratoryItem[] }) {
  // Coordinates are city/state-level (scripts/geocode-laboratories.ts) and
  // null for anything Nominatim couldn't resolve — never fabricated, so
  // only geocoded labs are plottable. Labs in the same city share a point;
  // that reflects the dataset's real precision ceiling, not a rendering bug.
  const geocoded = useMemo(
    () => laboratories.filter((l): l is GeocodedLab => l.lat !== null && l.lng !== null),
    [laboratories],
  );

  if (geocoded.length === 0) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center border border-border bg-surface-raised p-8 text-center">
        <p className="text-sm font-medium text-ink">No geocoded locations available for these laboratories.</p>
        <p className="mt-1 max-w-sm text-xs text-ink-faint">
          Coordinates are derived from each laboratory&apos;s recorded city/state and are not available for every entry.
        </p>
      </div>
    );
  }

  // Center on the first geocoded lab rather than a fixed India-wide default —
  // with filters applied (by state, by search) that's usually more useful
  // than a constant center that ignores what's actually being shown.
  const center: [number, number] = [geocoded[0].lat, geocoded[0].lng];

  return (
    <div className="h-[400px] w-full overflow-hidden border border-border">
      <MapContainer center={center} zoom={5} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geocoded.map((lab) => (
          <Marker key={lab.id} position={[lab.lat, lab.lng]}>
            <Popup>
              <div className="min-w-[180px] p-0.5">
                <p className="text-sm font-semibold text-ink">{lab.name}</p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {lab.city ? `${lab.city}, ` : ""}
                  {lab.state} · {lab.type}
                </p>
                <div className="mt-1.5">
                  <Badge tone={STATUS_TONE[lab.currentStatus]}>{lab.currentStatus}</Badge>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

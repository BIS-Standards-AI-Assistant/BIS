"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LaboratoryItem } from "@/lib/laboratories";

// Leaflet's default marker image paths break under bundlers (they resolve
// relative to the page, not the leaflet package) — a divIcon sidesteps
// that entirely instead of fighting webpack/Turbopack asset resolution.
const pinIcon = L.divIcon({
  className: "",
  html:
    '<svg width="22" height="30" viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 0C4.9 0 0 4.9 0 11c0 8.25 11 19 11 19s11-10.75 11-19c0-6.1-4.9-11-11-11z" fill="#1a3a5c"/>' +
    '<circle cx="11" cy="11" r="4.5" fill="#fff"/>' +
    "</svg>",
  iconSize: [22, 30],
  iconAnchor: [11, 30],
  popupAnchor: [0, -28],
});

const INDIA_CENTER: [number, number] = [22.9734, 78.6569];

interface LabGroup {
  latitude: number;
  longitude: number;
  labs: LaboratoryItem[];
}

/**
 * City-level laboratory locations (see scripts/data-laboratories-geocode.ts
 * and src/lib/laboratories.ts) — each marker is "a recognised laboratory is
 * in this city," never a per-standard capability claim (this list has none
 * — see LaboratoriesDirectory.tsx for the same rule). A lab with no
 * resolvable city/state is simply absent from the map, not placed anywhere
 * approximate.
 */
export function LaboratoriesMap({ laboratories, heightClass = "h-[480px]" }: { laboratories: LaboratoryItem[]; heightClass?: string }) {
  const { groups, unmapped } = useMemo(() => {
    const byCoord = new Map<string, LabGroup>();
    let unmappedCount = 0;
    for (const lab of laboratories) {
      if (lab.latitude === null || lab.longitude === null) {
        unmappedCount++;
        continue;
      }
      const key = `${lab.latitude},${lab.longitude}`;
      const existing = byCoord.get(key);
      if (existing) existing.labs.push(lab);
      else byCoord.set(key, { latitude: lab.latitude, longitude: lab.longitude, labs: [lab] });
    }
    return { groups: [...byCoord.values()], unmapped: unmappedCount };
  }, [laboratories]);

  return (
    <div>
      <div className={`overflow-hidden rounded-lg border border-border ${heightClass}`}>
        <MapContainer center={INDIA_CENTER} zoom={5} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {groups.map((group) => (
            <Marker key={`${group.latitude},${group.longitude}`} position={[group.latitude, group.longitude]} icon={pinIcon}>
              <Popup maxHeight={220}>
                <div className="max-w-[220px]">
                  <p className="text-xs font-semibold text-ink">
                    {group.labs[0].city ?? group.labs[0].state} — {group.labs.length}{" "}
                    {group.labs.length === 1 ? "laboratory" : "laboratories"}
                  </p>
                  <ul className="mt-1.5 space-y-1 text-[11px] text-ink-soft">
                    {group.labs.slice(0, 8).map((lab) => (
                      <li key={lab.id}>
                        {lab.name} <span className="text-ink-faint">({lab.currentStatus})</span>
                      </li>
                    ))}
                    {group.labs.length > 8 && <li className="text-ink-faint">+{group.labs.length - 8} more</li>}
                  </ul>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <p className="mt-2 text-[11px] text-ink-faint">
        Showing {laboratories.length - unmapped} of {laboratories.length} recognised laboratories at their city-level
        location (from the lab&apos;s recorded city/state, not a street address).
        {unmapped > 0 &&
          ` ${unmapped} could not be placed on this map (their recorded city/state couldn't be matched to a real location) — they still appear in the list below.`}
      </p>
    </div>
  );
}

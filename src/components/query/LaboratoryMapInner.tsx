"use client";

import React, { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { ComplianceMap } from "@/types/api";

// Fix for default Leaflet marker icons in bundlers
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LaboratoryMapInnerProps {
  laboratories: ComplianceMap["laboratories"];
}

export function LaboratoryMapInner({ laboratories }: LaboratoryMapInnerProps) {
  const customIcon = useMemo(
    () =>
      new L.Icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    []
  );

  if (!laboratories || laboratories.length === 0) {
    return (
      <div className="h-[400px] bg-slate-50 border border-slate-200 rounded-lg flex flex-col items-center justify-center p-8 text-center">
        <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 className="text-lg font-medium text-slate-700">No laboratories found</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">We couldn&apos;t find any recognised laboratories for these specific testing requirements in the dataset.</p>
      </div>
    );
  }

  // Default to first laboratory's location or geographic center of India
  const defaultCenter: [number, number] = [laboratories[0].lat, laboratories[0].lng];

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border border-slate-200 shadow-sm z-0">
      <MapContainer center={defaultCenter} zoom={5} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {laboratories.map((lab, i) => (
          <Marker key={i} position={[lab.lat, lab.lng]} icon={customIcon}>
            <Popup>
              <div className="p-1">
                <h4 className="font-semibold text-slate-800 text-sm">{lab.name}</h4>
                <p className="text-xs text-slate-500 mt-1">{lab.city}, {lab.state}</p>
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Testing Capabilities</span>
                  <ul className="mt-1 space-y-1">
                    {lab.testingCapabilities.map((cap, j) => (
                      <li key={j} className="text-xs text-slate-700 flex items-start gap-1">
                        <svg className="w-3 h-3 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

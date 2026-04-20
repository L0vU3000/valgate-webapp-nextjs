"use client";

import { useState } from "react";
import { Search, Info, Maximize2, Map as MapIcon } from "lucide-react";
import { cn } from "@/components/ui/utils";
import type { FormData } from "./types";
import { PropertyLocationMap } from "./PropertyLocationMap";
import { LocationPickerModal } from "./LocationPickerModal";

const DEFAULT_CENTER: [number, number] = [104.9282, 11.5564]; // Phnom Penh

const INPUT =
  "w-full border border-border rounded-xl px-4 py-2.5 text-[14px] text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_8%,transparent)] transition-[border-color,box-shadow] duration-200";

export function Step2BasicInfo({
  form,
  setForm,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
}) {
  const [showManualAddress, setShowManualAddress] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const mapCenter = form.mapCenter ?? DEFAULT_CENTER;
  const setMapCenter = (c: [number, number]) => setForm({ ...form, mapCenter: c });

  const update = (key: keyof FormData, val: string) =>
    setForm({ ...form, [key]: val });

  const combinedAddress = [form.addressLine, form.city, form.state]
    .filter(Boolean)
    .join(", ");

  const isPinned = !!form.mapCenter;

  return (
    <div className="flex-1 min-h-0 flex flex-col max-w-[560px] w-full mx-auto">
      {/* Heading */}
      <div className="shrink-0 mb-4 animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]">
        <h2 className="text-[28px] font-bold text-[#1a1c1c] text-center leading-10">
          Confirm property location
        </h2>
        <p className="text-[16px] text-[#5b5f62] text-center leading-[1.43]">
          Search for your property address and confirm the pin on the map
        </p>
      </div>

      {/* Card */}
      <div className="flex-1 min-h-0 border border-border rounded-2xl p-6 flex flex-col gap-4 animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_60ms_both]">

        {/* Property Name */}
        <div className="shrink-0 flex flex-col gap-1.5">
          <label className="text-[14px] text-foreground block" style={{ fontWeight: 600 }}>
            Property Name
          </label>
          <input
            type="text"
            value={form.propertyName}
            onChange={(e) => update("propertyName", e.target.value)}
            placeholder="e.g. Skyline Luxury Lofts"
            className={INPUT}
          />
        </div>

        {/* Address */}
        <div className="shrink-0 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[14px] text-foreground block" style={{ fontWeight: 600 }}>
              Address
            </label>
            <button
              onClick={() => setShowManualAddress((v) => !v)}
              className="text-[13px] font-semibold text-primary underline decoration-transparent hover:decoration-current active:scale-95 transition-[text-decoration-color,transform] duration-200"
            >
              {showManualAddress ? "Use address search" : "Enter address manually"}
            </button>
          </div>
          {!showManualAddress && (
            <div className="relative">
              <input
                type="text"
                value={combinedAddress || form.addressLine}
                onChange={(e) => update("addressLine", e.target.value)}
                placeholder="Search address…"
                className={`${INPUT} pl-10`}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          )}
        </div>

        {/* Lower region: manual fields OR map */}
        {showManualAddress ? (
          <div key="manual" className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-0.5 animate-[fade-slide-up_0.35s_cubic-bezier(0.22,1,0.36,1)_both]">
            <input type="text" value={form.addressLine} onChange={(e) => update("addressLine", e.target.value)}
              placeholder="Street address" className={INPUT} />
            <input type="text" value={form.addressLine2} onChange={(e) => update("addressLine2", e.target.value)}
              placeholder="Apartment, suite, etc. (optional)" className={INPUT} />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={form.city} onChange={(e) => update("city", e.target.value)}
                placeholder="City" className={INPUT} />
              <input type="text" value={form.state} onChange={(e) => update("state", e.target.value)}
                placeholder="State" className={INPUT} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={form.zip} onChange={(e) => update("zip", e.target.value)}
                placeholder="ZIP code" className={INPUT} />
              <input type="text" value={form.country} onChange={(e) => update("country", e.target.value)}
                placeholder="Country" className={INPUT} />
            </div>
          </div>
        ) : (
          <div key="map" className="flex-1 min-h-0 flex flex-col gap-2 animate-[fade-slide-up_0.35s_cubic-bezier(0.22,1,0.36,1)_both]">
            <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden border border-border">
              <PropertyLocationMap
                center={mapCenter}
                onLocationChange={(lat, lng) => setMapCenter([lng, lat])}
                onLoad={() => setMapLoaded(true)}
                className="absolute inset-0"
              />

              {/* Map loading overlay */}
              <div
                className={cn(
                  "absolute inset-0 z-50 flex flex-col items-center justify-center bg-background gap-3 transition-opacity duration-500",
                  mapLoaded ? "opacity-0 pointer-events-none" : "opacity-100",
                )}
                onTransitionEnd={(e) => {
                  if (e.propertyName === "opacity" && mapLoaded) {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <MapIcon className="size-5 text-primary animate-pulse" />
                  <span className="text-[13px] font-medium text-muted-foreground">Loading map…</span>
                </div>
                <div className="w-32 h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full animate-[loading-bar_1.5s_ease-in-out_infinite]" />
                </div>
              </div>

              {/* Floating hint */}
              {mapLoaded && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 backdrop-blur-md bg-background/90 shadow-sm pointer-events-none animate-[fade-slide-down_0.4s_cubic-bezier(0.22,1,0.36,1)_both]">
                <span className="text-[12px] font-semibold text-foreground whitespace-nowrap">
                  Drag the pin to adjust the exact location.
                </span>
              </div>
              )}

              {/* Expand button */}
              {mapLoaded && (
              <button
                onClick={() => setShowModal(true)}
                className="absolute bottom-3 right-3 z-[100] flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 backdrop-blur-md bg-background/90 shadow-sm hover:bg-background active:scale-95 transition-[colors,transform] duration-150 text-[12px] font-semibold text-foreground animate-[fade-slide-up_0.35s_cubic-bezier(0.22,1,0.36,1)_both]"
              >
                <Maximize2 className="w-3 h-3" />
                Expand map
              </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 px-0.5">
              <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span
                key={String(isPinned)}
                className="text-[13px] text-muted-foreground animate-[fade-slide-up_0.3s_cubic-bezier(0.22,1,0.36,1)_both]"
              >
                {isPinned
                  ? `Pinned at ${mapCenter[1].toFixed(4)}°, ${mapCenter[0].toFixed(4)}°`
                  : "This is where your property will appear on your Valgate map."}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal — rendered outside card so it can portal to body */}
      {showModal && (
        <LocationPickerModal
          center={mapCenter}
          onClose={() => setShowModal(false)}
          onConfirm={(newCenter) => {
            setMapCenter(newCenter);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

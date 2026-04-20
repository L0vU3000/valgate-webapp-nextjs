"use client";

import { useState } from "react";
import { Search, Info, Maximize2 } from "lucide-react";
import type { FormData } from "./types";
import { PropertyLocationMap } from "./PropertyLocationMap";
import { LocationPickerModal } from "./LocationPickerModal";

const DEFAULT_CENTER: [number, number] = [104.9282, 11.5564]; // Phnom Penh

const INPUT =
  "w-full border border-border rounded-xl px-4 py-2.5 text-[14px] text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors";

export function Step2BasicInfo({
  form,
  setForm,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
}) {
  const [showManualAddress, setShowManualAddress] = useState(false);
  const [showModal, setShowModal] = useState(false);
  // Single source of truth for the map location — shared between small map and modal
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);

  const update = (key: keyof FormData, val: string) =>
    setForm({ ...form, [key]: val });

  const combinedAddress = [form.addressLine, form.city, form.state]
    .filter(Boolean)
    .join(", ");

  const isPinned = mapCenter[0] !== DEFAULT_CENTER[0] || mapCenter[1] !== DEFAULT_CENTER[1];

  return (
    <div className="flex-1 min-h-0 flex flex-col max-w-[560px] w-full mx-auto">
      {/* Heading */}
      <div className="shrink-0 mb-4">
        <h2 className="text-[30px] text-foreground mb-0.5" style={{ fontWeight: 700 }}>
          Confirm property location
        </h2>
        <p className="text-[14px] text-muted-foreground">
          Search for your property address and confirm the pin on the map
        </p>
      </div>

      {/* Card */}
      <div className="flex-1 min-h-0 border border-border rounded-2xl p-6 flex flex-col gap-4">

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
          <label className="text-[14px] text-foreground block" style={{ fontWeight: 600 }}>
            Address
          </label>
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
          <div className="flex justify-end">
            <button
              onClick={() => setShowManualAddress((v) => !v)}
              className="text-[13px] font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              {showManualAddress ? "Use address search" : "Enter address manually"}
            </button>
          </div>
        </div>

        {/* Lower region: manual fields OR map */}
        {showManualAddress ? (
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-0.5">
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
          <div className="flex-1 min-h-0 flex flex-col gap-2">
            <div className="relative flex-1 min-h-[120px] rounded-xl overflow-hidden border border-border">
              <PropertyLocationMap
                center={mapCenter}
                className="absolute inset-0"
              />

              {/* Floating hint */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 backdrop-blur-md bg-background/90 shadow-sm pointer-events-none">
                <span className="text-[12px] font-semibold text-foreground whitespace-nowrap">
                  Drag the pin to adjust the exact location.
                </span>
              </div>

              {/* Expand button */}
              <button
                onClick={() => setShowModal(true)}
                className="absolute bottom-3 right-3 z-[100] flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 backdrop-blur-md bg-background/90 shadow-sm hover:bg-background transition-colors text-[12px] font-semibold text-foreground"
              >
                <Maximize2 className="w-3 h-3" />
                Expand map
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 px-0.5">
              <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-[13px] text-muted-foreground">
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

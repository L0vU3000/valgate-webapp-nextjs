"use client";

import { useState } from "react";
import { Search, Maximize2, Map as MapIcon, ChevronDown, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { CAMBODIA_PROVINCES } from "@/lib/constants/cambodia-provinces";
import { cn } from "@/components/ui/utils";
import { RequiredMark, OptionalLabel } from "@/components/ui/required-mark";
import { useGeocode } from "../_lib/use-geocode";
import type { FormData } from "./types";

const PropertyLocationMap = dynamic(
  () => import("./PropertyLocationMap").then((m) => ({ default: m.PropertyLocationMap })),
  { ssr: false },
);

const LocationPickerModal = dynamic(
  () => import("./LocationPickerModal").then((m) => ({ default: m.LocationPickerModal })),
  { ssr: false },
);

const DEFAULT_CENTER: [number, number] = [104.9282, 11.5564]; // Phnom Penh

// text-base (16px) on phone defeats iOS zoom-on-focus; sm:text-[14px] preserves
// the denser desktop look. min-h-11 = 44px touch target.
const INPUT =
  "w-full min-h-11 border border-border rounded-xl px-4 py-2.5 text-base sm:text-[14px] text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_8%,transparent)] transition-[border-color,box-shadow] duration-200";

const INPUT_ERROR =
  "w-full min-h-11 border border-destructive rounded-xl px-4 py-2.5 text-base sm:text-[14px] text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:border-destructive focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--destructive)_10%,transparent)] transition-[border-color,box-shadow] duration-200";

export function Step2BasicInfo({
  form,
  setForm,
  errors,
}: {
  form: FormData;
  setForm: (f: FormData | ((prev: FormData) => FormData)) => void;
  errors?: Record<string, string> | null;
}) {
  const [showManualAddress, setShowManualAddress] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState(
    () => [form.addressLine, form.city, form.province].filter(Boolean).join(", ") || "",
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const geocode = useGeocode();

  const mapCenter = form.mapCenter ?? DEFAULT_CENTER;
  const setMapCenter = (c: [number, number]) => setForm((prev) => ({ ...prev, mapCenter: c }));

  const update = (key: keyof FormData, val: string) =>
    setForm({ ...form, [key]: val });

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

        {/* Form legend */}
        <p className="text-[11px] text-[--text-tertiary] flex items-center gap-1 self-end">
          <RequiredMark />
          <span>Required fields</span>
        </p>

        {/* Property Name — required */}
        <div className="shrink-0 flex flex-col gap-1.5">
          <label className="text-[14px] text-foreground flex items-center" style={{ fontWeight: 600 }}>
            Property Name <RequiredMark />
          </label>
          <input
            type="text"
            aria-required="true"
            value={form.propertyName}
            onChange={(e) => update("propertyName", e.target.value)}
            placeholder="e.g. Skyline Luxury Lofts"
            className={errors?.propertyName ? INPUT_ERROR : INPUT}
          />
          {errors?.propertyName && (
            <p className="text-[13px] text-destructive">{errors.propertyName}</p>
          )}
        </div>

        {/* Total Area — optional */}
        <div className="shrink-0 flex flex-col gap-1.5">
          <label className="text-[14px] text-foreground flex items-center" style={{ fontWeight: 600 }}>
            Total Area <span className="text-muted-foreground font-normal ml-1">(m²)</span>
            <OptionalLabel />
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={form.totalArea}
            onChange={(e) => update("totalArea", e.target.value)}
            placeholder="e.g. 850"
            className={errors?.totalArea ? INPUT_ERROR : INPUT}
          />
          {errors?.totalArea && (
            <p className="text-[13px] text-destructive">{errors.totalArea}</p>
          )}
        </div>

        {/* Address — optional */}
        <div className="shrink-0 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[14px] text-foreground flex items-center" style={{ fontWeight: 600 }}>
              Address <OptionalLabel />
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
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  geocode.search(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (geocode.suggestions.length > 0) setShowSuggestions(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 150);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShowSuggestions(false);
                }}
                placeholder="Search address…"
                className={`${INPUT} pl-10 pr-9`}
                autoComplete="off"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              {geocode.loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin pointer-events-none" />
              )}
              {showSuggestions && geocode.suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                  {geocode.suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setForm((prev) => ({
                          ...prev,
                          addressLine: s.addressLine,
                          city: s.city,
                          province: s.province,
                          country: s.country,
                          zip: s.zip,
                          mapCenter: s.center,
                        }));
                        setSearchQuery(s.placeName);
                        setShowSuggestions(false);
                        geocode.clear();
                      }}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-accent/60 transition-colors text-left border-b border-border last:border-b-0"
                    >
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-[14px] font-medium text-foreground truncate">
                          {s.mainText}
                        </div>
                        <div className="text-[12px] text-muted-foreground truncate">
                          {s.secondaryText}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lower region: manual fields OR map */}
        {showManualAddress ? (
          <div key="manual" className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-0.5 animate-[fade-slide-up_0.35s_cubic-bezier(0.22,1,0.36,1)_both]">
            <input type="text" value={form.addressLine} onChange={(e) => update("addressLine", e.target.value)}
              placeholder="Street address" className={INPUT}
              autoComplete="street-address" enterKeyHint="next" />
            <input type="text" value={form.addressLine2} onChange={(e) => update("addressLine2", e.target.value)}
              placeholder="Apartment, suite, etc. (optional)" className={INPUT}
              autoComplete="address-line2" enterKeyHint="next" />
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
              <input type="text" value={form.city} onChange={(e) => update("city", e.target.value)}
                placeholder="City" className={INPUT}
                autoComplete="address-level2" enterKeyHint="next" />
              <div className="relative">
                <select
                  value={form.province}
                  onChange={(e) => update("province", e.target.value)}
                  className={`${INPUT} appearance-none pr-8 ${!form.province ? "text-muted-foreground" : ""}`}
                  autoComplete="address-level1"
                >
                  <option value="" disabled>Province (optional)</option>
                  {CAMBODIA_PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
              <input type="text" value={form.zip} onChange={(e) => update("zip", e.target.value)}
                placeholder="ZIP code" className={INPUT}
                inputMode="numeric" autoComplete="postal-code" enterKeyHint="next" />
              <input type="text" value={form.country} onChange={(e) => update("country", e.target.value)}
                placeholder="Country" className={INPUT}
                autoComplete="country-name" enterKeyHint="done" />
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

            {/* Location pin status banner */}
            {isPinned ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-[13px] text-green-700 shrink-0 animate-[fade-slide-up_0.3s_cubic-bezier(0.22,1,0.36,1)_both]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Location pinned at {mapCenter[1].toFixed(4)}°, {mapCenter[0].toFixed(4)}°</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[13px] text-amber-700 shrink-0 animate-[fade-slide-up_0.3s_cubic-bezier(0.22,1,0.36,1)_both]">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>Pin your property location — drag the map pin for the best results</span>
              </div>
            )}
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

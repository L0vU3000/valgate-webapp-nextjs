"use client";

import { useState } from "react";
import { Search, Maximize2, Map as MapIcon, ChevronDown, MapPin, CheckCircle2, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import dynamic from "next/dynamic";
import { CAMBODIA_PROVINCES } from "@/lib/constants/cambodia-provinces";
import { cn } from "@/components/ui/utils";
import { RequiredMark, OptionalLabel } from "@/components/ui/required-mark";
import { useGeocode } from "@/app/_shared/add-property/_lib/use-geocode";
import type { FormData } from "./types";

const PropertyLocationMap = dynamic(
  () => import("@/app/(shell)/add-property/_components/PropertyLocationMap").then((m) => ({ default: m.PropertyLocationMap })),
  { ssr: false },
);

const LocationPickerModal = dynamic(
  () => import("@/app/(shell)/add-property/_components/LocationPickerModal").then((m) => ({ default: m.LocationPickerModal })),
  { ssr: false },
);

const DEFAULT_CENTER: [number, number] = [104.9282, 11.5564];

const INPUT =
  "w-full min-h-11 border border-border rounded-xl px-4 py-2.5 text-base sm:text-[14px] text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_8%,transparent)] transition-[border-color,box-shadow] duration-200";

const INPUT_ERROR =
  "w-full min-h-11 border border-destructive rounded-xl px-4 py-2.5 text-base sm:text-[14px] text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:border-destructive focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--destructive)_10%,transparent)] transition-[border-color,box-shadow] duration-200";

// Amber ring for a scan-filled field the self-consistency runs disagreed on (low-confidence). It reads
// as "look here", distinct from the red error ring — the value isn't wrong, it just needs a glance.
const INPUT_WARN =
  "w-full min-h-11 border border-amber-300 rounded-xl px-4 py-2.5 text-base sm:text-[14px] text-foreground bg-amber-50/40 placeholder:text-muted-foreground focus:outline-none focus:border-amber-400 focus:shadow-[0_0_0_3px_color-mix(in_oklch,#f59e0b_12%,transparent)] transition-[border-color,box-shadow,background-color] duration-200";

// The address subfields, so the Address section can show one combined badge (any scanned → "Scanned",
// any low-confidence → "Check this") instead of six separate ones.
const ADDRESS_KEYS = ["addressLine", "addressLine2", "city", "province", "zip", "country"] as const;

// The fields Step 2 actually renders (and can therefore badge). The banner counts only these, so the
// count always matches the badges the user can see on THIS step — a scan may fill Step 3 fields too,
// but those are surfaced when the user reaches Step 3, not counted here.
const STEP2_FIELDS = ["propertyName", "totalArea", ...ADDRESS_KEYS] as const;

// Stable empty fallback so the optional scan-field sets don't allocate a new Set every render.
const EMPTY_SET: Set<string> = new Set();

// A small pill on a field label showing where the value came from: a confident scan ("Auto-filled") or
// one that needs a second look ("Check this"). Fades in; disappears once the user edits the field.
function ScanBadge({ variant }: { variant: "auto" | "check" }) {
  const isCheck = variant === "check";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold animate-[fade-slide-up_0.3s_cubic-bezier(0.22,1,0.36,1)_both]",
        isCheck
          ? "bg-amber-50 border-amber-200 text-amber-700"
          : "bg-primary/10 border-primary/20 text-primary",
      )}
    >
      {isCheck ? <AlertTriangle className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
      {isCheck ? "Check this" : "Auto-filled"}
    </span>
  );
}

export function Step2BasicInfo({
  form,
  setForm,
  errors,
  scanFilledFields,
  scanLowFields,
  onReviewScanField,
}: {
  form: FormData;
  setForm: (f: FormData | ((prev: FormData) => FormData)) => void;
  errors?: Record<string, string> | null;
  // Fields a document scan pre-filled, and the subset the runs flagged low-confidence. Both drive the
  // review badges below and clear per-field as the user edits. Optional so manual-entry flows pass none.
  scanFilledFields?: Set<string>;
  scanLowFields?: Set<string>;
  onReviewScanField?: (key: string) => void;
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

  // Editing a field counts as reviewing it, so tell the parent to drop that field's scan badge.
  const update = (key: keyof FormData, val: string) => {
    onReviewScanField?.(key);
    setForm({ ...form, [key]: val });
  };

  const isPinned = !!form.mapCenter;

  // Scan-review state for the fields Step 2 renders. Sets are empty for manual entry, so all of this
  // collapses to nothing when the user didn't scan a document.
  const filled = scanFilledFields ?? EMPTY_SET;
  const low = scanLowFields ?? EMPTY_SET;
  // Count only the fields this step shows, so the banner matches the visible badges.
  const scannedCount = STEP2_FIELDS.filter((k) => filled.has(k)).length;
  const lowCount = STEP2_FIELDS.filter((k) => low.has(k)).length;
  const addressScanned = ADDRESS_KEYS.some((k) => filled.has(k));
  const addressLow = ADDRESS_KEYS.some((k) => low.has(k));
  // Picking an address suggestion or clearing the search replaces every address field at once — that's
  // a full review, so drop all the address badges in one go.
  const reviewAddress = () => ADDRESS_KEYS.forEach((k) => onReviewScanField?.(k));

  return (
    <div className="flex-1 min-h-0 flex flex-col max-w-[560px] w-full mx-auto">
      <div className="shrink-0 mb-4 animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]">
        <h2 className="text-[28px] font-bold text-[#1a1c1c] text-center leading-10">
          Confirm property location
        </h2>
        <p className="text-[16px] text-[#5b5f62] text-center leading-[1.43]">
          Search for your property address and confirm the pin on the map
        </p>
      </div>

      <div className="flex-1 min-h-0 border border-border rounded-2xl p-4 sm:p-6 flex flex-col gap-4 animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_60ms_both]">

        {scannedCount > 0 && (
          <div
            className={cn(
              "shrink-0 flex items-start gap-3 rounded-xl border px-3.5 py-3 animate-[fade-slide-up_0.4s_cubic-bezier(0.22,1,0.36,1)_both]",
              lowCount > 0 ? "border-amber-200 bg-amber-50/60" : "border-primary/15 bg-primary/[0.04]",
            )}
            role="status"
          >
            <span
              className={cn(
                "shrink-0 flex items-center justify-center w-8 h-8 rounded-full",
                lowCount > 0 ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary",
              )}
            >
              {lowCount > 0 ? <AlertTriangle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground">
                {scannedCount} {scannedCount === 1 ? "field" : "fields"} filled in from your document
              </p>
              <p className="text-[12px] text-muted-foreground leading-snug">
                {lowCount > 0
                  ? `${lowCount} ${lowCount === 1 ? "field needs" : "fields need"} a quick check — we marked ${lowCount === 1 ? "it" : "them"} below. Confirm or edit before continuing.`
                  : "Review and edit anything before continuing."}
              </p>
            </div>
          </div>
        )}

        <p className="text-[11px] text-[--text-tertiary] flex items-center gap-1 self-end">
          <RequiredMark />
          <span>Required fields</span>
        </p>

        <div className="shrink-0 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[14px] text-foreground flex items-center" style={{ fontWeight: 600 }}>
              Property Name <RequiredMark />
            </label>
            {filled.has("propertyName") && <ScanBadge variant={low.has("propertyName") ? "check" : "auto"} />}
          </div>
          <input
            type="text"
            aria-required="true"
            value={form.propertyName}
            onChange={(e) => update("propertyName", e.target.value)}
            placeholder="e.g. Skyline Luxury Lofts"
            className={errors?.propertyName ? INPUT_ERROR : low.has("propertyName") ? INPUT_WARN : INPUT}
          />
          {errors?.propertyName && (
            <p className="text-[13px] text-destructive">{errors.propertyName}</p>
          )}
        </div>

        <div className="shrink-0 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[14px] text-foreground flex items-center" style={{ fontWeight: 600 }}>
              Total Area <span className="text-muted-foreground font-normal ml-1">(m²)</span>
              <OptionalLabel />
            </label>
            {filled.has("totalArea") && <ScanBadge variant={low.has("totalArea") ? "check" : "auto"} />}
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={form.totalArea}
            onChange={(e) => update("totalArea", e.target.value)}
            placeholder="e.g. 850"
            className={errors?.totalArea ? INPUT_ERROR : low.has("totalArea") ? INPUT_WARN : INPUT}
          />
          {errors?.totalArea && (
            <p className="text-[13px] text-destructive">{errors.totalArea}</p>
          )}
        </div>

        <div className="shrink-0 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-[14px] text-foreground flex items-center" style={{ fontWeight: 600 }}>
                Address <OptionalLabel />
              </label>
              {addressScanned && <ScanBadge variant={addressLow ? "check" : "auto"} />}
            </div>
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
                  reviewAddress();
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
                className={`${addressLow ? INPUT_WARN : INPUT} pl-10 pr-9`}
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
                        reviewAddress();
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

        {showManualAddress ? (
          <div key="manual" className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-0.5 animate-[fade-slide-up_0.35s_cubic-bezier(0.22,1,0.36,1)_both]">
            <input type="text" value={form.addressLine} onChange={(e) => update("addressLine", e.target.value)}
              placeholder="Street address" className={low.has("addressLine") ? INPUT_WARN : INPUT}
              autoComplete="street-address" enterKeyHint="next" />
            <input type="text" value={form.addressLine2} onChange={(e) => update("addressLine2", e.target.value)}
              placeholder="Apartment, suite, etc. (optional)" className={low.has("addressLine2") ? INPUT_WARN : INPUT}
              autoComplete="address-line2" enterKeyHint="next" />
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
              <input type="text" value={form.city} onChange={(e) => update("city", e.target.value)}
                placeholder="City" className={low.has("city") ? INPUT_WARN : INPUT}
                autoComplete="address-level2" enterKeyHint="next" />
              <div className="relative">
                <select
                  value={form.province}
                  onChange={(e) => update("province", e.target.value)}
                  className={`${low.has("province") ? INPUT_WARN : INPUT} appearance-none pr-8 ${!form.province ? "text-muted-foreground" : ""}`}
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
                placeholder="ZIP code" className={low.has("zip") ? INPUT_WARN : INPUT}
                inputMode="numeric" autoComplete="postal-code" enterKeyHint="next" />
              <input type="text" value={form.country} onChange={(e) => update("country", e.target.value)}
                placeholder="Country" className={low.has("country") ? INPUT_WARN : INPUT}
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

              {mapLoaded && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 backdrop-blur-md bg-background/90 shadow-sm pointer-events-none animate-[fade-slide-down_0.4s_cubic-bezier(0.22,1,0.36,1)_both]">
                <span className="text-[12px] font-semibold text-foreground whitespace-nowrap">
                  Drag the pin to adjust the exact location.
                </span>
              </div>
              )}

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

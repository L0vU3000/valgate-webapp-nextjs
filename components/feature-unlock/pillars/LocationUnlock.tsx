"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import dynamic from "next/dynamic";
// The unlock modal (react-hook-form + zod, ~537 lines) loads lazily — its code stays out of
// this property segment's bundle until the user actually opens the unlock wizard.
const FeatureUnlockWizard = dynamic(
  () => import("../FeatureUnlockWizard").then((m) => m.FeatureUnlockWizard),
  { ssr: false },
);
import type { WizardConfig } from "../types";
import type { UseFormReturn } from "react-hook-form";
import {
  updateProperty,
  verifyLocation,
  getLocationWizardInitialAction,
} from "@/app/actions/properties";
import {
  propertyTypeChoiceSchema,
  propertyTitleSchema,
} from "@/lib/data/types/property";
// The location picker embeds mapbox-gl (~500 kB). Loading it lazily and client-only
// keeps mapbox out of every route that merely mounts this unlock wizard (the property
// location page, the add-property flow, the pro properties register). The modal only
// renders once the user opens the picker, so nothing is downloaded until then.
const LocationPickerModal = dynamic(
  () => import("@/app/(shell)/add-property/_components/LocationPickerModal").then((m) => m.LocationPickerModal),
  { ssr: false },
);
import { Map as MapIcon, MapPin, Navigation } from "lucide-react";
import { env } from "@/lib/env";
import { cn } from "@/components/ui/utils";

// ── Schema ────────────────────────────────────────────────────────────────────

const LocationWizardSchema = z.object({
  // Step 1 — Address
  addressLine: z.string().min(1, "Street address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "Province is required"),
  zip: z.string().optional(),
  country: z.string().optional(),

  // Step 2 — Identity
  name: z.string().min(1, "Property name is required"),
  type: propertyTypeChoiceSchema,
  title: propertyTitleSchema,

  // Step 3 — Map pin
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

type LocationWizardValues = z.infer<typeof LocationWizardSchema>;

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-val-heading placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--val-primary-dark)]/30 focus:border-[var(--val-primary-dark)] transition-colors";
const labelCls =
  "block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5";

// ── Step 1 — Address ──────────────────────────────────────────────────────────

function AddressStep({ form }: { form: UseFormReturn<LocationWizardValues> }) {
  const errors = form.formState.errors;
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-slate-500">Where the property is located.</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Street Address</label>
          <input
            type="text"
            className={inputCls}
            placeholder="123 Riverside Road"
            {...form.register("addressLine")}
          />
          {errors.addressLine && (
            <p className="text-[11px] text-red-500 mt-1">{errors.addressLine.message}</p>
          )}
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Address Line 2 (optional)</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Apartment, suite, floor…"
            {...form.register("addressLine2")}
          />
        </div>
        <div>
          <label className={labelCls}>City</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Phnom Penh"
            {...form.register("city")}
          />
          {errors.city && (
            <p className="text-[11px] text-red-500 mt-1">{errors.city.message}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Province / State</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Phnom Penh"
            {...form.register("province")}
          />
          {errors.province && (
            <p className="text-[11px] text-red-500 mt-1">{errors.province.message}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Postcode (optional)</label>
          <input
            type="text"
            className={inputCls}
            placeholder="12000"
            {...form.register("zip")}
          />
        </div>
        <div>
          <label className={labelCls}>Country (optional)</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Cambodia"
            {...form.register("country")}
          />
        </div>
      </div>
    </div>
  );
}

// ── Step 2 — Identity ─────────────────────────────────────────────────────────

const PROPERTY_TYPES: { value: string; label: string }[] = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "multi-unit", label: "Multi-unit" },
  { value: "retail", label: "Retail" },
  { value: "land", label: "Land" },
  { value: "industrial", label: "Industrial" },
  { value: "construction", label: "Construction" },
  { value: "other", label: "Other" },
];

const TITLE_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: "Hard title", label: "Hard title", hint: "Strata or freehold registered title" },
  { value: "Soft title", label: "Soft title", hint: "Cambodian land certificate (LMAP)" },
  { value: "—", label: "Unknown / not sure", hint: "Skip for now" },
];

function IdentityStep({
  form,
  values,
}: {
  form: UseFormReturn<LocationWizardValues>;
  values: LocationWizardValues;
}) {
  const errors = form.formState.errors;
  return (
    <div className="space-y-5">
      <p className="text-[13px] text-slate-500">How the property is classified and titled.</p>

      <div>
        <label className={labelCls}>Property Name / Label</label>
        <input
          type="text"
          className={inputCls}
          placeholder="Land near river"
          {...form.register("name")}
        />
        {errors.name && (
          <p className="text-[11px] text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className={labelCls}>Property Type</label>
        <div className="grid grid-cols-4 gap-2">
          {PROPERTY_TYPES.map((pt) => (
            <button
              key={pt.value}
              type="button"
              onClick={() => form.setValue("type", pt.value as LocationWizardValues["type"])}
              className={`px-3 py-2 rounded-lg border text-[12px] font-medium transition-colors ${
                values.type === pt.value
                  ? "border-[var(--val-primary-dark)] bg-blue-50 text-[var(--val-primary-dark)]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Title Type</label>
        <div className="flex flex-col gap-2">
          {TITLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => form.setValue("title", opt.value as LocationWizardValues["title"])}
              className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                values.title === opt.value
                  ? "border-[var(--val-primary-dark)] bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${
                  values.title === opt.value
                    ? "border-[var(--val-primary-dark)] bg-[var(--val-primary-dark)]"
                    : "border-slate-300"
                }`}
              />
              <div>
                <p className={`text-[13px] font-medium ${values.title === opt.value ? "text-[var(--val-primary-dark)]" : "text-val-heading"}`}>
                  {opt.label}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{opt.hint}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 3 — Map pin ──────────────────────────────────────────────────────────

function MapPinStep({
  form,
  values,
}: {
  form: UseFormReturn<LocationWizardValues>;
  values: LocationWizardValues;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const lat = values.lat ?? 0;
  const lng = values.lng ?? 0;

  useEffect(() => {
    setMapLoaded(false);
  }, [lat, lng]);

  const staticMapUrl =
    `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/` +
    `pin-l+2563eb(${lng},${lat})/${lng},${lat},13/600x220@2x` +
    `?access_token=${env.NEXT_PUBLIC_MAPBOX_TOKEN}`;

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-slate-500">Confirm the exact map pin for this property.</p>

      {/* Static map preview */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100" style={{ height: 220 }}>
        <img
          src={staticMapUrl}
          alt="Property location preview"
          className="w-full h-full object-cover"
          key={`${lat},${lng}`}
          onLoad={() => setMapLoaded(true)}
          onError={() => setMapLoaded(true)}
        />

        <div
          className={cn(
            "absolute inset-0 z-10 flex flex-col items-center justify-center bg-white gap-3 transition-opacity duration-500",
            mapLoaded ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
          onTransitionEnd={(e) => {
            if (e.propertyName === "opacity" && mapLoaded) {
              (e.currentTarget as HTMLElement).style.display = "none";
            }
          }}
        >
          <div className="flex items-center gap-2">
            <MapIcon className="size-5 text-[var(--val-primary-dark)] animate-pulse" />
            <span className="text-[13px] font-medium text-slate-500">Loading map…</span>
          </div>
          <div className="w-32 h-1 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-[var(--val-primary-dark)] rounded-full animate-[loading-bar_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>

      {/* Coordinate display */}
      <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
        <MapPin className="w-4 h-4 text-[var(--val-primary-dark)] flex-shrink-0" />
        <div className="flex gap-6 text-[13px]">
          <div>
            <span className="text-slate-400 text-[11px] uppercase tracking-widest font-semibold mr-1.5">Lat</span>
            <span className="font-mono text-val-heading">{lat.toFixed(6)}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] uppercase tracking-widest font-semibold mr-1.5">Lng</span>
            <span className="font-mono text-val-heading">{lng.toFixed(6)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="ml-auto flex items-center gap-1.5 text-[13px] font-semibold text-[var(--val-primary-dark)] hover:opacity-80 transition-opacity"
        >
          <Navigation className="w-3.5 h-3.5" />
          Adjust pin on map
        </button>
      </div>

      <p className="text-[11px] text-slate-400">
        If you updated the address in step 1, use &quot;Adjust pin on map&quot; to move the pin to the correct location.
      </p>

      {/* Sub-modal: LocationPickerModal */}
      {pickerOpen && (
        <LocationPickerModal
          center={[lng, lat]}
          onClose={() => setPickerOpen(false)}
          onConfirm={([newLng, newLat]) => {
            form.setValue("lat", newLat, { shouldValidate: true });
            form.setValue("lng", newLng, { shouldValidate: true });
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ── Wizard config ─────────────────────────────────────────────────────────────

export const locationWizardConfig: WizardConfig<typeof LocationWizardSchema> = {
  pillarKey: "location",
  title: "Location Setup",
  schema: LocationWizardSchema,

  loadInitial: async ({ propertyId }) => {
    const result = await getLocationWizardInitialAction(propertyId);
    if (!result.ok) return { values: {}, entityId: null, verified: false };

    const { property } = result.data;
    if (!property) return { values: {}, entityId: null, verified: false };

    return {
      entityId: property.id,
      verified: property.locationVerified === true,
      values: {
        addressLine: property.addressLine ?? "",
        addressLine2: property.addressLine2 ?? "",
        city: property.city ?? "",
        province: property.province ?? "",
        zip: property.zip ?? "",
        country: property.country ?? "",
        name: property.name ?? "",
        type: property.type,
        title: property.title ?? "—",
        lat: property.lat ?? 0,
        lng: property.lng ?? 0,
      },
    };
  },

  onSubmitData: async ({ values, propertyId }) => {
    const patch = {
      addressLine: values.addressLine,
      addressLine2: values.addressLine2 || undefined,
      city: values.city,
      province: values.province,
      zip: values.zip || undefined,
      country: values.country || undefined,
      name: values.name,
      type: values.type,
      title: values.title,
      lat: values.lat,
      lng: values.lng,
    };

    const result = await updateProperty(propertyId, patch);
    if (!result.ok) return result;

    return { ok: true, data: { entityId: propertyId } };
  },

  verification: {
    title: "Verify location",
    declaration:
      "I confirm this address is correct and the uploaded document is authentic.",
    documentLabel: "Proof of address",
    minFiles: 1,
    maxFiles: 5,
    onVerify: async ({ entityId, docIds }) => {
      const result = await verifyLocation(entityId, docIds);
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, data: undefined };
    },
  },

  steps: [
    {
      key: "address",
      title: "Address",
      description: "Where the property is located.",
      fields: ["addressLine", "addressLine2", "city", "province", "zip", "country"],
      render: ({ form }) => (
        <AddressStep form={form as UseFormReturn<LocationWizardValues>} />
      ),
    },
    {
      key: "identity",
      title: "Identity",
      description: "How the property is classified and titled.",
      fields: ["name", "type", "title"],
      render: ({ form, values }) => (
        <IdentityStep
          form={form as UseFormReturn<LocationWizardValues>}
          values={values as LocationWizardValues}
        />
      ),
    },
    {
      key: "map-pin",
      title: "Map pin",
      description: "Confirm the exact map pin.",
      fields: ["lat", "lng"],
      render: ({ form, values }) => (
        <MapPinStep
          form={form as UseFormReturn<LocationWizardValues>}
          values={values as LocationWizardValues}
        />
      ),
    },
  ],
};

// ── Mount component ───────────────────────────────────────────────────────────

interface LocationUnlockMountProps {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startAt?: "data" | "verification";
  onSuccess?: () => void;
}

export function LocationUnlockMount({
  propertyId,
  open,
  onOpenChange,
  startAt,
  onSuccess,
}: LocationUnlockMountProps) {
  return (
    <FeatureUnlockWizard
      config={locationWizardConfig}
      propertyId={propertyId}
      open={open}
      onOpenChange={onOpenChange}
      startAt={startAt}
      onSuccess={onSuccess}
    />
  );
}

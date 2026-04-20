"use client";

import { useRouter } from "next/navigation";
import { MapPin, Lock, ArrowRight } from "lucide-react";
import type { FormData } from "./types";
import { env } from "@/lib/env";

const DEFAULT_CENTER: [number, number] = [104.9282, 11.5564];

function SuccessMapBackground({ center }: { center?: [number, number] }) {
  const [lng, lat] = center ?? DEFAULT_CENTER;
  const src = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${lng},${lat},14,0/1280x420@2x?access_token=${env.NEXT_PUBLIC_MAPBOX_TOKEN}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
  );
}

function formatCurrency(value: string) {
  const num = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  if (!num || isNaN(num)) return value || "—";
  return `$${num.toLocaleString()}`;
}

const FEATURE_PILLS = [
  "Equity Tracking",
  "Cash-Flow Reports",
  "Lease Management",
  "Document Vault",
  "Security Monitoring",
];

const OWNERSHIP_BADGE: Record<string, { label: string; color: string }> = {
  "fully-owned": { label: "Owned", color: "#10b981" },
  mortgaged: { label: "Mortgaged", color: "#f59e0b" },
  leased: { label: "Leased", color: "#10b981" },
  "under-construction": { label: "Under Construction", color: "#8b5cf6" },
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  "multi-unit": "Multi-Unit",
  retail: "Retail",
  land: "Land",
  industrial: "Industrial",
  construction: "Construction",
  other: "Other",
};

export function Step6Success({ form }: { form: FormData }) {
  const router = useRouter();

  const propertyName = form.propertyName || "Your Property";
  const propertyId = form.propertyId || "PR00001";
  const price = formatCurrency(form.currentMarketValue || form.purchasePrice);
  const location = [form.city, form.state].filter(Boolean).join(", ");
  const ownership = OWNERSHIP_BADGE[form.ownershipStatus] ?? { label: "Listed", color: "#10b981" };
  const typeLabel = PROPERTY_TYPE_LABELS[form.propertyType] ?? "Property";
  const tooltipText = [propertyName, price !== "—" ? price : null].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col items-center pb-28 w-full bg-[#f9f9f9]">
      {/* Map Hero */}
      <div className="relative w-full h-[420px] mb-[-64px] overflow-hidden shrink-0 bg-[#e4e2dc]">
        <SuccessMapBackground center={form.mapCenter} />
        {/* Pin overlay, centered slightly above middle */}
        <div className="absolute flex flex-col items-center" style={{ top: "38%", left: "50%", transform: "translate(-50%, -50%)" }}>
          {/* Tooltip */}
          <div className="relative mb-2 shrink-0">
            <div className="bg-[#1a1c1c] text-white text-[14px] font-medium leading-5 px-4 py-2 rounded-[14px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] whitespace-nowrap">
              {tooltipText}
            </div>
            {/* Caret */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-[8.48px] flex items-center justify-center size-[16.97px]">
              <div className="rotate-45 size-3 bg-[#1a1c1c]" />
            </div>
          </div>
          {/* Pin */}
          <div className="mt-[8.48px] relative z-10 bg-[#2563eb] size-12 rounded-full flex items-center justify-center shadow-[0px_4px_12px_0px_rgba(37,99,235,0.4)]">
            <MapPin className="w-[18px] h-[18px] text-white fill-white" />
          </div>
          {/* Pulse dot */}
          <div className="absolute bottom-0 translate-x-5 size-6 bg-[#2563eb] opacity-30 rounded-full" />
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f9f9f9] to-transparent" />
      </div>

      {/* Content Section */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-[768px] px-6 mx-auto">
        {/* Success icon */}
        <div className="mb-4 bg-white p-3 rounded-full shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)]">
          <div className="bg-[#d1fae5] size-12 rounded-full flex items-center justify-center">
            <svg width="25" height="25" viewBox="0 0 25 25" fill="none">
              <path d="M5 12.5L10 17.5L20 7.5" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-[28px] font-bold text-[#1a1c1c] tracking-[-0.7px] leading-[42px] text-center mb-2">
          Your property is on Valgate.
        </h1>

        {/* Subtext */}
        <p className="text-[16px] text-[#5b5f62] leading-6 text-center mb-10">
          {"Here's how it looks in your portfolio."}
        </p>

        {/* Property Card Preview */}
        <div className="w-full max-w-[576px] mb-12">
          <div className="bg-white rounded-[20px] overflow-hidden shadow-[0px_0px_0px_1px_rgba(0,0,0,0.02),0px_2px_6px_0px_rgba(0,0,0,0.04),0px_4px_8px_0px_rgba(0,0,0,0.1)] pb-7">
            {/* Image area */}
            <div className="relative h-48">
              <div className="absolute inset-0 bg-gradient-to-br from-[#c3c8d2] to-[#dde0e6]" />
              {/* Status + type badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                <div className="backdrop-blur-[2px] bg-[rgba(255,255,255,0.9)] flex items-center gap-1.5 px-3 py-[5.5px] rounded-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                  <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: ownership.color }} />
                  <span className="text-[12px] font-semibold text-[#1a1c1c] leading-4">{ownership.label}</span>
                </div>
                <div className="backdrop-blur-[2px] bg-[rgba(255,255,255,0.9)] flex items-center px-3 py-[6px] rounded-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                  <span className="text-[12px] font-semibold text-[#1a1c1c] leading-4">{typeLabel}</span>
                </div>
              </div>
            </div>

            {/* Card body */}
            <div className="flex items-start justify-between px-5 pt-5">
              <div className="flex flex-col gap-1">
                <p className="text-[22px] font-semibold text-[#1a1c1c] leading-[26px]">{propertyName}</p>
                {location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-[10.667px] h-[13.333px] text-[#5b5f62] shrink-0" />
                    <span className="text-[14px] text-[#5b5f62] leading-5">{location}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                <p className="text-[21px] font-bold text-[#1a1c1c] leading-[31.5px]">{price}</p>
                <p className="text-[12px] font-medium text-[#737686] uppercase tracking-[0.6px] leading-4">
                  ID: {propertyId}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Unlock Strip */}
        <div className="w-full max-w-[672px] mb-12">
          <div className="bg-white border border-[rgba(195,198,215,0.4)] p-[25px] flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Lock className="w-[16.667px] h-[16.667px] text-[#1a1c1c] shrink-0" />
              <p className="text-[14px] font-semibold text-[#1a1c1c]">Add more details to unlock features</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {FEATURE_PILLS.map((label) => (
                <div
                  key={label}
                  className="bg-[#f3f3f4] border border-[rgba(195,198,215,0.3)] flex items-center gap-[6px] px-[13px] py-[7px] rounded-[14px]"
                >
                  <Lock className="w-[9.333px] h-[12.25px] text-[#434655] shrink-0" />
                  <span className="text-[12px] font-medium text-[#434655]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="w-full max-w-[448px] flex flex-col items-center gap-4">
          <button
            onClick={() => router.push("/portfolio")}
            className="w-full bg-[#1a1c1c] text-white text-[16px] font-medium leading-6 py-4 px-6 rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#2d2f2f] transition-colors text-center"
          >
            Go to My Portfolio
          </button>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 py-2 text-[#004ac6] text-[14px] font-medium leading-5 hover:text-[#003a9e] transition-colors"
          >
            Add more details
            <ArrowRight className="w-[10.667px] h-[10.667px] shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}

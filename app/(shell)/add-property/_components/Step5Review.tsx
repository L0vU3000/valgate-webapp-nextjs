"use client";

import { useState } from "react";
import {
  Home,
  Building2,
  Store,
  LandPlot,
  Factory,
  HardHat,
  MoreHorizontal,
  FileText,
  Camera,
  Map as MapIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/components/ui/utils";
import type { FormData, Step } from "./types";
import { env } from "@/lib/env";

const PROPERTY_TYPES: Record<string, { label: string; sub: string; Icon: React.ElementType; gradient: string }> = {
  residential: { label: "Residential House", sub: "Single family detached", Icon: Home, gradient: "linear-gradient(135deg, #ff6b6b 0%, #ff8c42 50%, #ffd23f 100%)" },
  commercial: { label: "Commercial Building", sub: "Office or mixed use", Icon: Building2, gradient: "linear-gradient(135deg, #1e3799 0%, #0652dd 50%, #1289a7 100%)" },
  "multi-unit": { label: "Multi-Unit Complex", sub: "Apartments, condos", Icon: Building2, gradient: "linear-gradient(135deg, #6c2bd9 0%, #a855f7 50%, #ec4899 100%)" },
  retail: { label: "Retail Space", sub: "Shop or storefront", Icon: Store, gradient: "linear-gradient(135deg, #f72585 0%, #ff6b35 50%, #ffd60a 100%)" },
  land: { label: "Land", sub: "Vacant plot or lot", Icon: LandPlot, gradient: "linear-gradient(135deg, #1a7a4a 0%, #22c55e 50%, #a3e635 100%)" },
  industrial: { label: "Industrial", sub: "Warehouse or factory", Icon: Factory, gradient: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 50%, #67e8f9 100%)" },
  construction: { label: "Under Construction", sub: "Development project", Icon: HardHat, gradient: "linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #fde047 100%)" },
  other: { label: "Other", sub: "Custom type", Icon: MoreHorizontal, gradient: "linear-gradient(135deg, #7c3aed 0%, #2563eb 50%, #06b6d4 100%)" },
};

const OWNERSHIP_COLORS: Record<string, string> = {
  "fully-owned": "#22c55e",
  mortgaged: "#f59e0b",
  leased: "#3b82f6",
  "under-construction": "#8b5cf6",
};

function getDocMeta(filename: string): { bg: string; text: string; label: string } {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return { bg: "bg-[#ffdad6]", text: "text-[#ba1a1a]", label: "PDF" };
  if (ext === "docx" || ext === "doc") return { bg: "bg-[#dbe1ff]", text: "text-[#2563eb]", label: "Word" };
  if (ext === "xlsx" || ext === "xls") return { bg: "bg-[#d7f5e3]", text: "text-[#1b6b3a]", label: "Excel" };
  return { bg: "bg-muted", text: "text-muted-foreground", label: (ext ?? "File").toUpperCase() };
}

function formatCurrency(value: string) {
  const num = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  if (!num || isNaN(num)) return value || "—";
  return `$${num.toLocaleString()}`;
}

const DEFAULT_CENTER: [number, number] = [104.9282, 11.5564];
const EASE_OUT: [number, number, number, number] = [0.25, 1, 0.5, 1];

function ReviewMap({ center }: { center?: [number, number] }) {
  const [loaded, setLoaded] = useState(false);
  const [lng, lat] = center ?? DEFAULT_CENTER;
  const url = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-l+2563eb(${lng},${lat})/${lng},${lat},14,0/600x240@2x?access_token=${env.NEXT_PUBLIC_MAPBOX_TOKEN}`;
  return (
    <motion.div
      className="relative h-[120px] rounded-xl overflow-hidden border border-border bg-muted"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.1 }}
    >
      <img
        src={url}
        alt="Property location"
        className="w-full h-full object-cover"
        onLoad={() => setLoaded(true)}
      />
      {/* Loading overlay — matches Step2 pattern */}
      <div
        className={cn(
          "absolute inset-0 z-10 flex flex-col items-center justify-center bg-background gap-3 transition-opacity duration-500",
          loaded ? "opacity-0 pointer-events-none" : "opacity-100",
        )}
        onTransitionEnd={(e) => {
          if (e.propertyName === "opacity" && loaded) {
            (e.currentTarget as HTMLElement).style.display = "none";
          }
        }}
      >
        <div className="flex items-center gap-2">
          <MapIcon className="size-4 text-primary animate-pulse" />
          <span className="text-[12px] font-medium text-muted-foreground">Loading map…</span>
        </div>
        <div className="w-24 h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-[loading-bar_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
    </motion.div>
  );
}

function ReviewSection({
  title,
  titleBadge,
  onEdit,
  children,
  delay = 0,
}: {
  title: string;
  titleBadge?: React.ReactNode;
  onEdit: () => void;
  children: React.ReactNode;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.38, ease: EASE_OUT, delay: reduced ? 0 : delay }}
      whileHover={reduced ? undefined : { boxShadow: "0 0 0 1.5px rgba(0, 0, 0, 0.18)" }}
      className="border border-border rounded-2xl p-6 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-1.5">
          <h3 className="text-[22px] font-semibold text-[#1a1c1c]">{title}</h3>
          {titleBadge}
        </div>
        <motion.button
          type="button"
          onClick={onEdit}
          whileTap={reduced ? undefined : { scale: 0.91 }}
          className="text-base font-semibold text-[#2563eb] underline decoration-transparent hover:decoration-[#2563eb] transition-[text-decoration-color] duration-200 ml-2 shrink-0"
        >
          Edit
        </motion.button>
      </div>
      {children}
    </motion.div>
  );
}

export function Step5Review({
  form,
  goToStep,
}: {
  form: FormData;
  goToStep: (step: Step) => void;
}) {
  const reduced = useReducedMotion();
  const typeConfig = PROPERTY_TYPES[form.propertyType] ?? PROPERTY_TYPES.other;
  const { Icon: TypeIcon } = typeConfig;

  const ownershipDotColor = OWNERSHIP_COLORS[form.ownershipStatus] ?? "#9ca3af";
  const ownershipLabel = form.ownershipStatus
    ? form.ownershipStatus.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "—";

  const addressLines = [form.addressLine, form.addressLine2].filter(Boolean);
  const cityLine = [form.city, form.state, form.zip].filter(Boolean).join(", ");

  const extraPhotos = Math.max(0, form.photos.length - 4);

  return (
    <div className="flex flex-col gap-10 items-start pb-8 w-full max-w-[600px] mx-auto">
      {/* Heading */}
      <motion.div
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.38, ease: EASE_OUT }}
        className="flex flex-col gap-[11px] items-center w-full"
      >
        <h2 className="text-[28px] font-bold text-[#1a1c1c] text-center leading-10">
          Review your property details
        </h2>
        <p className="text-[16px] text-[#5b5f62] text-center leading-[1.43]">
          Please verify all information before finalizing the creation of this property record.
        </p>
      </motion.div>

      {/* Cards */}
      <div className="flex flex-col gap-6 w-full">

        {/* 1. Property Type */}
        <ReviewSection title="Property Type" onEdit={() => goToStep(1)} delay={0.07}>
          <div className="flex items-center gap-3">
            <div
              className="rounded-full size-12 flex items-center justify-center shrink-0"
              style={{ background: typeConfig.gradient }}
            >
              <TypeIcon className="w-5 h-5" style={{ color: "rgba(255,255,255,0.9)" }} />
            </div>
            <div>
              <p className="text-[16px] font-medium text-[#1a1c1c] leading-6">{typeConfig.label}</p>
              <p className="text-[14px] text-[#5b5f62] leading-5">{typeConfig.sub}</p>
            </div>
          </div>
        </ReviewSection>

        {/* 2. Name & Location */}
        <ReviewSection title="Name & Location" onEdit={() => goToStep(2)} delay={0.14}>
          <div className="flex flex-col gap-0.5">
            <p className="text-[16px] font-medium text-[#1a1c1c] leading-6">
              {form.propertyName || "—"}
            </p>
            <div className="text-[14px] text-[#5b5f62] leading-5">
              {addressLines.map((l, i) => (
                <p key={i}>{l}</p>
              ))}
              {cityLine && <p>{cityLine}</p>}
            </div>
          </div>
          {/* Map */}
          <ReviewMap center={form.mapCenter} />
        </ReviewSection>

        {/* 3. Status & Ownership */}
        <ReviewSection title="Status & Ownership" onEdit={() => goToStep(3)} delay={0.21}>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="text-[14px] text-[#5b5f62] leading-5">Ownership Status</p>
              {form.ownershipStatus ? (
                <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1 w-fit">
                  <div
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: ownershipDotColor }}
                  />
                  <p className="text-[14px] font-medium text-[#1a1c1c] leading-5 whitespace-nowrap">
                    {ownershipLabel}
                  </p>
                </div>
              ) : (
                <p className="text-[14px] font-medium text-[#1a1c1c] leading-5">—</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[14px] text-[#5b5f62] leading-5">Purchase Date</p>
              <p className="text-[14px] font-medium text-[#1a1c1c] leading-5">
                {form.purchaseDate || "—"}
              </p>
            </div>
          </div>
        </ReviewSection>

        {/* 4. Financial Details */}
        <ReviewSection title="Financial Details" onEdit={() => goToStep(3)} delay={0.28}>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-1">
              <p className="text-[14px] text-[#5b5f62] leading-5">Purchase Price</p>
              <p className="text-[20px] font-bold text-[#1a1c1c] leading-7">
                {formatCurrency(form.purchasePrice)}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[14px] text-[#5b5f62] leading-5">Market Value</p>
              <p className="text-[20px] font-bold text-[#1a1c1c] leading-7">
                {formatCurrency(form.currentMarketValue)}
              </p>
            </div>
            {form.interestRate && (
              <div className="flex flex-col gap-1">
                <p className="text-[14px] text-[#5b5f62] leading-5">Interest Rate</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-[20px] font-bold text-[#1a1c1c] leading-7">{form.interestRate}%</p>
                  <p className="text-[14px] text-[#5b5f62] leading-5">/ yr</p>
                </div>
              </div>
            )}
            {form.monthlyPayment && (
              <div className="flex flex-col gap-1">
                <p className="text-[14px] text-[#5b5f62] leading-5">Monthly Payment</p>
                <p className="text-[20px] font-bold text-[#1a1c1c] leading-7">
                  {formatCurrency(form.monthlyPayment)}
                </p>
              </div>
            )}
          </div>
        </ReviewSection>

        {/* 5. Photos */}
        {form.photos.length > 0 && (
          <ReviewSection
            title="Photos"
            titleBadge={
              <span className="text-[16px] font-normal text-[#5b5f62]">({form.photos.length})</span>
            }
            onEdit={() => goToStep(4)}
            delay={0.35}
          >
            <div className="grid grid-cols-4 gap-4">
              {form.photos.slice(0, 4).map((photo, i) => {
                const isOverlay = i === 3 && extraPhotos > 0;
                return (
                  <motion.div
                    key={i}
                    whileHover={reduced ? undefined : { scale: 1.04 }}
                    transition={{ duration: 0.18, ease: EASE_OUT }}
                    className="relative overflow-hidden rounded-xl shadow-[0px_0px_0px_1px_rgba(0,0,0,0.02),0px_2px_6px_0px_rgba(0,0,0,0.04),0px_4px_8px_0px_rgba(0,0,0,0.1)]"
                  >
                    <div className="h-[100px] bg-muted flex items-center justify-center px-2">
                      <Camera className="w-5 h-5 text-muted-foreground/50 shrink-0" />
                    </div>
                    {i === 0 && (
                      <div className="absolute top-2 left-2 bg-white rounded-[14px] px-2.5 py-0.5 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                        <span className="text-[11px] font-semibold text-[#1a1c1c]">Cover</span>
                      </div>
                    )}
                    {isOverlay && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <p className="text-white text-[14px] font-medium">+{extraPhotos} more</p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </ReviewSection>
        )}

        {/* 6. Documents */}
        {form.documents.length > 0 && (
          <ReviewSection title="Documents" onEdit={() => goToStep(4)} delay={0.42}>
            <div className="flex flex-col gap-3">
              {form.documents.map((doc, i) => {
                const meta = getDocMeta(doc);
                return (
                  <motion.div
                    key={i}
                    whileHover={reduced ? undefined : { backgroundColor: "rgba(0,0,0,0.018)", x: 2 }}
                    transition={{ duration: 0.18, ease: EASE_OUT }}
                    className="border border-[#c3c6d7] rounded-xl flex items-center justify-between px-4 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`${meta.bg} w-10 h-10 rounded-full flex items-center justify-center shrink-0`}
                      >
                        <FileText className={`w-5 h-5 ${meta.text}`} />
                      </div>
                      <div>
                        <p className="text-[16px] font-medium text-[#1a1c1c] leading-5">{doc}</p>
                        <p className="text-[14px] text-[#5b5f62] leading-[21px]">{meta.label}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ReviewSection>
        )}

      </div>
    </div>
  );
}

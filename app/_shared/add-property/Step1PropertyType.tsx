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
} from "lucide-react";
import type { FormData } from "./types";

const TYPE_ACCENT: Record<string, { gradient: string; border: string; selectedBg: string }> = {
  residential: {
    gradient: "linear-gradient(135deg, #ff6b6b 0%, #ff8c42 50%, #ffd23f 100%)",
    border: "#ff8c42",
    selectedBg: "rgba(255, 140, 66, 0.07)",
  },
  commercial: {
    gradient: "linear-gradient(135deg, #1e3799 0%, #0652dd 50%, #1289a7 100%)",
    border: "#0652dd",
    selectedBg: "rgba(6, 82, 221, 0.06)",
  },
  "multi-unit": {
    gradient: "linear-gradient(135deg, #6c2bd9 0%, #a855f7 50%, #ec4899 100%)",
    border: "#a855f7",
    selectedBg: "rgba(168, 85, 247, 0.06)",
  },
  retail: {
    gradient: "linear-gradient(135deg, #f72585 0%, #ff6b35 50%, #ffd60a 100%)",
    border: "#ff6b35",
    selectedBg: "rgba(255, 107, 53, 0.07)",
  },
  land: {
    gradient: "linear-gradient(135deg, #1a7a4a 0%, #22c55e 50%, #a3e635 100%)",
    border: "#22c55e",
    selectedBg: "rgba(34, 197, 94, 0.06)",
  },
  industrial: {
    gradient: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 50%, #67e8f9 100%)",
    border: "#0ea5e9",
    selectedBg: "rgba(14, 165, 233, 0.06)",
  },
  construction: {
    gradient: "linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #fde047 100%)",
    border: "#f59e0b",
    selectedBg: "rgba(245, 158, 11, 0.07)",
  },
  other: {
    gradient: "linear-gradient(135deg, #7c3aed 0%, #2563eb 50%, #06b6d4 100%)",
    border: "#2563eb",
    selectedBg: "rgba(37, 99, 235, 0.06)",
  },
};

const propertyTypes = [
  { key: "residential", icon: Home, label: "Residential House", sub: "Single family detached" },
  { key: "commercial", icon: Building2, label: "Commercial Building", sub: "Office or mixed use" },
  { key: "multi-unit", icon: Building2, label: "Multi-Unit Complex", sub: "Apartments, condos" },
  { key: "retail", icon: Store, label: "Retail Space", sub: "Shop or storefront" },
  { key: "land", icon: LandPlot, label: "Land", sub: "Vacant plot or lot" },
  { key: "industrial", icon: Factory, label: "Industrial", sub: "Warehouse or factory" },
  { key: "construction", icon: HardHat, label: "Under Construction", sub: "Development project" },
  { key: "other", icon: MoreHorizontal, label: "Other", sub: "Custom type" },
];

export function Step1PropertyType({ form, setForm, goNext }: { form: FormData; setForm: (f: FormData) => void; goNext: () => void }) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-10 items-start pb-8 w-full max-w-[860px] mx-auto">
      <div className="anim-enter flex flex-col gap-[11px] items-center w-full">
        <h2 className="text-[28px] font-bold text-[#1a1c1c] text-center leading-10">
          What type of property are you adding?
        </h2>
        <p className="text-[16px] text-[#5b5f62] text-center leading-[1.43]">
          Select the category that best describes your property.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 w-full">
        {propertyTypes.map((t, i) => {
          const selected = form.propertyType === t.key;
          const hovered = hoveredKey === t.key;
          const active = selected || hovered;
          const accent = TYPE_ACCENT[t.key] ?? TYPE_ACCENT.other;

          return (
            <button
              key={t.key}
              onClick={() => { setForm({ ...form, propertyType: t.key }); goNext(); }}
              onMouseEnter={() => setHoveredKey(t.key)}
              onMouseLeave={() => setHoveredKey(null)}
              style={{
                animationDelay: `${60 + i * 45}ms`,
                borderColor: active ? accent.border : undefined,
                backgroundColor: active ? accent.selectedBg : undefined,
              }}
              className={[
                "group anim-enter flex flex-col items-center text-center rounded-xl p-5 border",
                "transition-all duration-200 will-change-transform",
                "hover:scale-[1.03] hover:shadow-md active:scale-[0.97]",
                selected ? "scale-[1.02] shadow-sm border-transparent" : "border-border",
              ].join(" ")}
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-all duration-200 group-hover:scale-110"
                style={active ? { background: accent.gradient } : { backgroundColor: "#EFF6FF" }}
              >
                <t.icon
                  className="w-6 h-6 transition-colors duration-200"
                  style={{ color: active ? "rgba(255,255,255,0.92)" : "rgba(37,99,235,0.7)" }}
                />
              </div>
              <p className="text-[14px] text-foreground mb-0.5 font-semibold">{t.label}</p>
              <p className="text-[12px] text-muted-foreground">{t.sub}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

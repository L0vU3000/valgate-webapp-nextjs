"use client";

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

export function Step1PropertyType({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  return (
    <div className="flex flex-col gap-10 items-start pb-8 w-full max-w-[860px] mx-auto">
      {/* Heading */}
      <div className="flex flex-col gap-[11px] items-center w-full">
        <h2 className="text-[28px] font-bold text-[#1a1c1c] text-center leading-10">
          What type of property are you adding?
        </h2>
        <p className="text-[16px] text-[#5b5f62] text-center leading-[1.43]">
          Select the category that best describes your property.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 gap-4 w-full">
        {propertyTypes.map((t) => (
          <button
            key={t.key}
            onClick={() => setForm({ ...form, propertyType: t.key })}
            className={`flex flex-col items-center text-center border rounded-xl p-5 hover:border-primary transition-colors ${
              form.propertyType === t.key ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <div className="w-12 h-12 rounded-lg bg-[#EFF6FF] flex items-center justify-center mb-3">
              <t.icon className="w-6 h-6 text-primary" />
            </div>
            <p className="text-[14px] text-foreground mb-0.5 font-semibold">{t.label}</p>
            <p className="text-[12px] text-muted-foreground">{t.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

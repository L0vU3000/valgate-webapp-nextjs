import { useNavigate } from "react-router";
import {
  ChevronLeft,
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
  const navigate = useNavigate();
  return (
    <div className="max-w-[800px] mx-auto">
      <button
        onClick={() => navigate("/portfolio")}
        className="flex items-center gap-1 text-[14px] text-muted-foreground hover:text-foreground mb-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Portfolio
      </button>
      <h2 className="text-[30px] text-foreground mb-1" style={{ fontWeight: 700 }}>
        What type of property are you adding?
      </h2>
      <p className="text-[14px] text-muted-foreground mb-6">
        Select the category that best describes your property
      </p>

      <div className="grid grid-cols-4 gap-4">
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
            <p className="text-[14px] text-foreground mb-0.5" style={{ fontWeight: 600 }}>
              {t.label}
            </p>
            <p className="text-[12px] text-muted-foreground">{t.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

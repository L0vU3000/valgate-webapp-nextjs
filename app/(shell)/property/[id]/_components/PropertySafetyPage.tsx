"use client";

import { PropertyLayout } from "@/components/property/PropertyLayout";
import type { Property } from "@/lib/data/types/property";
import { Shield } from "lucide-react";

export function PropertySafetyPage({ property }: { property: Property }) {
  return (
    <PropertyLayout activeTab="safety" property={property}>
      <div className="flex min-h-full items-center justify-center bg-val-bg-page-alt px-6 py-16">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Shield className="size-7" aria-hidden />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Safety & compliance
          </p>
          <h1 className="mt-2 text-[28px] font-bold tracking-tight text-val-heading">
            Coming soon
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            Inspections, certifications, risk tracking, and emergency contacts
            for this property are on the way. Check back in a future update.
          </p>
        </div>
      </div>
    </PropertyLayout>
  );
}

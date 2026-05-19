import { notFound } from "next/navigation";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { PropertyLayout } from "@/components/property/PropertyLayout";
import { Shield } from "lucide-react";

const trackedItems = [
  "Safety certifications",
  "Inspection history",
  "Risk assessments",
  "Emergency contacts",
];

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await getPropertyByIdParam(id);
  if (!property) notFound();

  return (
    <PropertyLayout activeTab="safety" property={property}>
      <div className="min-h-full flex items-center justify-center px-8 py-16">
        <div
          className="w-full max-w-[480px] animate-in fade-in-0 slide-in-from-bottom-1 duration-500 ease-out"
        >
          {/* Top rule */}
          <div className="h-px w-full mb-8" style={{ background: "oklch(86% 0.01 250)" }} />

          {/* Overline */}
          <div className="flex items-center gap-1.5 mb-6">
            <Shield
              className="w-3 h-3 shrink-0"
              style={{ color: "oklch(56% 0.07 250)", strokeWidth: 2 }}
            />
            <span
              className="text-[11px] font-medium tracking-[0.14em] uppercase"
              style={{ color: "oklch(56% 0.07 250)" }}
            >
              Coming Soon
            </span>
          </div>

          {/* Heading */}
          <h1
            className="text-[30px] font-semibold leading-[1.18] mb-4"
            style={{ color: "oklch(16% 0.02 250)" }}
          >
            Safety records take time<br />to collect right.
          </h1>

          {/* Body */}
          <p
            className="text-[14px] leading-[1.65] mb-8"
            style={{ color: "oklch(46% 0.04 250)", maxWidth: "36ch" }}
          >
            Track inspections, certifications, risk assessments, and emergency
            contacts — all in one place.
          </p>

          {/* Inner rule */}
          <div className="h-px w-full mb-6" style={{ background: "oklch(90% 0.01 250)" }} />

          {/* 2×2 item grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {trackedItems.map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full border shrink-0"
                  style={{ borderColor: "oklch(76% 0.03 250)" }}
                />
                <span
                  className="text-[13px]"
                  style={{ color: "oklch(46% 0.04 250)" }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>

          {/* Bottom rule */}
          <div className="h-px w-full mt-8" style={{ background: "oklch(86% 0.01 250)" }} />
        </div>
      </div>
    </PropertyLayout>
  );
}

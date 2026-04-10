"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, DollarSign, Info, CheckCircle } from "lucide-react";
import type { FormData } from "./types";

export function Step5Review({ form }: { form: FormData }) {
  const router = useRouter();

  const completionItems = [
    "Property Type",
    "Basic Info",
    "Financial Info",
    "Photos",
    "Documents",
  ];

  return (
    <div className="max-w-[1000px] mx-auto">
      <button
        onClick={() => router.push("/portfolio")}
        className="flex items-center gap-1 text-[14px] text-muted-foreground hover:text-foreground mb-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Portfolio
      </button>
      <h2 className="text-[30px] text-foreground mb-1" style={{ fontWeight: 700 }}>
        Review Property Details
      </h2>
      <p className="text-[14px] text-muted-foreground mb-6">
        Please review all information before submitting
      </p>

      <div className="flex gap-6">
        {/* Left: Review cards */}
        <div className="flex-1 space-y-4">
          {/* Property Overview */}
          <div className="border border-border rounded-xl p-6">
            <p className="text-[16px] text-foreground mb-4" style={{ fontWeight: 600 }}>
              Property Overview
            </p>
            <div className="space-y-2 text-[14px]">
              {[
                ["Purchase Price", form.propertyName],
                ["Property Type", "Residential House"],
                ["Property ID", form.propertyId],
                ["Address", `${form.addressLine}, ${form.city}`],
                ["Year Built", form.yearBuilt],
                ["Bedrooms", form.bedrooms],
                ["Bathrooms", form.bathrooms],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground" style={{ fontWeight: 500 }}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Information */}
          <div className="border border-border rounded-xl p-6">
            <p className="text-[16px] text-foreground mb-4" style={{ fontWeight: 600 }}>
              Financial Information
            </p>
            <div className="space-y-2 text-[14px]">
              {[
                ["Purchase Price", form.purchasePrice],
                ["purchase Date", form.purchaseDate],
                ["Current Market Value", form.currentMarketValue],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground" style={{ fontWeight: 500 }}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border mt-3 pt-3 space-y-2 text-[14px]">
              {[
                ["Ownership Status", form.ownershipStatus],
                ["Outstanding Mortgage", form.outstandingMortgage],
                ["Monthly Payment", form.monthlyPayment],
                ["Interest Rate", form.interestRate],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground" style={{ fontWeight: 500 }}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Photos and Documents */}
          <div className="border border-border rounded-xl p-6">
            <p className="text-[16px] text-foreground mb-4" style={{ fontWeight: 600 }}>
              Photos and Documents
            </p>
            <p className="text-[14px] text-muted-foreground mb-3">
              Photos Uploaded: {form.photos.length} photos
            </p>
            <div className="flex gap-3 mb-4">
              {form.photos.slice(0, 3).map((p, i) => (
                <div
                  key={i}
                  className="w-[90px] h-[90px] border border-border rounded-xl flex flex-col items-center justify-center"
                >
                  <Camera className="w-5 h-5 text-primary mb-1" />
                  <p className="text-[12px] text-muted-foreground">{p}</p>
                </div>
              ))}
              {form.photos.length > 3 && (
                <div className="w-[90px] h-[90px] bg-[#F3F4F6] rounded-xl flex items-center justify-center">
                  <p className="text-[14px] text-muted-foreground">
                    +{form.photos.length - 3} more
                  </p>
                </div>
              )}
            </div>
            <p className="text-[14px] text-muted-foreground mb-1">
              Documents Uploaded: {form.documents.length} documents
            </p>
            {form.documents.map((d, i) => (
              <p key={i} className="text-[14px] text-foreground">
                {d}
              </p>
            ))}
          </div>
        </div>

        {/* Right: Summary */}
        <div className="w-[300px] shrink-0 space-y-4">
          <div className="border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-foreground" />
              <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>
                Property Summary
              </p>
            </div>
            <p className="text-[#059669] text-[14px] mb-1" style={{ fontWeight: 600 }}>
              Status: Ready to Submit
            </p>
            <p className="text-[12px] text-muted-foreground mb-2">Completion: 100%</p>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-4">
              <div className="h-full bg-[#059669] rounded-full w-full" />
            </div>

            <div className="space-y-1.5 text-[14px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Required Fields:</span>
              </div>
              {completionItems.map((item) => (
                <div key={item} className="flex justify-between items-center">
                  <span className="text-muted-foreground">{item}:</span>
                  <span className="text-[#059669] flex items-center gap-1 text-[12px]">
                    <CheckCircle className="w-3 h-3" /> Completed
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-border mt-4 pt-4">
              <p className="text-[12px] text-muted-foreground mb-1">Estimated Value</p>
              <p className="text-[30px] text-foreground" style={{ fontWeight: 700 }}>
                $70,000
              </p>
            </div>
          </div>

          <div className="border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-muted-foreground" />
              <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>
                Next Steps
              </p>
            </div>
            <p className="text-[14px] text-muted-foreground mb-2">After submission:</p>
            <ul className="space-y-1 text-[14px] text-muted-foreground list-disc pl-4">
              <li>1. Property added to portfolio</li>
              <li>2. Generate property reports</li>
              <li>3. Set up rent collection</li>
              <li>4. Add maintenance schedule</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
